import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ConfluenceService } from '../confluence.service';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  take,
  catchError,
  EMPTY,
  combineLatestWith,
  shareReplay,
  tap,
} from 'rxjs';
import { ConfluenceDto } from '../bindings/ConfluenceDto';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { editor } from 'monaco-editor';
import { SubscribeSourceDto } from '../bindings/SubscribeSourceDto';
import { isEqual } from 'lodash-es';
import { MessageService } from 'primeng/api';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { RxwebValidators } from '@rxweb/reactive-form-validators';
import type { RecursiveNonNullable } from '@app/core/utils/type-assert';
import { format } from 'date-fns';
import { ProfileDto } from '../bindings/ProfileDto';
import { ClipboardService } from '@app/clipboard/clipboard.service';
import { QrcodeService } from '@app/qrcode/qrcode.service';

@Component({
  selector: 'confluence-workspace',
  template: `
    <div class="card flex-1 min-w-0">
      <p-fieldset [legend]="(confluenceName$ | async)!" class="flex-1 min-w-0">
        <div
          class="flex justify-content-between align-items-center surface-border border-y-1 mb-4 p-3 font-bold"
          style="background: #f9fafb;"
        >
          <div class="text-xl">Template</div>
          <div class="flex gap-2">
            <p-button label="Save" icon="pi pi-check" (click)="saveTmpl()" [outlined]="true"></p-button>
            <p-button
              label="Reset"
              icon="pi pi-times"
              (click)="resetTmpl()"
              [outlined]="true"
              styleClass="p-button-secondary"
            ></p-button>
          </div>
        </div>
        <div class="m-0 border-round surface-border border-1">
          <ngx-monaco-editor
            [options]="tmplEditorOptions"
            [(ngModel)]="tmpl"
            style="min-height: 200px; height: 50vh;"
          ></ngx-monaco-editor>
        </div>
        <p-dataView #dv [value]="subscribeSources" styleClass="mt-4" [emptyMessage]="' '">
          <ng-template pTemplate="header">
            <div class="flex justify-content-between align-items-center">
              <div class="text-xl">Subscribe Sources</div>
              <div class="flex gap-2">
                <p-button label="Sync" icon="pi pi-sync" (click)="syncConfluence()" [outlined]="true"></p-button>
              </div>
            </div>
          </ng-template>
          <ng-template pTemplate="list">
            <div class="flex flex-wrap mt-4 gap-4 align-items-stretch text-center">
              <p-card
                class="cursor-pointer confluence-subscribe-source-item h-full"
                (click)="openCreateSubscribeSourceDialog()"
              >
                <div>Import</div>
                <div class="flex align-items-center justify-content-center gap-1 mt-2">
                  <i class="pi pi-plus p-1"></i>
                </div>
              </p-card>
              @for (item of subscribeSources; track item.id) {
              <div class="flex flex-column align-items-center">
                <p-card class="confluence-subscribe-source-item h-full text-center relative">
                  <div>{{ item.name }}</div>
                  <div class="flex align-items-center justify-content-center gap-1 mt-2">
                    <i class="pi pi-eye p-1 cursor-pointer" (click)="openPreviewSubscribeSourceContentDialog(item)"></i>
                    <i class="pi pi-file-edit p-1 cursor-pointer" (click)="openUpdateSubscribeSourceDialog(item)"></i>
                    <i class="pi pi-times p-1 cursor-pointer" (click)="removeSubscribeSource(item.id)"></i>
                  </div>
                  <div
                    class="absolute border-circle"
                    [style]="{
                      background: item.content ? 'var(--green-400)' : 'var(--gray-400)',
                      height: '0.5em',
                      width: '0.5em',
                      right: '0.5em',
                      top: '0.5em'
                    }"
                  ></div>
                </p-card>
                <time class="mt-2"
                  >Updated at:<br />
                  {{ formatTime(item.updated_at, 'MM-dd HH:mm') }}</time
                >
              </div>
              }
            </div>
          </ng-template>
        </p-dataView>
        <p-dataView #dv [value]="subscribeSources" styleClass="mt-4" [emptyMessage]="' '">
          <ng-template pTemplate="header">
            <div class="flex justify-content-between align-items-center">
              <div class="text-xl">Profiles</div>
              <div class="flex align-items-center justify-content-center gap-1 mt-2">
                <p-button label="Mux" icon="pi pi-sliders-v" (click)="muxConfluence()" [outlined]="true"></p-button>
                <p-button
                  label="Preview"
                  icon="pi pi-eye"
                  (click)="openPreviewMuxContentDialog()"
                  [outlined]="true"
                ></p-button>
              </div>
            </div>
          </ng-template>
          <ng-template pTemplate="list">
            <div class="flex flex-wrap mt-4 gap-4 align-items-stretch text-center">
              <p-card class="cursor-pointer confluence-profile-item h-full" (click)="createProfile()">
                <div>New<br/>Profile</div>
                <div class="flex align-items-center justify-content-center gap-1 mt-2">
                  <i class="pi pi-plus p-1"></i>
                </div>
              </p-card>
              @for (item of profiles; track item.id) {
              <p-card class="confluence-profile-item h-full text-center relative">
                <time style="word-wrap: pre-wrap;">{{ formatTime(item.updated_at, 'MM-dd') }}<br />{{formatTime(item.updated_at, 'HH:mm')}}</time>
                <div class="flex align-items-center justify-content-center gap-1 mt-2">
                  <i class="pi pi-copy p-1 cursor-pointer" (click)="copyProfileUrl(item)"></i>
                  <i class="pi pi-times p-1 cursor-pointer" (click)="removeProfile(item.id)"></i>
                </div>
              </p-card>
              }
            </div>
          </ng-template>
        </p-dataView>
      </p-fieldset>
    </div>
    <p-toast [baseZIndex]="999"></p-toast>
    @if (subscribeSourceCreation) {
    <p-dialog
      header="New Subscribe Source"
      [visible]="true"
      (visibleChange)="cancelCreateSubscribeSourceDialog()"
      [modal]="true"
      [style]="{ width: '50vw' }"
      [draggable]="false"
      [resizable]="false"
      [baseZIndex]="100"
    >
      <form [formGroup]="subscribeSourceCreation.form" class="w-full flex flex-column" onsubmit="return false;">
        @for (item of subscribeSourceCreation.form.controls | keyvalue; track item.key) {
        <label
          style="text-transform: capitalize;"
          [ngClass]="{ 'mt-4': !$first }"
          for="subscribe-source-creation-{{ item.key }}"
          >{{ item.key }}</label
        >
        <input
          class="mt-2"
          [ngClass]="{ 'ng-invalid': item.value.invalid, 'ng-dirty': item.value.touched }"
          type="text"
          id="subscribe-source-creation-{{ item.key }}"
          pInputText
          [formControlName]="item.key"
          autocomplete="off"
        />
        }
        <div class="flex justify-content-end gap-2 mt-4">
          <p-button
            label="Cancel"
            icon="pi pi-times"
            [outlined]="true"
            (click)="cancelCreateSubscribeSourceDialog()"
          ></p-button>
          <p-button label="Create" icon="pi pi-check" (click)="acceptCreateSubscribeSourceDialog()"></p-button>
        </div>
      </form>
    </p-dialog>
    } @if (subscribeSourceUpdate) {
    <p-dialog
      header="Edit Subscribe Source"
      [visible]="true"
      (visibleChange)="cancelUpdateSubscribeSourceDialog()"
      [modal]="true"
      [style]="{ width: '50vw' }"
      [draggable]="false"
      [resizable]="false"
      [baseZIndex]="100"
    >
      <form [formGroup]="subscribeSourceUpdate.form" class="w-full flex flex-column" onsubmit="return false;">
        <label style="text-transform: capitalize;" for="subscribe-source-creation-id">id</label>
        <input
          class="mt-2"
          type="text"
          id="subscribe-source-creation-id"
          pInputText
          [value]="subscribeSourceUpdate.value.id"
          autocomplete="off"
          [disabled]="true"
        />
        @for (item of subscribeSourceUpdate.form.controls | keyvalue; track item.key) {
        <label style="text-transform: capitalize;" class="mt-4" for="subscribe-source-creation-{{ item.key }}">{{
          item.key
        }}</label>
        <input
          class="mt-2"
          [ngClass]="{ 'ng-invalid': item.value.invalid, 'ng-dirty': item.value.touched }"
          type="text"
          id="subscribe-source-creation-{{ item.key }}"
          pInputText
          [formControlName]="item.key"
          autocomplete="off"
        />
        }
        <div class="flex justify-content-end gap-2 mt-4">
          <p-button
            label="Cancel"
            icon="pi pi-times"
            [outlined]="true"
            (click)="cancelUpdateSubscribeSourceDialog()"
          ></p-button>
          <p-button label="Save" icon="pi pi-check" (click)="acceptUpdateSubscribeSourceDialog()"></p-button>
        </div>
      </form>
    </p-dialog>
    } @if (configContentPreview) {
    <p-dialog
      header="Preview Subscribe Source Content"
      [visible]="true"
      (visibleChange)="cancelPreviewSubscribeSourceContentDialog()"
      [modal]="true"
      [style]="{ width: '50vw' }"
      [draggable]="false"
      [resizable]="false"
      [baseZIndex]="100"
    >
      <ngx-monaco-editor
        [options]="tmplEditorOptions"
        [(ngModel)]="configContentPreview.content"
        [disabled]="true"
        style="min-height: 200px; height: 50vh;"
      ></ngx-monaco-editor>
    </p-dialog>
    } @if (urlPreview) {
      <p-dialog
      header="Preview Subscribe Source Content"
      [visible]="true"
      (visibleChange)="cancelUrlPreviewDialog()"
      [modal]="true"
      [style]="{ width: '50vw' }"
      [draggable]="false"
      [resizable]="false"
      [baseZIndex]="100"
    >
      <div class="flex flex-column">
        <a class="px-link" (click)="copyUrl(urlPreview.url)">{{urlPreview.url}}</a>
        @if (urlPreview.qrcodeDataUrl) {
          <img class="h-5" [src]="urlPreview.qrcodeDataUrl" alt="qrcode" class="mx-auto" />
        }
      </div>
    </p-dialog>
    }
  `,
  styles: `
    :host ::ng-deep {
      .confluence-subscribe-source-item {
        .p-card-content {
          padding: 0 1em;
        }
      }

      .confluence-profile-item {
        .p-card-content {
          padding: 0 1em;
        }
      }
    }

    .confluence-subscribe-source-item {
      p-button {
        right: 0;
        top: 0;
      }
    }
  `,
  providers: [MessageService],
})
export class WorkspaceComponent implements OnInit {
  protected readonly confluenceService = inject(ConfluenceService);
  protected readonly route = inject(ActivatedRoute);
  protected readonly destoryRef = inject(DestroyRef);
  protected readonly messageService = inject(MessageService);
  protected readonly fb = inject(FormBuilder);
  protected readonly confluenceId$ = this.route.params.pipe(
    map((params) => parseInt(params['id'])),
    distinctUntilChanged(),
    shareReplay(1)
  );
  protected readonly clipboardService = inject(ClipboardService);
  protected readonly tmplEditorOptions: editor.IStandaloneEditorConstructionOptions = {
    theme: 'vs',
    language: 'yaml',
  };
  protected readonly qrcodeService = inject(QrcodeService);

