const torrentStream = require("torrent-stream");
const hbjs = require("handbrake-js");
const ftp = require("basic-ftp");
const fs = require("fs");

// load ftp credentials from the config file
const ftpConfig = require("./ftp_credentials.json");

// load torrent from file as a buffer
const torrentFile = fs.readFileSync("./torrentfile.torrent");

const torrentUrl = "http://example.com/torrentfile.torrent";

const ftpPath = "/files/Anime/southpark";
const tempDir = "./temp/";
// create temp dir
fs.mkdir(tempDir, { recursive: true }, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`Temp dir ${tempDir} created successfully.`);
  }
});

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

        hbjs
          .spawn({
            input: temporaryPath,
            output: `Reencoded_${tempDir}${file.name}`,
            // preset: "south_park_best",
            "preset-import-file": "south_park_best.json",
          })
          .on("error", (err) => {
            console.error(err);
            // nextFile();
          })
          .on("complete", () => {
            console.log("Reencoding complete.");
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
          });
      });
    }
  };
  nextFile();
});
