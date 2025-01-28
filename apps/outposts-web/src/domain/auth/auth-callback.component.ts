import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { AppOverlayService } from '@/core/servces/app-overlay.service';
import { AuthService } from './auth.service';

@Component({
  selector: 'auth-callback',
  template: ``,
  providers: [],
})
export class AuthCallbackComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly destoryRef = inject(DestroyRef);
  protected readonly overlayService = inject(AppOverlayService);

  ngOnInit() { }
}
