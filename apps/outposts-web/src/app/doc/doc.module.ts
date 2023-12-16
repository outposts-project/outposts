/// <reference types="@types/prismjs" />
import {inject, NgModule, PLATFORM_ID, SecurityContext} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {MarkdownModule, MARKED_OPTIONS} from 'ngx-markdown';
import {HttpClient, HttpClientModule} from "@angular/common/http";
import {DocComponent} from "./components/doc/doc.component";
import { gfmHeadingId } from 'marked-gfm-heading-id';
import {DocService} from "./services/doc.service";
import {SkeletonModule} from "primeng/skeleton";
import {StyleClassModule} from "primeng/styleclass";
import {ButtonModule} from "primeng/button";
import {MessageModule} from "primeng/message";
import {ToastModule} from "primeng/toast";
import {MessageService} from "primeng/api";
import {DocClipboardButtonComponent} from "@app/doc/components/clipboard-button/doc-clipboard-button.component";
import {DocTableOfContentsLoader} from "@app/doc/services/doc-table-of-contents-loader.service";
import {DocTableOfContentsScrollSpy} from "@app/doc/services/doc-table-of-contents-scroll-spy.service";
import {DocTableOfContentsComponent} from "@app/doc/components/table-of-contents/doc-table-of-contents.component";
import {RouterLink} from "@angular/router";
import {WINDOW} from "@app/core/providers/window";

@NgModule({
  providers: [
    DocService,
    MessageService,
    DocTableOfContentsLoader,
    DocTableOfContentsScrollSpy
  ],
  declarations: [
    DocComponent,
    DocClipboardButtonComponent,
    DocTableOfContentsComponent
  ],
  exports: [
    DocComponent,
    DocClipboardButtonComponent,
    DocTableOfContentsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    SkeletonModule,
    StyleClassModule,
    ButtonModule,
    MessageModule,
    ToastModule,
    RouterLink,
    MarkdownModule.forRoot({
      loader: HttpClient,
      sanitize: SecurityContext.NONE,
      markedExtensions: [gfmHeadingId()],
      markedOptions: {
        provide: MARKED_OPTIONS,
        useValue: {
          gfm: true,
        }
      }
    }),
  ]
})
export class DocModule {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly window: Window = inject(WINDOW);

  constructor() {
    if (
      isPlatformBrowser(this.platformId) && this?.window?.Prism?.plugins
    ) {
      const PrismPlugins = this?.window.Prism.plugins;
      if (PrismPlugins['autoloader']) {
        PrismPlugins['autoloader'].languages_path = '/assets/prismjs/components/';
      }
    }
  }
}
