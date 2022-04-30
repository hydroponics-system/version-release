const core = require("@actions/core");
const github = require("@actions/github");

const githubToken = core.getInput("github_token");
const octokit = github.getOctokit(githubToken);
let owner = "";
let repo = "";

let CURRENT_VERSION = { major: 0, minor: 0, fix: 0 };
let NEW_VERSION = { major: 0, minor: 0, fix: 0 };
let RELEASE_DATA = "New Release";

/**
 * This will run the async process to create the version bump.
 * It will first get the latest tag from the repository and determine
 * if it needs a major, minor, or patch version update based on
 * the commit message that was sent with the merge.
 *
 * @author Sam Butler
 * @since April 29, 2022
 */
async function run() {
  setup();
  getLatestTag().then(() => {
    getLatestCommitMessage().then(() => {
      try {
        const version = parseVersion(NEW_VERSION);
        console.log("Setting outputs...");
        core.setOutput("tag", `v${version}`);
        core.setOutput("release_name", `Release v${version}`);
        core.setOutput("body", RELEASE_DATA);
      } catch (error) {
        core.setFailed(error.message);
      }
    });
  });
}

/**
 * This will setup the owner and repository name to be used
 * when getting the tags and commit messages.
 */
function setup() {
  try {
    owner = github.context.repo.owner;
    repo = github.context.repo.repo;
  } catch (error) {
    core.setFailed("Could not get owner or repo name");
  }
}

/**
 * Async function to get all the tags from the repository and
 * then pull the latest one. It will then set the class level
 * variables of the {@link NEW_VERSION} and {@link CURRENT_VERSION}.
 */
async function getLatestTag() {
  console.log("Getting latest tags...");
  const tags = await octokit.request("GET /repos/{owner}/{repo}/tags", {
    owner: owner,
    repo: repo,
  });

  const regexEx = new RegExp("^v(?:(\\d+).)?(?:(\\d+).)?(\\*|\\d+)$");
  const result = regexEx.exec(tags.data[0].name);

  CURRENT_VERSION = {
    major: parseInt(result[1]),
    minor: parseInt(result[2]),
    fix: parseInt(result[3]),
  };
  NEW_VERSION = { ...CURRENT_VERSION };

  console.log(`Latest tag found: 'v${parseVersion(CURRENT_VERSION)}'\n`);
}

/**
 * This will get the latest commit message to be used on the release.
 * It will check see what bump version it should do and then it will
 * pull the commit message and attach it to the release notes. If the
 * message can not be determined then it will do a default patch and
 * add a link to the diff from the previous version.
 */
async function getLatestCommitMessage() {
  console.log("Getting last commit message...");
  const commits = await octokit.request("GET /repos/{owner}/{repo}/commits", {
    owner: owner,
    repo: repo,
  });

  bumpVersion(commits.data[0].commit.message);

  buildReleaseBody(
    parseVersion(CURRENT_VERSION),
    parseVersion(NEW_VERSION),
    getCommitBody(commits.data[0].commit.message)
  );
}

/**
 * This will bump the current version that was pulled. If there is
 * not a bump type on the commit message then it will do a patch
 * by default.
 *
 * @param message The commit message to parse.
 */
function bumpVersion(message) {
  const regexEx = new RegExp("<(.*?)>(:.*)");
  let result = regexEx.exec(message);

  const bumpType = result ? result[1] : "patch";
  if (bumpType === "major") {
    NEW_VERSION.major = NEW_VERSION.major + 1;
    NEW_VERSION.minor = 0;
    NEW_VERSION.fix = 0;
  } else if (bumpType === "minor") {
    NEW_VERSION.minor = NEW_VERSION.minor + 1;
    NEW_VERSION.fix = 0;
  } else {
    NEW_VERSION.fix = NEW_VERSION.fix + 1;
  }

  console.log(`Commit message found: '${message}'`);
  console.log(`New Version: ${bumpType} -> 'v${parseVersion(NEW_VERSION)}'\n`);
}

/**
 * This will get the body of the commit. If there is no commit
 * body then it will just set a default release body.
 *
 * @param message The commit message to parse.
 * @returns The body message to add to to the release notes.
 */
function getCommitBody(message) {
  const regexEx = new RegExp("<(.*?)>(:.*)");
  let result = regexEx.exec(message);
  let bodyMesage = "New Release";

  if (result) {
    bodyMesage = result[2].replace(": ", "");
  } else {
    const regexEx = new RegExp("(:.*)");
    result = regexEx.exec(message);
    bodyMesage = result ? result[0].replace(":", "").trim() : message;
  }
  return bodyMesage;
}

/**
 * Builds out the release body to be used so it is formatted correctly
 * for github. It will have a link to compare the new version to the
 * previous version and also the most recent commit message that was
 * merged with the new release.
 *
 * @param currentVersion The current version on github.
 * @param newVersion The new version that should be created.
 * @param body The message to add to the releease.
 */
function buildReleaseBody(currentVersion, newVersion, body) {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, "0");
  var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  var yyyy = today.getFullYear();

  today = yyyy + "-" + mm + "-" + dd;
  RELEASE_DATA = `### [${newVersion}](https://github.com/hydroponics-system/hydro-microservice/compare/v${currentVersion}...v${newVersion}) (${today})\n### **Changes**\n* ${body}`;
  console.log("Content: \n" + RELEASE_DATA + "\n");
}

/**
 * This will take the version and parse it into a readable
 * and formatted version string.
 *
 * @param version The version to format.
 * @returns The new formatted string.
 */
function parseVersion(version) {
  return `${version.major}.${version.minor}.${version.fix}`;
}

run();
