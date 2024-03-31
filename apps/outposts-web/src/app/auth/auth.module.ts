import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth.service';
import { take } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthRoutingModule } from './auth-routing.module';

@NgModule({
  declarations: [],
  providers: [
    AuthService,
    authInterceptor,
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (authService: AuthService) => {
        return () => {
          authService.isLoading = true;
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
    AuthRoutingModule
  ],
})
export class AuthModule {}
