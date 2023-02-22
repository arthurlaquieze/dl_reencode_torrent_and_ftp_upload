const torrentStream = require("torrent-stream");
const hbjs = require("handbrake-js");
const ftp = require("basic-ftp");
const fs = require("fs");

// load ftp credentials from the config file
const ftpConfig = require("./ftp_credentials.json");

// load torrent from file as a buffer
const torrentFile = fs.readFileSync("./torrentfile.torrent");

const ftpPath = "/files/Anime/southpark";
const tempDir = "./temp/";

const engine = torrentStream(torrentFile);

engine.on("ready", () => {
  engine.files.forEach((file) => {
    console.log(file.name);

    const temporaryPath = `${tempDir}${file.name}`;
    const ftpClient = new ftp.Client();

    file.select();

    const stream = file.createReadStream();
    const output = fs.createWriteStream(temporaryPath);

    stream.pipe(output);

    output.on("finish", () => {
      hbjs
        .spawn({
          input: temporaryPath,
          output: `reencoded_${tempDir}${file.name}`,
          "preset-import-file": "south_park_best.json",
        })
        //   preset: "Fast 720p",
        .on("error", (err) => {
          console.error(err);
        })
        .on("complete", () => {
          console.log("Reencoding complete.");
          return;
          ftpClient
            .access(ftpConfig)
            .then(() => {
              return ftpClient.uploadFrom(
                `${tempDir}${file.name}.mp4`,
                `${ftpPath}${file.name}.mp4`
              );
            })
            .then(() => {
              console.log(`File ${file.name} uploaded successfully.`);
              fs.unlink(temporaryPath, (err) => {
                if (err) {
                  console.error(err);
                } else {
                  console.log(
                    `Temporary file ${temporaryPath} deleted successfully.`
                  );
                }
              });
              fs.unlink(`${tempDir}${file.name}.mp4`, (err) => {
                if (err) {
                  console.error(err);
                } else {
                  console.log(
                    `Temporary file ${tempDir}${file.name}.mp4 deleted successfully.`
                  );
                }
              });
            })
            .catch((err) => {
              console.error(err);
            })
            .finally(() => {
              ftpClient.close();
            });
        });
    });
    // // wait for the file to be transcoded
    // await new Promise((resolve) => {
    //   hbjs.on("complete", resolve);
    // });

    // // wait for the ftp client to be closed
    // await new Promise((resolve) => {
    //   ftpClient.on("close", resolve);
    // });

    // // wait for the file to be downloaded
    // await new Promise((resolve) => {
    //   output.on("finish", resolve);
    // });
  });
});
