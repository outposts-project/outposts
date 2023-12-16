import {Component} from '@angular/core';
import {MessageService} from "primeng/api";
import {TranslocoService} from "@ngneat/transloco";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";
import {take} from "rxjs/operators";

@UntilDestroy()
@Component({
  selector: 'app-doc-clipboard-button',
  template: `
      <p-toast></p-toast>
      <p-button icon="pi pi-copy" severity="secondary" (click)="onClick()"></p-button>
  `,
})
export class DocClipboardButtonComponent {
  constructor(
    private messageService: MessageService,
    private t: TranslocoService
  ) {
  }

  onClick() {
    this.t.selectTranslateObject<{ title: string, detail: string }>('doc.clipboard_copied_toast')
      .pipe(
        take(1),
        untilDestroyed(this)
      ).subscribe(
      (translation) => {
        this.messageService.add({
          severity: 'success', summary: translation.title, detail: translation.detail
        });
      }
    )
  }
}
