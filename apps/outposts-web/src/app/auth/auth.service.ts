import { DestroyRef, inject, Injectable } from '@angular/core';
import LogtoClient, { IdTokenClaims } from '@logto/browser';
import { environment } from '../../environments/environment';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  defer,
  distinctUntilChanged,
  filter,
  from,
  iif,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  pairwise,
  ReplaySubject,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  tap,
  throwError,
  withLatestFrom,
  forkJoin,
  EMPTY,
} from 'rxjs';
import { AbstractNavigator, AppState, AUTH_RESOURCES, AUTH_SCOPES, SignInOptions, SignOutOptions, UserAuthState } from './auth.defs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WINDOW } from '@app/core/providers/window';
import { DOCUMENT, Location } from '@angular/common';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AccessTokenClaims } from '@logto/js';

@Injectable({
  providedIn: 'root',
})
export class AuthService<TAppState extends AppState = AppState> {
  protected logtoClient: LogtoClient;
  protected readonly navigator = inject(AbstractNavigator);
  protected readonly destoryRef = inject(DestroyRef);
  protected readonly window = inject(WINDOW);
  protected readonly location = inject(Location);
  protected readonly document = inject(DOCUMENT);

  constructor() {
    this.logtoClient = new LogtoClient({
      endpoint: environment.AUTH_ENDPOINT,
      appId: environment.AUTH_APPID,
      resources: AUTH_RESOURCES,
      scopes: AUTH_SCOPES,
    });
    const checkSessionOrCallback$ = (isCallback: boolean) =>
      iif(
        () => isCallback,
        this.handleSignInCallback(location.href),
        defer(() => this.logtoClient.isAuthenticated())
      );

    this.shouldHandleCallback()
      .pipe(
        switchMap((isCallback) =>
          checkSessionOrCallback$(isCallback).pipe(
            catchError((error) => {
              /**
               * @TODO FIXME HERE
               */
              this.navigator.navigateByUrl('/');
              this.error = error;
              return of(undefined);
            })
          )
        ),
        tap(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe();
  }

  protected isLoadingSubject$ = new BehaviorSubject<boolean>(true);
  protected refreshSubject$ = new Subject<void>();
  protected accessTokenSubject$ = new ReplaySubject<string>(1);
  protected errorSubject$ = new ReplaySubject<Error>(1);
  protected appStateSubject$ = new ReplaySubject<TAppState>(1);

  /**
   * Emits boolean values indicating the loading state of the SDK.
   */
  public readonly isLoading$ = this.isLoadingSubject$.asObservable();

  /**
   * Trigger used to pull User information from the AuthClient.
   * Triggers when the access token has changed.
   */
  protected accessTokenTrigger$ = this.accessTokenSubject$.pipe(
    distinctUntilChanged(),
    startWith(null),
    pairwise(),
    map(([prev, curr]) => ({
      current: curr as string,
      previous: prev as string | null,
    }))
  );

  /**
   * Trigger used to pull User information from the AuthClient.
   * Triggers when an event occurs that needs to retrigger the User Profile information.
   * Events: Login, Access Token change and Logout
   */
  protected readonly isAuthenticatedTrigger$ = this.isLoading$.pipe(
    filter((loading) => !loading),
    distinctUntilChanged(),
    switchMap(() =>
      // To track the value of isAuthenticated over time, we need to merge:
      //  - the current value
      //  - the value whenever the access token changes. (this should always be true of there is an access token
      //    but it is safer to pass this through this.AuthClient.isAuthenticated() nevertheless)
      //  - the value whenever refreshState$ emits
      merge(
        defer(() => this.logtoClient.isAuthenticated()),
        this.accessTokenTrigger$.pipe(mergeMap(() => this.logtoClient.isAuthenticated())),
        this.refreshSubject$.pipe(mergeMap(() => this.logtoClient.isAuthenticated()))
      )
    )
  );

  /**
   * Emits boolean values indicating the authentication state of the user. If `true`, it means a user has authenticated.
   * This depends on the value of `isLoading$`, so there is no need to manually check the loading state of the SDK.
   */
  public readonly isAuthenticated$ = this.isAuthenticatedTrigger$.pipe(distinctUntilChanged(), shareReplay(1));

  /**
   * Emits details about the authenticated user, or null if not authenticated.
   */
  public readonly user$ = this.isAuthenticatedTrigger$.pipe(
    concatMap((authenticated) =>
      authenticated ? (this.logtoClient.fetchUserInfo() as Promise<UserAuthState>) : of(null)
    ),
    distinctUntilChanged()
  );

  /**
   * Emits ID token claims when authenticated, or null if not authenticated.
   */
  public readonly idTokenClaims$ = this.isAuthenticatedTrigger$.pipe(
    concatMap((authenticated) => (authenticated ? this.logtoClient.getIdTokenClaims() : of(null)))
  );

  /**
   * Emits errors that occur during login, or when checking for an active session on startup.
   */
  public readonly error$ = this.errorSubject$.asObservable();

  /**
   * Emits the value (if any) that was passed to the `loginWithRedirect` method call
   * but only **after** `handleRedirectCallback` is first called
   */
  public readonly appState$ = this.appStateSubject$.asObservable();

  /**
   * Update the isLoading state using the provided value
   *
   * @param isLoading The new value for isLoading
   */
  public set isLoading(isLoading: boolean) {
    this.isLoadingSubject$.next(isLoading);
  }

  /**
   * Refresh the state to ensure the `isAuthenticated`, `user$` and `idTokenClaims$`
   * reflect the most up-to-date values from  AuthClient.
   */
  public refresh(): void {
    this.refreshSubject$.next();
  }

  /**
   * Update the access token, doing so will also refresh the state.
   *
   * @param accessToken The new Access Token
   */
  public set accessToken(accessToken: string) {
    this.accessTokenSubject$.next(accessToken);
  }

  /**
   * Emits the error in the `error$` observable.
   *
   * @param error The new error
   */
  public set error(error: any) {
    this.errorSubject$.next(error);
  }

  signIn(options: SignInOptions): Observable<void> {
    if (options.signInType === 'redirect') {
      return from(this.logtoClient.signIn(options.redirectUrl));
    }
    /**
     * @TODO FIXME HERE
     */
    return throwError(() => new Error('not implemented'));
  }

  signOut(options: SignOutOptions): Observable<void> {
    if (options.signOutType === 'redirect') {
      return from(this.logtoClient.signOut(options.redirectUrl));
    }
    /**
     * @TODO FIXME HERE
     */
    return throwError(() => new Error('not implemented'));
  }

  handleSignInCallback(callbackUrl?: string) {
    return defer(() => this.logtoClient.handleSignInCallback(callbackUrl || this.window.location.href)).pipe(
      switchMap(() => this.logtoClient.isAuthenticated()),
      withLatestFrom(this.isLoading$),
      tap(([_, isLoading]) => {
        if (!isLoading) {
          this.refresh();
        }
      }),
      map(([result]) => result)
    );
  }

  protected shouldHandleCallback(): Observable<boolean> {
    return from(this.logtoClient.isSignInRedirected(this.window.location.href));
  }

  getResourceToken (resource: string): Observable<string | null> {
    return from(this.logtoClient.getAccessToken(resource)).pipe(
      catchError(() => of(null))
    )
  }

  getTokenClaims({
    resources = [],
  }: {
    resources: string[] | undefined;
  }): Observable<{ id: IdTokenClaims; resources: AccessTokenClaims[] } | null> {
    return this.isAuthenticated$.pipe(
      switchMap((isAuth) => {
        if (!isAuth) {
          return of(null);
        }
        return forkJoin([
          from(this.logtoClient.getIdTokenClaims()),
          ...resources.map((r) => from(this.logtoClient.getAccessTokenClaims(r))),
        ]).pipe(
          map(([idClaims, ...resourceClaims]) => {
            return {
              id: idClaims,
              resources: resourceClaims,
            };
          })
        );
      })
    );
  }

  canActivate({
    scopes: expectedScopes,
    resources,
    redirectUrlToBase = '/',
  }: {
    resources: string[];
    scopes: RegExp[];
    redirectUrlToBase?: string;
  }): (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => Observable<boolean> {
    return (_route, _state) =>
      this.isAuthenticated$.pipe(
        switchMap((isAuth) => {
          if (isAuth) {
            return of(true);
          }
          const redirectUrl = `${this.document.baseURI.replace(/\/$/, '')}${redirectUrlToBase}`;
          return from(this.signIn({ redirectUrl, signInType: 'redirect' })).pipe(switchMap(() => EMPTY));
        }),
        switchMap((_isAuth) => {
          
          return this.getTokenClaims({
            resources,
          }).pipe(
            map((clms) => {
              const actualScopes = (clms?.resources || []).map((c) => c.scope || '');
              return expectedScopes.length === 0 || expectedScopes.every((s) => actualScopes.some((as) => s.test(as)));
            })
          );
        })
      );
  }
}
