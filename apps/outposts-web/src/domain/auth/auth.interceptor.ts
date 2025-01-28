import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { AUTH_RESOURCE_CONFIGS } from './auth.defs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  protected readonly authService = inject(AuthService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return of(AUTH_RESOURCE_CONFIGS.find(r => req.url.startsWith(r.resource)))
      .pipe(
        switchMap((matchResource) => matchResource ? this.authService.getResourceToken(matchResource.resource) : of(null)),
        switchMap((resourceAccessToken) => {
          let authReq = req;
          if (resourceAccessToken) {
            authReq = req.clone({
              setHeaders: { 'Authorization': `Bearer ${resourceAccessToken}` }
            })
          }
          return next.handle(authReq);
        })
      )
  }
}

export const authInterceptor = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true
};
