import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TopbarComponent } from './core/layout/topbar/topbar.component';
import { MenuComponent } from './core/layout/menu/menu.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppFooterComponent } from './core/layout/footer/footer.component';
import {
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { TranslocoRootModule } from './transloco-root.module';
import { WINDOW, windowProvider } from '@app/core/providers/window';
import { DOCUMENT } from '@angular/common';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { AuthModule } from './auth/auth.module';
import { MessageService } from 'primeng/api';
import { AppOverlayService } from '@app/core/servces/app-overlay.service';
import { ToastModule } from 'primeng/toast';
import { SpinnerComponent } from './core/layout/spinner/spinner.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    AuthModule,
    TopbarComponent,
    SpinnerComponent,
    MenuComponent,
    AppFooterComponent,
    TranslocoRootModule,
    MonacoEditorModule.forRoot(),
    ToastModule,
    SpinnerComponent,
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    {
      provide: WINDOW,
      useFactory: windowProvider,
      deps: [DOCUMENT],
    },
    MessageService,
    AppOverlayService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
