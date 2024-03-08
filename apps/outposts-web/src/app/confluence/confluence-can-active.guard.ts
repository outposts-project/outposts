import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '@app/auth/auth.service';
import { environment } from '@environments/environment';

export const canActiveConfluence: CanActivateFn = (...args) => {
  const authService = inject(AuthService);

  return authService.canActivate({
    resourceScopesMap: {
      [environment.CONFLUENCE_API_ENDPOINT]: [/read:confluence/, /write:confluence/]
    },
  })(...args);
};