  confluence$ = new BehaviorSubject<ConfluenceDto | undefined>(undefined);
  confluenceName$ = this.confluence$.pipe(map((c) => `${c?.name ?? ''}`.toLocaleUpperCase()));
  tmpl = '';
  profiles: ProfileDto[] = [];
  subscribeSources: SubscribeSourceDto[] = [];
  subscribeSourceCreation?: {
    value: {
      confluence_id: number;
    };
    form: FormGroup<{
      url: FormControl<string | null>;
      name: FormControl<string | null>;
    }>;
  };
  subscribeSourceUpdate?: {
    value: {
      id: number;
    };
    form: FormGroup<{
      url: FormControl<string | null>;
      name: FormControl<string | null>;
    }>;
  };
  configContentPreview?: {
    content: string;
  };
  urlPreview?: {
    url: string
    qrcodeDataUrl?: string;
  }

  ngOnInit() {
    this.confluenceId$
      .pipe(
        switchMap((id) =>
          this.confluenceService.getConfluenceById(id).pipe(
            catchError((err) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: err?.message,
              });
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe(this.confluence$);

    this.confluence$
      .pipe(
        map((c) => c?.template ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe((tmpl) => (this.tmpl = tmpl));

    this.confluence$
      .pipe(
        map((c) => c?.subscribe_sources ?? []),
        distinctUntilChanged(isEqual),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe((ss) => (this.subscribeSources = ss));

    this.confluence$
      .pipe(
        map((c) => c?.profiles ?? ''),
        distinctUntilChanged(isEqual),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe((ps) => (this.profiles = ps));
  }

  saveTmpl() {
    this.confluence$
      .pipe(
        take(1),
        filter((c): c is ConfluenceDto => !!c),
        switchMap((c) =>
          this.confluenceService.updateConfluence(c.id, {
            template: this.tmpl,
          })
        ),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe({
        next: (c) => {
          this.confluence$.next(c);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Saved successfully',
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.message,
          });
        },
      });
  }

  resetTmpl() {
    this.tmpl = this.confluence$.getValue()?.template ?? '';
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Reset Success' });
  }

  openCreateSubscribeSourceDialog() {
    this.confluenceId$
      .pipe(
        tap((id) => {
          this.subscribeSourceCreation = {
            value: {
              confluence_id: id,
            },
            form: this.fb.group({
              url: ['', [Validators.required, RxwebValidators.url()]],
              name: ['', Validators.required],
            }),
          };
        }),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe();
  }

  cancelCreateSubscribeSourceDialog() {
    this.subscribeSourceCreation = undefined;
  }

  acceptCreateSubscribeSourceDialog() {
    const form = this.subscribeSourceCreation?.form;
    if (!this.subscribeSourceCreation || !form) {
      return;
    }
    form.markAllAsTouched();
    if (!form.valid) {
      return;
    }
    this.confluenceService
      .addSubscribeSource({
        ...this.subscribeSourceCreation.value,
        ...(form.value as RecursiveNonNullable<typeof form.value>),
      })
      .pipe(
        combineLatestWith(this.confluenceId$),
        switchMap(([_, id]) => this.confluenceService.getConfluenceById(id)),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe({
        next: (c) => {
          this.confluence$.next(c);
          this.subscribeSourceCreation = undefined;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Saved successfully',
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.message,
          });
        },
      });
  }

  openUpdateSubscribeSourceDialog(item: SubscribeSourceDto) {
    this.subscribeSourceUpdate = {
      value: {
        id: item.id,
      },
      form: this.fb.group({
        url: [item.url, [Validators.required, RxwebValidators.url()]],
        name: [item.name, Validators.required],
      }),
    };
  }

  cancelUpdateSubscribeSourceDialog() {
    this.subscribeSourceUpdate = undefined;
  }

  acceptUpdateSubscribeSourceDialog() {
    const form = this.subscribeSourceUpdate?.form;
    if (!this.subscribeSourceUpdate || !form) {
      return;
    }
    form.markAllAsTouched();
    if (!form.valid) {
      return;
    }
    this.confluenceService
      .updateSubscribeSource(this.subscribeSourceUpdate.value.id, form.value as RecursiveNonNullable<typeof form.value>)
      .pipe(
        combineLatestWith(this.confluenceId$),
        switchMap(([_, id]) => this.confluenceService.getConfluenceById(id)),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe({
        next: (c) => {
          this.confluence$.next(c);
          this.subscribeSourceUpdate = undefined;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Updated successfully',
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.message,
          });
        },
      });
  }

  removeSubscribeSource(id: number) {
    this.confluenceService
      .removeSubscribeSource(id)
      .pipe(
        combineLatestWith(this.confluenceId$),
        switchMap(([_, id]) => this.confluenceService.getConfluenceById(id)),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe({
        next: (c) => {
          this.confluence$.next(c);
          this.subscribeSourceCreation = undefined;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Remove successfully',
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.message,
          });
        },
      });
  }

  syncConfluence() {
    this.confluenceId$
      .pipe(
        take(1),
        switchMap((id) => this.confluenceService.syncConfluence(id)),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe({
        next: (c) => {
          this.confluence$.next(c);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sync successfully',
          });
        },
        error: (err) => {
          console.log('123');
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.message,
          });
        },
      });
  }

