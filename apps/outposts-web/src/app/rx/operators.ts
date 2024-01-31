import {
  switchMap,
  from,
  catchError,
  throwError,
  finalize,
  Observable,
  Subject,
} from 'rxjs';

export function withSuspense<T, E = any>(
  source$: Observable<T>,
  {
    loading$$,
    error$$,
  }: {
    loading$$?: Subject<boolean>;
    error$$?: Subject<E>;
  } = {}
): Observable<T> {
  if (loading$$) {
    loading$$.next(true);
  }
  return source$.pipe(
    catchError((err) => {
      if (error$$) {
        error$$.next(err);
      }
      return throwError(() => err);
    }),
    finalize(() => {
      if (loading$$) {
        loading$$.next(false);
      }
    })
  );
}

export function switchMapWithSuspense<T, U, E = any>(
  fn: (s: T) => Observable<U>,
  options: {
    loading$$?: Subject<boolean>;
    error$$?: Subject<E>;
  } = {}
) {
  return (source$: Observable<T>): Observable<U> =>
    source$.pipe(switchMap((s) => withSuspense(from(fn(s)), options)));
}
