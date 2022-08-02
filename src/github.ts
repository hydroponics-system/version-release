import * as core from "@actions/core";
import { combineLatest, Observable, of } from "rxjs";
import { switchMap } from "rxjs/operators";
import { GitHubAuth, Release, Version } from "./domain/model";
import { EnvironmentService } from "./service/environment.service";
import { RequestService } from "./service/request.service";

/**
 * Github service for handling all functionality with github actions.
 *
 * @author Sam Butler
 * @since May 1, 2022
 */
export class GitHubService {
  requestService = new RequestService();
  environmentService = new EnvironmentService();

  ACTIVE_ENVIRONMENT: GitHubAuth = { owner: "", repo: "", token: "" };
  BUMP_TYPE = "patch";

  public startRelease() {
    this.ACTIVE_ENVIRONMENT = this.environmentService.getActiveEnvironment();
    return combineLatest([this.getLatestTag(), this.getLatestCommit()]).pipe(
      switchMap(([v, c]) => this.bumpVersion(v, c)),
      switchMap((res) => this.buildRelease(res))
    );
  }

  /**
   * Async function to get all the tags from the repository.
   *
   * @returns an {@link Observable} of type {@link Version}
   */
  private getLatestTag(): Observable<Version> {
    console.log("Getting latest tags...");
    return this.requestService
      .get("/repos/{owner}/{repo}/tags", this.ACTIVE_ENVIRONMENT)
      .pipe(switchMap((res) => this.parseTagsToLatest(res)));
  }

  /**
   * This will parse the tags and get the latest tag that is on the
   * repo. It will than format that into a {@link Version} object
   * to be used for creating the release and body.
   *
   * @param tags The list of tags to parse.
   * @returns an {@link Observable} of the latest {@link Version}
   */
  private parseTagsToLatest(tags: any): Observable<Version> {
    const regexEx = new RegExp("^v(?:(\\d+).)?(?:(\\d+).)?(\\*|\\d+)$");
    const result = regexEx.exec(tags.data[0].name);

    if (result) {
      const v: Version = {
        major: parseInt(result[1]),
        minor: parseInt(result[2]),
        fix: parseInt(result[3]),
      };
      console.log(`Latest tag found: 'v${this.parseVersion(v)}'`);
      return of(v);
    } else {
      return of({ major: 0, minor: 0, fix: 0 });
    }
  }

  /**
   * This will get the latest commit message to be used on the release.
   * It will check see what bump version it should do and then it will
   * pull the commit message and attach it to the release notes. If the
   * message can not be determined then it will do a default patch and
   * add a link to the diff from the previous version.
   */
  private getLatestCommit(): Observable<string> {
    console.log("Getting latest commit message...");
    return this.requestService
      .get("/repos/{owner}/{repo}/commits", this.ACTIVE_ENVIRONMENT)
      .pipe(
        switchMap((res) => {
          console.log(`Latest Commit: '${res.data[0].commit.message}'`);
          const regexEx = new RegExp("<(.*?)>(:.*)");
          let result = regexEx.exec(res.data[0].commit.message);
          this.BUMP_TYPE = result ? result[1] : "patch";
          return of(res.data[0].commit.message);
        })
      );
  }

  /**
   * This will bump the current version that was pulled. If there is
   * not a bump type on the commit message then it will do a patch
   * by default.
   *
   * @param message The commit message to parse.
   */
  private bumpVersion(current: Version, commit: string): Observable<Release> {
    const newVersion: Version = { ...current };

    const versionInput = this.environmentService.getVersionInput();
    if (versionInput) {
      const regexEx = new RegExp("(?:(\\d+).)?(?:(\\d+).)?(\\*|\\d+)$");
      const result = regexEx.exec(versionInput);

      if (result) {
        newVersion.major = parseInt(result[1]);
        newVersion.minor = parseInt(result[1]);
        newVersion.fix = parseInt(result[1]);
      }
      console.log(`Custom Version Release: ${this.parseVersion(newVersion)}`);
    } else {
      if (this.BUMP_TYPE === "major") {
        newVersion.major = newVersion.major + 1;
        newVersion.minor = 0;
        newVersion.fix = 0;
      } else if (this.BUMP_TYPE === "minor") {
        newVersion.minor = newVersion.minor + 1;
        newVersion.fix = 0;
      } else {
        newVersion.fix = newVersion.fix + 1;
      }
      console.log(`Version Bump Release: ${this.parseVersion(newVersion)}`);
    }

    console.log(
      `New Version: ${this.BUMP_TYPE} -> 'v${this.parseVersion(newVersion)}'\n`
    );

    core.setOutput("tag", `v${this.parseVersion(newVersion)}`);
    core.setOutput("release_name", `Release v${this.parseVersion(newVersion)}`);
    return of({ current: current, new: newVersion, commit: commit });
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
  private buildRelease(r: Release): Observable<any> {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    var yyyy = today.getFullYear();

    const todayString = yyyy + "-" + mm + "-" + dd;
    let body = `### [${this.parseVersion(r.new)}]`;
    body += `(https://github.com/${this.ACTIVE_ENVIRONMENT.owner}/${this.ACTIVE_ENVIRONMENT.repo}/compare/`;
    body += `v${this.parseVersion(r.current)}...v${this.parseVersion(r.new)})`;
    body += `(${todayString})\n`;

    body += `### **Changes**\n* ${this.getCommitBody(r.commit)}`;
    console.log("Release Content: \n" + body);
    core.setOutput("body", body);
    return of(null);
  }

  /**
   * This will get the body of the commit. If there is no commit
   * body then it will just set a default release body.
   *
   * @param message The commit message to parse.
   * @returns The body message to add to to the release notes.
   */
  private getCommitBody(message: string) {
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
   * This will take the version and parse it into a readable
   * and formatted version string.
   *
   * @param version The version to format.
   * @returns The new formatted string.
   */
  private parseVersion(version: Version) {
    return `${version.major}.${version.minor}.${version.fix}`;
  }
}
