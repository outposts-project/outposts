import {
  provideTransloco,
  TranslocoModule
} from '@ngneat/transloco';
import {NgModule} from '@angular/core';
import {TranslocoConfig} from "@app/transloco-config";

@NgModule({
  exports: [TranslocoModule],
  providers: [
    provideTransloco(TranslocoConfig),
  ],
})
export class TranslocoRootModule {
}
