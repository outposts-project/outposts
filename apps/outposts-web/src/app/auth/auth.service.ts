import { DestroyRef, inject, Injectable } from '@angular/core';
import LogtoClient, { IdTokenClaims } from '@logto/browser';
import { environment } from '../../environments/environment';
import {
  BehaviorSubject,
  concatMap,
  distinctUntilChanged,
  from,
  map,
  Observable,
  of,
  ReplaySubject,
  shareReplay,
  switchMap,
  forkJoin,
  EMPTY,
  catchError,
} from 'rxjs';
import {
  type AuthState,
  type SignInOptions,
  type SignOutOptions,
  type AuthStateUserData,
  AUTH_SCOPES,
  AUTH_RESOURCES,
} from './auth.defs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WINDOW } from '@app/core/providers/window';
import { DOCUMENT, Location } from '@angular/common';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AccessTokenClaims } from '@logto/js';
import { EventTypes, type OidcClientNotification, OidcSecurityService, PublicEventsService } from 'angular-auth-oidc-client';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  protected oidcSecurityService = inject(OidcSecurityService);
  protected eventService = inject(PublicEventsService);
  protected readonly destoryRef = inject(DestroyRef);
  protected readonly window = inject(WINDOW);
  protected readonly location = inject(Location);
  protected readonly document = inject(DOCUMENT);
  protected readonly logtoClient: LogtoClient;

  constructor() {
    this.logtoClient = new LogtoClient({
      endpoint: environment.AUTH_ENDPOINT,
      appId: environment.AUTH_APPID,
      scopes: AUTH_SCOPES,
      resources: AUTH_RESOURCES
    });
    const checkAuth$ = (): Observable<AuthState> => from(this.oidcSecurityService.checkAuth());

    from(checkAuth$())
      .pipe(
        takeUntilDestroyed(this.destoryRef)
      ).subscribe((resp) => {
        this.authState = resp;
        console.log(resp)
        this.checkAuthFinished = true;
      })

    this.eventService.registerForEvents()
      .pipe(
        takeUntilDestroyed(this.destoryRef)
      ).subscribe((notification) => {
        console.log('notification: ', notification)
      })
  }

  protected checkAuthFinishedSubject$ = new BehaviorSubject<boolean>(false);
  protected errorSubject$ = new ReplaySubject<Error>(1);
  protected authStateSubject$ = new ReplaySubject<AuthState>(1);

  public readonly checkAuthFinished$ = this.checkAuthFinishedSubject$.asObservable();

  public readonly authState$ = this.authStateSubject$.asObservable();

  /**
   * Emits boolean values indicating the authentication state of the user. If `true`, it means a user has authenticated.
   * This depends on the value of `isLoading$`, so there is no need to manually check the loading state of the SDK.
   */
  public readonly isAuthenticated$ = this.authStateSubject$.pipe(
    map((state) => state.isAuthenticated),
    distinctUntilChanged(), shareReplay(1)
  );

  public readonly user$: Observable<AuthStateUserData | null> = this.authState$.pipe(
    map((state) => state.isAuthenticated ? state.userData : null),
    distinctUntilChanged(),
  );

  public readonly idTokenClaims$ = this.authState$.pipe(
    concatMap((state) => (state.isAuthenticated ? this.oidcSecurityService.getPayloadFromIdToken() : of(null))),
  );

  public readonly error$ = this.errorSubject$.asObservable();

  public set checkAuthFinished(finished: boolean) {
    this.checkAuthFinishedSubject$.next(finished);
  }

  public set error(error: any) {
    this.errorSubject$.next(error);
  }

  protected set authState (state: AuthState) {
    this.authStateSubject$.next(state);
  }

  signIn(options: SignInOptions): Observable<void> {
    if (options.signInType === 'redirect') {
      return of(
        this.oidcSecurityService.authorize(undefined, {
        redirectUrl: options.redirectUrl
      })).pipe(
        switchMap(() => EMPTY)
      ) as Observable<void>;
    } else {
      return this.oidcSecurityService.authorizeWithPopUp().pipe(
        map((resp) => {
          this.authState = resp;
        })
      )
    }
  }

  signOut(_options: SignOutOptions): Observable<void> {
    return this.oidcSecurityService.logoff().pipe(
      map((resp) => {
        console.debug('signout resp: ', resp)
      })
    ) as Observable<void>;
  }

  getResourceClaims(resources: string[]): Observable<Array<IdTokenClaims | null>> {
    return forkJoin(
      resources.map((r) => 
      from(this.logtoClient.getAccessTokenClaims(r)).pipe(
        catchError((e) => {
          return of(null)
        }),
      ))
    ) as Observable<Array<IdTokenClaims | null>>
  }

  getIdTokenClaim(): Observable<IdTokenClaims | null> {
    return this.oidcSecurityService.getPayloadFromIdToken().pipe((data) => {
      console.debug('id-token payload:', data);
      return data;
    });
  }

  getTokenClaims({
    resources = [],
  }: {
    resources: string[] | undefined;
  }): Observable<{ idClaims: IdTokenClaims | null; resourcesClaims: Record<string, AccessTokenClaims | null> } | null> {
    return this.isAuthenticated$.pipe(
      switchMap((isAuth) => {
        if (!isAuth) {
          return of(null);
        }
        return forkJoin([
          this.getIdTokenClaim(),
          this.getResourceClaims(resources),
        ]).pipe(
          map(([idClaims, resourcesClaims]) => {
            const resourcesMap: Record<string, AccessTokenClaims | null> = {};
            for (const [index, resource] of resources.entries()) {
              resourcesMap[resource] = resourcesClaims[index];
            }
            return {
              idClaims,
              resourcesClaims: resourcesMap,
            };
          }),
        );
      }),
    );
  }

  canActivate({
    signInType = 'redirect',
    resourceScopesMap,
    redirectUrlToBase = '/',
  }: {
    signInType?: SignInOptions['signInType'],
    resourceScopesMap: Record<string, RegExp[]>,
    redirectUrlToBase?: string;
  }): (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => Observable<boolean> {
    return (_route, _state) =>
      this.isAuthenticated$.pipe(
        switchMap((isAuth) => {
          if (isAuth) {
            return of(true);
          }
          const redirectUrl = `${this.document.baseURI.replace(/\/$/, '')}${redirectUrlToBase}`;
          return from(this.signIn({ redirectUrl, signInType }));
        }),
        switchMap((_isAuth) => {
          return this.getTokenClaims({
            resources: Object.keys(resourceScopesMap),
          }).pipe(
            map((allClms) => {
              const resourceClms = allClms?.resourcesClaims;
              return Object.entries(resourceClms || {}).every(([resource, rClms]) => {
                const expectedScopes = resourceScopesMap[resource] || [];
                return expectedScopes.every(es => es.test(rClms?.scope || ''))
              })
            }),
          );
        }),
      );
  }
}
