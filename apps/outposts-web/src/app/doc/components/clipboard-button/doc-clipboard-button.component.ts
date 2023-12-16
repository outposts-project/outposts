import {Component, DestroyRef, inject} from '@angular/core';
import {MessageService} from "primeng/api";
import {TranslocoService} from "@ngneat/transloco";
import {take} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

@Component({
  selector: 'app-doc-clipboard-button',
  template: `
      <p-toast></p-toast>
      <p-button icon="pi pi-copy" severity="secondary" (click)="onClick()"></p-button>
  `,
})
export class DocClipboardButtonComponent {
  private readonly messageService = inject(MessageService);
  private readonly t = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  onClick() {
    this.t.selectTranslateObject<{ title: string, detail: string }>('doc.clipboard_copied_toast')
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(
      (translation) => {
        this.messageService.add({
          severity: 'success', summary: translation.title, detail: translation.detail
        });
      }
    )
  }
}
