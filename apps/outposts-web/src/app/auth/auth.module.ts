import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AuthService } from './auth.service';
import { take } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthModule as AuthOidcClientModule, StsConfigLoader } from 'angular-auth-oidc-client';
import { authConfigFactory } from './auth.defs';

@NgModule({
  exports: [],
  declarations: [],
  providers: [
    AuthService,
    authInterceptor,
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (authService: AuthService) => {
        return () => {
          return authService.isAuthenticated$.pipe(
            take(1)
          )
        }
      },
      deps: [AuthService],
    }
  ],
  imports: [
    CommonModule,
    AuthOidcClientModule.forRoot({
      loader: {
        provide: StsConfigLoader,
        useFactory: authConfigFactory,
        deps: [DOCUMENT]
      }
    }),
  ],
})
export class AuthModule {}
