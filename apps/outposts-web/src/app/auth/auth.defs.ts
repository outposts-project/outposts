import { environment } from '@environments/environment';
import { buildAngularAuthConfig } from '@logto/js';
import { StsConfigStaticLoader } from 'angular-auth-oidc-client';

export const AUTH_RESOURCES = [environment.CONFLUENCE_API_ENDPOINT];
export const AUTH_SCOPES = ['read:confluence', 'write:confluence'];

export type AuthStateUserDataIdentity = {
  userId: string;
  details?: Record<string, unknown>;
};

export type AuthStateUserData = {
  sub: string;
  name?: string | null;
  username?: string | null;
  picture?: string | null;
  email?: string | null;
  email_verified?: boolean;
  phone_number?: string | null;
  phone_number_verified?: boolean;
  custom_data?: unknown;
  identities?: Record<string, AuthStateUserDataIdentity>;
};

export interface AuthState  {
  isAuthenticated: boolean;
  userData: AuthStateUserData;
  accessToken: string;
  idToken: string;
  configId?: string;
  errorMessage?: string;
}

export interface RedirectSignInOptions {
  signInType: 'redirect';
  redirectUrl: string;
}

export interface PopupSignInOptions {
  signInType: 'popup';
}

export type SignInOptions = RedirectSignInOptions | PopupSignInOptions;

export interface RedirectSignOutOptions {
  signOutType: 'redirect';
  redirectUrl: string;
}

export interface PopupSignOutOptions {
  signOutType: 'popup';
}

export type SignOutOptions = RedirectSignOutOptions | PopupSignOutOptions;

export function buildRedirectUrl (document: Document, redirectUrlToBase: string): string {
  return `${document.baseURI.replace(/\/$/, '')}${redirectUrlToBase}`
}

export function authConfigFactory (document: Document) {
  const authConfig = buildAngularAuthConfig({
    endpoint: environment.AUTH_ENDPOINT,
    appId: environment.AUTH_APPID,
    redirectUri: buildRedirectUrl(document, '/'),
    scopes: AUTH_SCOPES
  });
  console.debug('auth-config:', authConfig);
  return new StsConfigStaticLoader(authConfig)
}