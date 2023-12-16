import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {AuthModule} from "./auth/auth.module";
import {ConfluenceModule} from "./confluence/confluence.module";
import {TopbarComponent} from "./core/layout/topbar/topbar.component";
import {MenuComponent} from "./core/layout/menu/menu.component";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {AppFooterComponent} from "./core/layout/footer/footer.component";
import { HttpClientModule } from '@angular/common/http';
import { TranslocoRootModule } from './transloco-root.module';
import {WINDOW, windowProvider} from "@app/core/providers/window";
import {DOCUMENT} from "@angular/common";

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    AuthModule,
    ConfluenceModule,
    AppRoutingModule,
    TopbarComponent,
    MenuComponent,
    BrowserAnimationsModule,
    AppFooterComponent,
    TranslocoRootModule
  ],
  providers: [
    {
      provide: WINDOW,
      useFactory: windowProvider,
      deps: [DOCUMENT]
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
