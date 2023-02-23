import torrentStream from "torrent-stream";
import * as fs from "fs";
import { spawn } from "child_process";
import * as path from "path";

import {
  deleteFile,
  getSeasonAndEpisodeNumber,
  generateFileName,
} from "./fileUtils.mjs";
import uploadFile from "./ftpUpload.mjs";

// load torrent from file as a buffer
const torrentFile = fs.readFileSync("./torrentfile.torrent");

const ftpPath = "/files/Anime/southpark";
const tempDir = "./temp/";

const presetFilePath = "./south_park_720p_AAC.json";

// create temp dir if not exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const engine = torrentStream(torrentFile);

/**
 * class that handles the index, i.e. the file to be downloaded
 *
 * it should be able to:
 * - get the next file to be downloaded
 * - get the currently handled file
 * - save the list of already handled index to a json file
 * - load the list of already handled index from a json file
 *
 */
class IndexHandler {
  constructor(filenames) {
    this.handledIndexes = [0];
    this.processingIndexes = [];
    this.failedIndexes = [];
    this.filenames = filenames;
  }

  get nextIndex() {
    let nextIndex = 0;

    // find the next index that is not in handledIndexes nor processingIndexes
    while (
      this.handledIndexes.includes(nextIndex) ||
      this.processingIndexes.includes(nextIndex) ||
      this.failedIndexes.includes(nextIndex)
    ) {
      if (nextIndex >= this.filenames.length) {
        return null;
      }

      nextIndex++;
    }

    this.processingIndexes.push(nextIndex);

    return nextIndex;
  }

  failedProcessingIndex(index) {
    /** call this function when you've failed to process index */

    this.failedIndexes.push(index);

    this.processingIndexes.splice(this.processingIndexes.indexOf(index), 1);

    // save failed indexes to file
    this.saveFailedIndexes();
  }

  saveFailedIndexes() {
    const json = JSON.stringify(this.fileNamesFromIndexes(this.failedIndexes));
    fs.writeFileSync("./failedFiles.json", json);
  }

  doneHandlingIndex(index) {
    /** call this function when you've processed index */

    // add index to handledIndexes and save to file
    this.handledIndexes.push(index);
    this.saveHandledIndexes();

    // remove index from processingIndexes
    this.processingIndexes.splice(this.processingIndexes.indexOf(index), 1);
  }

  fileNamesFromIndexes(indexes) {
    return indexes.map((index) => this.filenames[index]);
  }

  indexesFromFilenames(filenames) {
    return filenames.map((filename) => this.filenames.indexOf(filename));
  }

  saveHandledIndexes() {
    const json = JSON.stringify(this.fileNamesFromIndexes(this.handledIndexes));
    fs.writeFileSync("./handledFiles.json", json);
  }

  loadHandledIndexes() {
    // load handled indexes from file, if it exists
    if (!fs.existsSync("./handledFiles.json")) {
      return;
    }
    const json = fs.readFileSync("./handledFiles.json");
    const handledFiles = JSON.parse(json);

    this.handledIndexes = this.indexesFromFilenames(handledFiles);
  }
}

engine.on("ready", () => {
  const files = engine.files;

  IndexHandler = new IndexHandler(files.map((file) => file.name));
  IndexHandler.loadHandledIndexes();

  const nextFile = () => {
    const index = IndexHandler.nextIndex;

    if (index === null) {
      console.log("All files handled, exiting...");
      engine.destroy();
      return;
    }

    const file = files[index];

    // log file name
    console.log(`Starting to handle ${file.name}, index ${index}...`);

    const temporaryTorrentPath = `${tempDir}${file.name}`;

    file.select();
    const stream = file.createReadStream();
    const output = fs.createWriteStream(temporaryTorrentPath);

    stream.pipe(output);

    // get new file name and create its parent dir if needed
    const { season, episode } = getSeasonAndEpisodeNumber(file.name);
    const newFileName = generateFileName(season, episode);

    const parentDir = path.join(tempDir, path.dirname(newFileName));
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir);
    }

    output.on("finish", () => {
      console.log(
        `File ${index} downloaded successfully. Starting reencoding...`
      );

      const inputPath = temporaryTorrentPath;
      const outputPath = path.join(tempDir, newFileName);

      const handbrake = spawn("HandBrakeCLI", [
        "--preset-import-file",
        `${presetFilePath}`,
        "-Z",
        "south_park_720p_AAC",
        "-i",
        inputPath,
        "-o",
        outputPath,
      ]);

      handbrake.stdout.on("data", (data) => {
        console.log(`HandBrakeCLI stdout: ${data}`);
      });
      handbrake.stderr.on("data", (data) => {
        console.error(`HandBrakeCLI stderr: ${data}`);
      });
      handbrake.on("close", (code) => {
        if (code !== 0) {
          console.error(`HandBrakeCLI process exited with code ${code}`);
          console.error(`failed to process file ${index}`);
          console.error("deleting temporary files...");

          deleteFile(inputPath);
          deleteFile(outputPath);

          IndexHandler.failedProcessingIndex(index);

          nextFile();
        } else {
          console.log(`HandBrakeCLI process finished successfully.`);
          console.log("starting upload to ftp server...");

          nextFile();

          uploadFile(outputPath, path.join(ftpPath, newFileName))
            .then((message) => {
              console.log(message);

              deleteFile(inputPath);
              deleteFile(outputPath);

              IndexHandler.doneHandlingIndex(index);
            })
            .catch((err) => {
              console.log(err);
              console.log("upload failed, trying again...");

              // try uploading again
              uploadFile(outputPath, path.join(ftpPath, newFileName))
                .then((message) => {
                  console.log(message);

                  deleteFile(inputPath);
                  deleteFile(outputPath);

                  IndexHandler.doneHandlingIndex(index);
                })
                // if it fails again, delete the temporary files and give up
                .catch((err) => {
                  console.log(err);

                  console.log("upload failed, deleting temporary files...");
                  deleteFile(inputPath);
                  deleteFile(outputPath);

                  IndexHandler.failedProcessingIndex(index);
                });
            });
        }
      });
    });
  };

  nextFile();
});
