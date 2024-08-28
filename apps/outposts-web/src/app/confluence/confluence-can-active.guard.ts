import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '@app/auth/auth.service';
import { AUTH_CONFLUENCE_CONFIG } from './confluence.defs';

export const canActiveConfluence: CanActivateFn = (...args) => {
  const authService = inject(AuthService);

  return authService.canActivate([AUTH_CONFLUENCE_CONFIG])(...args);
};
