import { MessageService, type Message } from 'primeng/api';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { withSuspense } from '@app/rx';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable()
export class AppOverlayService {
  protected readonly destoryRef = inject(DestroyRef);
  protected readonly messageService = inject(MessageService);
  readonly error$$ = new Subject<any>();
  readonly loading$$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.error$$.pipe(takeUntilDestroyed(this.destoryRef)).subscribe((err) => {
      const detail = err?.error?.error_msg;
      console.error(err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `${err?.message}${detail ? ` : ${detail}` : ''}`,
        life: 5000
      });
    });
  }

  withSuspense = <T>(source$: Observable<T>) =>
    withSuspense(source$, {
      error$$: this.error$$,
      loading$$: this.loading$$,
    });

  toast(message: Message) {
    this.messageService.add(message);
  }
}
