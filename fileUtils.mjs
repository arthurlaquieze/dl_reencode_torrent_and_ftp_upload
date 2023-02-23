import * as fs from "fs";

const deleteFile = (path) => {
  /**
   * This function deletes a file.
   * @param {string} path - The path to the file
   */

  fs.unlink(path, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log(`Temporary file ${source_path} deleted successfully.`);
    }
  });
};

const getSeasonAndEpisodeNumber = (path) => {
  /**
   *This function extracts the season and episode number from a file name.
   *Examples:
   *'southpark_s01e01' should return { season: '01', episode: '01' }
   *'southpark_s01E01' should return { season: '01', episode: '01' }
   *'southpark_S01e01_720p_MULTI' should return { season: '01', episode: '01' }
   *@param {string} path - The path to the file
   *@returns {object} An object with the season and episode numbers as properties
   */

  // Extract the file name from the path
  const fileName = path.split("/").pop();

  // Use a regular expression to match the season and episode numbers in the file name
  const regexMatch = fileName.match(/[sS](\d{1,2})[eE](\d{1,2})/);

  // parse the matched strings as integers
  const seasonNumber = parseInt(regexMatch[1], 10);
  const episodeNumber = parseInt(regexMatch[2], 10);

  // pad the numbers with leading zeros if necessary
  const season = seasonNumber.toString().padStart(2, "0");
  const episode = episodeNumber.toString().padStart(2, "0");

  return { season: season, episode: episode };
};

const generateFileName = (season, episode) => {
  /**
   * This function generates a new file name for the reencoded file.
   *
   * @param {string} season - The season number
   * @param {string} episode - The episode number
   *
   * @returns {string} The new file name
   *
   * Examples:
   *  generateFileName('13', '02') should return 'S13/SouthPark_s01e01_1080p_MULTI_x265.mkv'
   */

  return `S${season}/SouthPark_s${season}e${episode}_720p_MULTI_x265.mkv`;
};

export { deleteFile, getSeasonAndEpisodeNumber, generateFileName };
