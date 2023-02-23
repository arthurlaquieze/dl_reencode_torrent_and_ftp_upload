import * as ftp from "basic-ftp";
import { dirname } from "path";

// import ftp credentials from the config file
import ftpConfig from "./ftpCredentials.json" assert { type: "json" };

const uploadFile = async (sourcePath, destinationPath) => {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log("Connecting to ftp server...");
    await client.access(ftpConfig);

    // make the parent dir if it doesn't exist
    const parentDir = dirname(destinationPath);
    await client.ensureDir(parentDir);

    console.log("Connected, starting upload to ftp server...");
    await client.uploadFrom(sourcePath, destinationPath);

    console.log(`File ${sourcePath} uploaded successfully.`);
    return Promise.resolve("Upload complete");
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  } finally {
    client.close();
  }
};

export default uploadFile;
