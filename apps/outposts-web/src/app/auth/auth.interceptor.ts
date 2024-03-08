import { Injectable, Injector, inject } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, of, switchMap } from 'rxjs';
import { AUTH_RESOURCES } from './auth.defs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  protected injector = inject(Injector);

  get authService (): AuthService {
    return this.injector.get(AuthService)
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return of(AUTH_RESOURCES.find(r => req.url.startsWith(r)))
    .pipe(
      switchMap((matchResource) => matchResource ? this.authService.getResourceClaims([matchResource]) : of(null)),
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
