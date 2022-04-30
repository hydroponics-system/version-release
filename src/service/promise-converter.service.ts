import {from, Observable} from 'rxjs'

/**
 * Method that will convert a promise into an observable. It
 * will keep the generic value tha was passed with the promise.
 *
 * @param p The {@link Promise} to convert to an rxjs observable.
 * @returns an {@link Observable} of the generic type.
 */
export function convertPromise<T>(p: Promise<T>): Observable<T> {
  return from(p)
}
