const torrentStream = require("torrent-stream");
// const hbjs = require("handbrake-js");
const ftp = require("basic-ftp");
const fs = require("fs");
const { spawn } = require("child_process");

// load ftp credentials from the config file
const ftpConfig = require("./ftp_credentials.json");

// load torrent from file as a buffer
const torrentFile = fs.readFileSync("./torrentfile.torrent");

const ftpPath = "/files/Anime/southpark";
const tempDir = "./temp/";

const presetFilePath = "south_park_best.json";

// create temp dir if not exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const engine = torrentStream(torrentFile);

let index = 0;

engine.on("ready", () => {
  const files = engine.files;
  const nextFile = () => {
    if (index < files.length) {
      //   const file = files[index];
      index++;
      const file = files[1];

      // log file name
      console.log(file.name);

      const temporaryPath = `${tempDir}${file.name}`;
      //   const ftpClient = new ftp.Client();

      file.select();
      const stream = file.createReadStream();
      const output = fs.createWriteStream(temporaryPath);

      stream.pipe(output);

      output.on("finish", () => {
        console.log("File downloaded successfully. Starting reencoding...");

        const inputPath = temporaryPath;
        const outputPath = `${tempDir}reencoded_${file.name}`;

        const handbrake = spawn("HandBrakeCLI", [
          "-i",
          inputPath,
          "-o",
          outputPath,
          "--preset-import-file",
          presetFilePath,
          // `file:${presetFilePath}`,
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
            // nextFile();
          } else {
            console.log(`HandBrakeCLI process finished successfully.`);
          }
        });

        // hbjs
        //   .spawn({
        //     input: temporaryPath,
        //     output: `Reencoded_${tempDir}${file.name}`,
        //     // preset: "south_park_best",
        //     "preset-import-file": "south_park_best.json",
        //   })
        //   .on("error", (err) => {
        //     console.error(err);
        //     // nextFile();
        //   })
        //   .on("complete", () => {
        //     console.log("Reencoding complete.");
        // ftpClient
        //   .access(ftpConfig)
        //   .then(() => {
        //     return ftpClient.uploadFrom(
        //       `${tempDir}${file.name}.mp4`,
        //       `${ftpPath}${file.name}.mp4`
        //     );
        //   })
        //   .then(() => {
        //     console.log(`File ${file.name} uploaded successfully.`);
        //     fs.unlink(temporaryPath, (err) => {
        //       if (err) {
        //         console.error(err);
        //       } else {
        //         console.log(
        //           `Temporary file ${temporaryPath} deleted successfully.`
        //         );
        //       }
        //     });
        //     fs.unlink(`${tempDir}${file.name}.mp4`, (err) => {
        //       if (err) {
        //         console.error(err);
        //       } else {
        //         console.log(
        //           `Temporary file ${tempDir}${file.name}.mp4 deleted successfully.`
        //         );
        //       }
        //     });
        //     nextFile();
        //   })
        //   .catch((err) => {
        //     console.error(err);
        //     nextFile();
        //   })
        //   .finally(() => {
        //     ftpClient.close();
        //   });
        // });
      });
    }
  };
  nextFile();
});
