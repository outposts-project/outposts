import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { environment } from '@environments/environment';

export const AUTH_RESOURCES = [environment.CONFLUENCE_API_ENDPOINT];
export const AUTH_SCOPES = ['read:confluence', 'write:confluence'];
export const AUTH_CALLBACK_ORIGIN_URI_KEY = 'auth_callback_origin_uri';

export type UserAuthIdentity = {
  userId: string;
  details?: Record<string, unknown>;
};

export type UserAuthState = {
  sub: string;
  name?: string | null;
  username?: string | null;
  picture?: string | null;
  email?: string | null;
  email_verified?: boolean;
  phone_number?: string | null;
  phone_number_verified?: boolean;
  custom_data?: unknown;
  identities?: Record<string, UserAuthIdentity>;
};

export interface RedirectSignInOptions {
  signInType: 'redirect';
  redirectUrl: string;
}

/**
 * @unimplemented
 */
export interface PopupSignInOptions {
  signInType: 'popup';
}

export type SignInOptions = RedirectSignInOptions | PopupSignInOptions;

export interface RedirectSignOutOptions {
  signOutType: 'redirect';
  redirectUrl: string;
}

/**
 * @unimplemented
 */
export interface PopupSignOutOptions {
  signOutType: 'popup';
}

export type SignOutOptions = RedirectSignOutOptions | PopupSignOutOptions;

/**
 * Angular specific state to be stored before redirect
 */
export interface AppState {
  /**
   * Target path the app gets routed to after
   * handling the callback from Auth0 (defaults to '/')
   */
  target?: string;

  /**
   * Any custom parameter to be stored in appState
   */
  [key: string]: any;
}
