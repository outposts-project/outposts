import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '@app/auth/auth.service';
import { environment } from '@environments/environment';

export const canActiveConfluence: CanActivateFn = (...args) => {
  const authService = inject(AuthService);

  return authService.canActivate({
    scopes: [/read:confluence/, /write:confluence/],
    resources: [environment.CONFLUENCE_API_ENDPOINT],
  })(...args);
};
