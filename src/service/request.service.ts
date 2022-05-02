import * as github from "@actions/github";
import { from, Observable } from "rxjs";
import { GitHubAuth } from "../domain/model";

/**
 * Request service for making API calls.
 *
 * @author Sam Butler
 * @since May 1, 2022
 */
export class RequestService {
  /**
   * This will perform a get request on the given url and the given options.
   * It will then cast the promise into an {@link Observable} to be used.
   *
   * @param url The url to hit.
   * @param options The options to send with it.
   */
  public get(url: string, env: GitHubAuth) {
    const octokit = github.getOctokit(env.token);
    return this.convertPromise(
      octokit.request(`GET ${url}`, { owner: env.owner, repo: env.repo })
    );
  }

  /**
   * Method that will convert a promise into an observable. It
   * will keep the generic value tha was passed with the promise.
   *
   * @param p The {@link Promise} to convert to an rxjs observable.
   * @returns an {@link Observable} of the generic type.
   */
  public convertPromise<T>(p: Promise<T>): Observable<T> {
    return from(p);
  }
}
