import * as core from "@actions/core";
import { GitHubService } from "./github";

async function run(): Promise<void> {
  try {
    const githubService = new GitHubService();
    githubService.startRelease().subscribe();
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
