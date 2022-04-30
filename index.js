const core = require("@actions/core");
const github = require("@actions/github");

const githubToken = core.getInput("github_token");
const octokit = github.getOctokit(githubToken);
let owner = "";
let repo = "";

let CURRENT_VERSION = { major: 0, minor: 0, fix: 0 };
let NEW_VERSION = { major: 0, minor: 0, fix: 0 };
let RELEASE_DATA = "New Release";

async function run() {
  setup();
  getLatestTag().then(() => {
    getLatestCommitMessage().then(() => {
      try {
        const version = buildVersionString(NEW_VERSION);
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

function setup() {
  try {
    owner = github.context.repo.owner;
    repo = github.context.repo.repo;
  } catch (error) {
    // core.setFailed("Could not get owner or repo name");
  }
}

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

  console.log(`Latest tag found: 'v${buildVersionString(CURRENT_VERSION)}'\n`);
}

async function getLatestCommitMessage() {
  console.log("Getting last commit message...");
  const commits = await octokit.request("GET /repos/{owner}/{repo}/commits", {
    owner: owner,
    repo: repo,
  });

  const regexEx = new RegExp("<(.*?)>(:.*)");
  let result = regexEx.exec(commits.data[0].commit.message);

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

  console.log(`Commit message found: '${commits.data[0].commit.message}'`);
  console.log(
    `New Version Bump: ${bumpType} -> 'v${buildVersionString(NEW_VERSION)}'\n`
  );

  let bodyMesage = "New Release";
  if (result) {
    bodyMesage = result[2].replace(": ", "");
  } else {
    const regexEx = new RegExp("(:.*)");
    result = regexEx.exec(commits.data[0].commit.message);
    bodyMesage = result
      ? result[0].replace(":", "").trim()
      : commits.data[0].commit.message;
  }

  buildReleaseBody(
    buildVersionString(CURRENT_VERSION),
    buildVersionString(NEW_VERSION),
    bodyMesage
  );
}

function buildReleaseBody(currentVersion, newVersion, body) {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, "0");
  var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  var yyyy = today.getFullYear();

  today = yyyy + "-" + mm + "-" + dd;
  RELEASE_DATA = `### [${newVersion}](https://github.com/hydroponics-system/hydro-microservice/compare/v${currentVersion}...v${newVersion}) (${today})\n### **Changes**\n* ${body}`;
  console.log("Content: \n" + RELEASE_DATA + "\n");
}

function buildVersionString(version) {
  return `${version.major}.${version.minor}.${version.fix}`;
}

run();
