const core = require("@actions/core");
const github = require("@actions/github");

const githubToken = core.getInput("github_token");
const octokit = github.getOctokit(githubToken);
let owner = "";
let repo = "";

let CURRENT_VERSION = { major: 0, minor: 0, fix: 0 };
let NEW_VERSION = { major: 0, minor: 0, fix: 0 };
let RELEASE_DATA = "New Release";

setup();
getLatestTag();
getLatestCommitMessage();

try {
  console.log("Setting outputs...");
  core.setOutput(
    "tag",
    `v${NEW_VERSION.major}.${NEW_VERSION.minor}.${NEW_VERSION.fix}`
  );
  core.setOutput(
    "release_name",
    `Release v${NEW_VERSION.major}.${NEW_VERSION.minor}.${NEW_VERSION.fix}`
  );
  core.setOutput("body", RELEASE_DATA);
} catch (error) {
  core.setFailed(error.message);
}

function setup() {
  try {
    owner = github.context.repo.owner;
    repo = github.context.repo.repo;
  } catch (error) {
    core.setFailed("Could not get owner or repo name");
  }
}

async function getLatestTag() {
  const tags = await octokit.request("GET /repos/{owner}/{repo}/tags", {
    owner: owner,
    repo: repo,
  });
  const regexEx = new RegExp("^v(?:(\\d+).)?(?:(\\d+).)?(\\*|\\d+)$");
  const result = regexEx.exec(tags.data[0].name);

  CURRENT_VERSION.major = parseInt(result[1]);
  CURRENT_VERSION.minor = parseInt(result[2]);
  CURRENT_VERSION.fix = parseInt(result[3]);

  NEW_VERSION = { ...CURRENT_VERSION };
}

async function getLatestCommitMessage() {
  const commits = await octokit.request("GET /repos/{owner}/{repo}/commits", {
    owner: owner,
    repo: repo,
  });

  const regexEx = new RegExp("<(.*?)>(:.*)");
  const result = regexEx.exec(commits.data[0].commit.message);

  const bumpType = result ? result[0] : "patch";
  if (bumpType === "major") {
    NEW_VERSION.major = NEW_VERSION.major + 1;
  } else if (bumpType === "minor") {
    NEW_VERSION.minor = NEW_VERSION.minor + 1;
  } else {
    NEW_VERSION.fix = NEW_VERSION.fix + 1;
  }

  console.log(
    "New Version Bump: " +
      `${NEW_VERSION.major}.${NEW_VERSION.minor}.${NEW_VERSION.fix}`
  );

  let bodyMesage = "New Release";
  if (result) {
    bodyMesage = result[1];
  }

  buildReleaseBody(
    `${CURRENT_VERSION.major}.${CURRENT_VERSION.minor}.${CURRENT_VERSION.fix}`,
    `${NEW_VERSION.major}.${NEW_VERSION.minor}.${NEW_VERSION.fix}`,
    bodyMesage
  );
}

function buildReleaseBody(currentVersion, newVersion, body) {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, "0");
  var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  var yyyy = today.getFullYear();

  today = yyyy + "-" + mm + "-" + dd;
  RELEASE_DATA = `### [${newVersion}](https://github.com/hydroponics-system/hydro-microservice/compare/${currentVersion}...${newVersion}) (${today})\n### **Changes**\n* ${body}`;
  console.log(RELEASE_DATA);
}