  openPreviewSubscribeSourceContentDialog(item: SubscribeSourceDto) {
    this.configContentPreview = item;
  }

  cancelPreviewSubscribeSourceContentDialog() {
    this.configContentPreview = undefined;
  }

  muxConfluence() {
    this.confluenceId$
      .pipe(
        take(1),
        switchMap((id) => this.confluenceService.muxConfluence(id)),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe({
        next: (c) => {
          this.confluence$.next(c);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Mux successfully',
          });
        },
        error: (err) => {
          console.log('123');
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.message,
          });
        },
      });
  }

  openPreviewMuxContentDialog() {
    this.configContentPreview = {
      content: this.confluence$.getValue()?.mux_content ?? '',
    };
  }

  cancelPreviewMuxContentDialog() {
    this.configContentPreview = undefined;
  }

  formatTime = format

  createProfile() {
    this.confluenceId$.pipe(
      take(1),
      switchMap(id => this.confluenceService.addProfile({ confluence_id: id })),
      combineLatestWith(this.confluenceId$),
      switchMap(([_, id]) => this.confluenceService.getConfluenceById(id)),
      takeUntilDestroyed(this.destoryRef)
    ).subscribe({
      next: (c) => {
        this.confluence$.next(c);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Remove successfully',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.message,
        });
      },
    });
  }

  removeProfile (id: number) {
    this.confluenceService.removeProfile(id)
      .pipe(
       combineLatestWith(this.confluenceId$),
        switchMap(([_, id]) => this.confluenceService.getConfluenceById(id)),
        takeUntilDestroyed(this.destoryRef)
      ).subscribe({
        next: (c) => {
          this.confluence$.next(c);
          this.subscribeSourceCreation = undefined;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Remove successfully',
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.message,
          });
        },
      });
  }

  async copyProfileUrl (item: ProfileDto) {
    const profileUrl = this.confluenceService.getProfileUrl(item.resource_token);
    const qrcodeDataUrl = await this.qrcodeService.toDataURL(profileUrl);
    this.urlPreview = {
      url: profileUrl,
      qrcodeDataUrl: qrcodeDataUrl
    };
    await this.copyUrl(profileUrl)
  }

  async copyUrl (url: string) {
    try {
      await this.clipboardService.copyText(url);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Copy successfully',
      });
    } catch (err: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: (<Error>err)?.message,
      });
    }
  }

  cancelUrlPreviewDialog () {
    this.urlPreview = undefined;
  }
}
