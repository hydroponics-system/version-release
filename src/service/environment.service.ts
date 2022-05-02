import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "fs";
import path from "path";
import { GitHubAuth } from "../domain/model";

export class EnvironmentService {
  LOCAL_ENV_PATH = "../src/environment/environment.local.conf";

  /**
   * This will get the {@link GitHubAuth} object to be used to perform
   * the action. It will go based on the environment that is currently
   * be run.
   *
   * @returns A {@link GitHubAuth} object
   */
  public getActiveEnvironment(): GitHubAuth {
    const githubToken = core.getInput("github_token");

    if (githubToken) {
      console.log("Active Environment: PRODUCTION\n");
      return {
        owner: this.getOwner(),
        repo: this.getRepo(),
        token: githubToken,
      };
    } else if (fs.existsSync(this.getLocalEnvironmentFile())) {
      console.log("Active Environment: LOCAL\n");
      const dataArray = this.getConfigProperties();
      return { owner: dataArray[0], repo: dataArray[1], token: dataArray[2] };
    } else {
      core.setFailed(
        "Could not determine environment. If local environment, please confirm a 'environment.local.conf' exists."
      );
      return { owner: "", repo: "", token: "" };
    }
  }

  /**
   * Simply will get the owner of the repository.
   *
   * @returns A {@link String} of the owner.
   */
  public getOwner() {
    return github.context.repo.owner;
  }

  /**
   * Simply will get the name of the repository.
   *
   * @returns A {@link String} of the repository name.
   */
  public getRepo() {
    return github.context.repo.repo;
  }

  /**
   * Gets the needed config properties to perform the action from
   * the local environment file.
   *
   * @returns A {@link String} array of the property values.
   */
  public getConfigProperties(): string[] {
    var array = fs
      .readFileSync(this.getLocalEnvironmentFile())
      .toString()
      .split("\n")
      .map((v) => v.substring(v.indexOf("=") + 1).trim());
    return array;
  }

  /**
   * This will get the local environment path if one exits for the user.
   *
   * @returns A {@link String} of the local environemnt path.
   */
  public getLocalEnvironmentFile(): string {
    return path.resolve(__dirname, this.LOCAL_ENV_PATH);
  }
}
