/// <reference types="@types/prismjs" />
import {NgModule, SecurityContext} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MarkdownModule, MARKED_OPTIONS} from 'ngx-markdown';
import {HttpClient, HttpClientModule} from "@angular/common/http";
import {DocComponent} from "./doc.component";
import { gfmHeadingId } from 'marked-gfm-heading-id';
import {isBrowser} from "@app/core/env";
import {DocService} from "./doc.service";
import {SkeletonModule} from "primeng/skeleton";
import {StyleClassModule} from "primeng/styleclass";
import {ButtonModule} from "primeng/button";
import {MessageModule} from "primeng/message";
import {ToastModule} from "primeng/toast";
import {MessageService} from "primeng/api";
import {DocClipboardButtonComponent} from "@app/doc/doc-clipboard-button.component";

@NgModule({
  providers: [
    DocService,
    MessageService
  ],
  declarations: [
    DocComponent,
    DocClipboardButtonComponent,
  ],
  exports: [
    DocComponent,
    DocClipboardButtonComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    SkeletonModule,
    StyleClassModule,
    ButtonModule,
    MessageModule,
    ToastModule,
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
  constructor() {
    if (
      isBrowser && window?.Prism?.plugins
    ) {
      const PrismPlugins = window.Prism.plugins;
      if (PrismPlugins['autoloader']) {
        PrismPlugins['autoloader'].languages_path = '/assets/prismjs/components/';
      }
    }
  }
}
