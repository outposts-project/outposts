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
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { editor } from 'monaco-editor';
import type { ConfluenceDto } from '../bindings/ConfluenceDto';
import type { SubscribeSourceDto } from '../bindings/SubscribeSourceDto';
import type { ProfileDto } from '../bindings/ProfileDto';
import type { SubscribeSourceUpdateDto } from '../bindings/SubscribeSourceUpdateDto';
import { isEqual } from 'lodash-es';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { RxwebValidators } from '@rxweb/reactive-form-validators';
import type { RecursiveNonNullable } from '@app/core/utils/type-assert';
import { format } from 'date-fns';
import { ClipboardService } from '@app/clipboard/clipboard.service';
import { QrcodeService } from '@app/qrcode/qrcode.service';
import { AppOverlayService } from '@app/core/servces/app-overlay.service';
import { hourPlusLevelCronExprValidator } from '../validators/cron-expr.validators';

@Component({
  selector: 'confluence-workspace',
  template: `
    <p-breadcrumb 
      class="max-w-full" [model]="breadcrumb.items" [home]="breadcrumb.home"></p-breadcrumb>
    <div class="card flex-1 min-w-0 mt-2">
      <p-fieldset class="flex-1 min-w-0">
        <ng-template pTemplate="header">
          <div class="flex align-items-center gap-2 px-2" style="cursor: pointer;" (click)="openUpdateNameDialog()">
              <span class="font-bold">{{(confluenceName$ | async)!}}</span>
          </div>
        </ng-template>
        <div
          class="flex justify-content-between align-items-center surface-border border-y-1 mb-4 p-3 font-bold"
          style="background: #f9fafb;"
        >
          <div class="text-xl">Template</div>
          <div class="flex gap-2">
            <p-button
              size="small"
              label="Save"
              icon="pi pi-check"
              (click)="saveTmpl()"
              [outlined]="true"
            ></p-button>
            <p-button
              size="small"
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
        <p-dataView
          #dv
          [value]="subscribeSources"
          styleClass="mt-4"
          [emptyMessage]="' '"
        >
          <ng-template pTemplate="header">
            <div class="flex justify-content-between align-items-center">
              <div class="text-xl">Subscribe Sources</div>
              <div class="flex gap-2">
                <p-button
                  size="small"
                  label="Sync"
                  icon="pi pi-sync"
                  (click)="syncConfluence()"
                  [outlined]="true"
                ></p-button>
              </div>
            </div>
          </ng-template>
          <ng-template pTemplate="list">
            <div
              class="flex flex-wrap mt-4 gap-4 align-items-stretch text-center"
            >
              <p-card
                class="cursor-pointer confluence-subscribe-source-item h-full"
                (click)="openCreateSubscribeSourceDialog()"
              >
                <div>Import</div>
                <div
                  class="flex align-items-center justify-content-center gap-1 mt-2"
                >
                  <i class="pi pi-plus p-1"></i>
                </div>
              </p-card>
              @for (item of subscribeSources; track item.id) {
              <div class="flex flex-column align-items-center">
                <p-card
                  class="confluence-subscribe-source-item h-full text-center relative"
                >
                  <div>{{ item.name }}</div>
                  <div
                    class="flex align-items-center justify-content-center gap-1 mt-2"
                  >
                    <i
                      class="pi pi-eye p-1 cursor-pointer"
                      (click)="openPreviewSubscribeSourceContentDialog(item)"
                    ></i>
                    <i
                      class="pi pi-file-edit p-1 cursor-pointer"
                      (click)="openUpdateSubscribeSourceDialog(item)"
                    ></i>
                    <i
                      class="pi pi-times p-1 cursor-pointer"
                      (click)="removeSubscribeSource(item.id)"
                    ></i>
                  </div>
                  <div
                    class="absolute border-circle"
                    [style]="{
                      background: item.content
                        ? 'var(--green-400)'
                        : 'var(--gray-400)',
                      height: '0.5em',
                      width: '0.5em',
                      right: '0.5em',
                      top: '0.5em'
                    }"
                  ></div>
                </p-card>
                <time class="mt-2">
                  Updated at:
                  <br />
                  {{ formatTime(item.updated_at, 'MM-dd HH:mm') }}
                </time>
              </div>
              }
            </div>
          </ng-template>
        </p-dataView>
        <p-dataView
          #dv
          [value]="subscribeSources"
          styleClass="mt-4"
          [emptyMessage]="' '"
        >
          <ng-template pTemplate="header">
            <div class="flex justify-content-between align-items-center">
              <div class="text-xl">Profiles</div>
              <div
                class="flex align-items-center justify-content-center gap-1 mt-2"
              >
                <p-button
                  size="small"
                  label="Mux"
                  icon="pi pi-sliders-v"
                  (click)="muxConfluence()"
                  [outlined]="true"
                ></p-button>
                <p-button
                  size="small"
                  label="Preview"
                  icon="pi pi-eye"
                  (click)="openPreviewMuxContentDialog()"
                  [outlined]="true"
                ></p-button>
              </div>
            </div>
          </ng-template>
          <ng-template pTemplate="list">
            <div
              class="flex flex-wrap mt-4 gap-4 align-items-stretch text-center"
            >
              <p-card
                class="cursor-pointer confluence-profile-item h-full"
                (click)="createProfile()"
              >
                <div>
                  New
                  <br />
                  Profile
                </div>
                <div
                  class="flex align-items-center justify-content-center gap-1 mt-2"
                >
                  <i class="pi pi-plus p-1"></i>
                </div>
              </p-card>
              @for (item of profiles; track item.id) {
              <p-card
                class="confluence-profile-item h-full text-center relative"
              >
                <time style="word-wrap: pre-wrap;">
                  {{ formatTime(item.updated_at, 'MM-dd') }}
                  <br />
                  {{ formatTime(item.updated_at, 'HH:mm') }}
                </time>
                <div
                  class="flex align-items-center justify-content-center gap-1 mt-2"
                >
                  <i
                    class="pi pi-copy p-1 cursor-pointer"
                    (click)="copyProfileUrl(item)"
                  ></i>
                  <i
                    class="pi pi-times p-1 cursor-pointer"
                    (click)="removeProfile(item.id)"
                  ></i>
                </div>
              </p-card>
              }
            </div>
          </ng-template>
        </p-dataView>
        <div
          class="flex justify-content-between align-items-center surface-border border-y-1 mt-4 mb-4 p-3 font-bold"
          style="background: #f9fafb;"
        >
          <div class="text-xl">Sync Schedule</div>
          <div class="flex gap-2">
            <p-button
            size="small"
              label="Save"
              icon="pi pi-check"
              (click)="saveCron()"
              [outlined]="true"
            ></p-button>
          </div>
        </div>
        <div class="m-0">
          <form
            [formGroup]="cronUpdateForm"
            class="w-full flex flex-column"
            onsubmit="return false;"
          >
            <input
              [ngClass]="{
                'ng-invalid': cronUpdateForm.controls.cronExpr.invalid,
                'ng-dirty': cronUpdateForm.controls.cronExpr.touched
              }"
              type="text"
              id="cron-update-cron-expr"
              pInputText
              formControlName="cronExpr"
              autocomplete="off"
            />
            <small
              class="mt-2"
              [ngClass]="{
                'text-red-500':
                  cronUpdateForm.controls.cronExpr.touched &&
                  cronUpdateForm.controls.cronExpr.invalid
              }"
            >
              @if (cronUpdateForm.controls.cronExpr.touched &&
              cronUpdateForm.controls.cronExpr.invalid &&
              !cronUpdateForm.controls.cronExpr.errors?.['emptyCronExpr']) {
              <span style="text-transform: capitalize;">
                {{ cronUpdateForm.controls.cronExpr.errors?.['message'] || '123' }}
              </span>
              } @else { Support unix style cron expr, min unit hour, such as
              <code>0 0 8 * * *</code>
              }
            </small>
          </form>
        </div>
        <div
          class="flex justify-content-between align-items-center surface-border border-y-1 mt-4 mb-4 p-3 font-bold"
          style="background: #f9fafb;"
        >
          <div class="text-xl">Sync User-Agent</div>
          <div class="flex gap-2">
            <p-button
            size="small"
              label="Save"
              icon="pi pi-check"
              (click)="saveUA()"
              [outlined]="true"
            ></p-button>
          </div>
        </div>
        <div class="m-0">
          <form
            [formGroup]="uaUpdateForm"
            class="w-full flex flex-column"
            onsubmit="return false;"
          >
            <input
              [ngClass]="{
                'ng-invalid': uaUpdateForm.controls.userAgent.invalid,
                'ng-dirty': uaUpdateForm.controls.userAgent.touched
              }"
              type="text"
              id="ua-update-user-agent"
              pInputText
              formControlName="userAgent"
              autocomplete="off"
              placeholder="clash-verge/v1.5.11"
            />
          </form>
        </div>
      </p-fieldset>
    </div>
    @if (subscribeSourceCreation) {
    <p-dialog
      header="New Subscribe Source"
      [visible]="true"
      (visibleChange)="cancelCreateSubscribeSourceDialog()"
      [modal]="true"
      [style]="{ width: '50vw', minWidth: '300px' }"
      [draggable]="false"
      [resizable]="false"
      [baseZIndex]="100"
    >
      <form
        [formGroup]="subscribeSourceCreation.form"
        class="w-full flex flex-column"
        onsubmit="return false;"
      >
        @for (item of subscribeSourceCreation.form.controls | keyvalue; track
        item.key) {
        <label
          style="text-transform: capitalize;"
          [ngClass]="{ 'mt-4': !$first }"
          for="subscribe-source-creation-{{ item.key }}"
        >
          {{ item.key }}
        </label>
        <input
          class="mt-2"
          [ngClass]="{
            'ng-invalid': item.value.invalid,
            'ng-dirty': item.value.touched
          }"
          type="text"
          id="subscribe-source-creation-{{ item.key }}"
          pInputText
          [formControlName]="item.key"
          autocomplete="off"
        />
        }
        <div class="flex justify-content-end gap-2 mt-4">
          <p-button
          size="small"
            label="Cancel"
            icon="pi pi-times"
            [outlined]="true"
            (click)="cancelCreateSubscribeSourceDialog()"
          ></p-button>
          <p-button
          size="small"
            label="Create"
            icon="pi pi-check"
            (click)="acceptCreateSubscribeSourceDialog()"
          ></p-button>
        </div>
      </form>
    </p-dialog>
    } 
    @if (nameUpdateDialog) {
    <p-dialog
      header="Rename"
      [visible]="true"
      (visibleChange)="cancelUpdateNameDialog()"
      [modal]="true"
      [style]="{ width: '50vw', minWidth: '300px' }"
      [draggable]="false"
      [resizable]="false"
      [baseZIndex]="100"
    >
      <form
        [formGroup]="nameUpdateDialog.form"
        class="w-full flex flex-column"
        onsubmit="return false;"
      >
        @for (item of nameUpdateDialog.form.controls | keyvalue; track
        item.key) {
        <label
          style="text-transform: capitalize;"
          [ngClass]="{ 'mt-4': !$first }"
          for="update-name-{{ item.key }}"
        >
          {{ item.key }}
        </label>
        <input
          class="mt-2"
          [ngClass]="{
            'ng-invalid': item.value.invalid,
            'ng-dirty': item.value.touched
          }"
          type="text"
          id="update-name-{{ item.key }}"
          pInputText
          [formControlName]="item.key"
          autocomplete="off"
        />
        }
        <div class="flex justify-content-end gap-2 mt-4">
          <p-button
          size="small"
            label="Cancel"
            icon="pi pi-times"
            [outlined]="true"
            (click)="cancelUpdateNameDialog()"
          ></p-button>
          <p-button
          size="small"
            label="Save"
            icon="pi pi-check"
            (click)="acceptUpdateNameDialog()"
          ></p-button>
        </div>
      </form>
    </p-dialog>
    }
    @if (subscribeSourceUpdate) {
    <p-dialog
      header="Edit Subscribe Source"
      [visible]="true"
      (visibleChange)="cancelUpdateSubscribeSourceDialog()"
      [modal]="true"
      [style]="{ width: '50vw', minWidth: '300px' }"
      [draggable]="false"
      [resizable]="false"
      [baseZIndex]="100"
    >
      <form
        [formGroup]="subscribeSourceUpdate.form"
        class="w-full flex flex-column"
        onsubmit="return false;"
      >
        <label
          style="text-transform: capitalize;"
          for="subscribe-source-creation-id"
        >
          id
        </label>
        <input
          class="mt-2"
          type="text"
          id="subscribe-source-creation-id"
          pInputText
          [value]="subscribeSourceUpdate.value.id"
          autocomplete="off"
          [disabled]="true"
        />
        @for (item of subscribeSourceUpdate.form.controls | keyvalue; track
        item.key) {
        <label
          style="text-transform: capitalize;"
          class="mt-4"
          for="subscribe-source-creation-{{ item.key }}"
        >
          {{ item.key }}
        </label>
        <input
          class="mt-2"
          [ngClass]="{
            'ng-invalid': item.value.invalid,
            'ng-dirty': item.value.touched
          }"
          type="text"
          id="subscribe-source-creation-{{ item.key }}"
          pInputText
          [formControlName]="item.key"
          autocomplete="off"
        />
        }
        <div class="flex justify-content-end gap-2 mt-4">
          <p-button
          size="small"
            label="Cancel"
            icon="pi pi-times"
            [outlined]="true"
            (click)="cancelUpdateSubscribeSourceDialog()"
          ></p-button>
          <p-button
          size="small"
            label="Save"
            icon="pi pi-check"
            (click)="acceptUpdateSubscribeSourceDialog()"
          ></p-button>
        </div>
      </form>
    </p-dialog>
    } @if (configContentPreview) {
    <p-dialog
      header="Preview Subscribe Source Content"
      [visible]="true"
      (visibleChange)="cancelPreviewSubscribeSourceContentDialog()"
      [modal]="true"
      [style]="{ width: '50vw', minWidth: '300px' }"
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
      header="Preview Profile Content"
      [visible]="true"
      (visibleChange)="cancelUrlPreviewDialog()"
      [modal]="true"
      [style]="{ width: '50vw', minWidth: '300px' }"
      [draggable]="false"
      [resizable]="false"
      [baseZIndex]="100"
    >
      <div class="flex flex-column">
        <a class="px-link profile-url" (click)="copyUrl(urlPreview.url)">
          {{ urlPreview.url }}
        </a>
        @if (urlPreview.qrcodeDataUrl) {
        <img
          class="h-5"
          [src]="urlPreview.qrcodeDataUrl"
          alt="qrcode"
          class="mx-auto"
        />
        }
      </div>
    </p-dialog>
    }
  `,
  styles: `
    :host ::ng-deep {
      .p-breadcrumb {
        background-color: transparent;
        border: none;
      }

      .confluence-subscribe-source-item {
        min-width: 9em;

        .p-card-content {
          padding: 0;
        }
      }

      .confluence-profile-item {
        min-width: 9em;

        .p-card-content {
          padding: 0;
        }
      }
    }

    .confluence-subscribe-source-item {
      p-button {
        right: 0;
        top: 0;
      }
    }

    .profile-url {
      margin-top: 0.5rem;
      word-break: break-all;
    }
  `
})
export class WorkspaceComponent implements OnInit {
  protected readonly confluenceService = inject(ConfluenceService);
  protected readonly route = inject(ActivatedRoute);
  protected readonly destoryRef = inject(DestroyRef);
  protected readonly overlayService = inject(AppOverlayService);
  protected readonly fb = inject(FormBuilder);
  protected readonly confluenceId$ = this.route.params.pipe(
    map((params) => parseInt(params['id'])),
    distinctUntilChanged(),
    shareReplay(1)
  );
  protected readonly clipboardService = inject(ClipboardService);
  protected readonly tmplEditorOptions: editor.IStandaloneEditorConstructionOptions =
    {
      theme: 'vs',
      language: 'yaml',
    };
  protected readonly qrcodeService = inject(QrcodeService);

  confluence$ = new BehaviorSubject<ConfluenceDto | undefined>(undefined);
  confluenceName$ = this.confluence$.pipe(
    map((c) => `${c?.name ?? ''}`.toLocaleUpperCase())
  );
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
    url: string;
    qrcodeDataUrl?: string;
  };
  cronUpdateForm = this.fb.group({
    cronExpr: this.fb.control('', [hourPlusLevelCronExprValidator]),
  });
  uaUpdateForm = this.fb.group({
    userAgent: this.fb.control('', []),
  });
  nameUpdateDialog?: {
    form: FormGroup<{
      name: FormControl<string | null>;
    }>;
  };

  breadcrumb = {
    items: [{ label: 'Confluence', routerLink: ['/confluence'] }, { label: 'Workspace' }],
    home: { icon: 'pi pi-home', routerLink: '/' }
  }

  ngOnInit() {
    this.confluenceId$
      .pipe(
        switchMap((id) =>
          this.overlayService
            .withSuspense(this.confluenceService.getConfluenceById(id))
            .pipe(catchError((_) => EMPTY))
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

    this.confluence$
      .pipe(
        map((c) => c?.cron_expr ?? ''),
        distinctUntilChanged(),
        filter((v) => v !== this.cronUpdateForm.value.cronExpr),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe((expr) => {
        this.cronUpdateForm.patchValue({
          cronExpr: expr,
        });
      });

    this.confluence$
      .pipe(
        map((c) => c?.user_agent ?? ''),
        distinctUntilChanged(),
        filter((v) => v !== this.uaUpdateForm.value.userAgent),
        takeUntilDestroyed(this.destoryRef)
      )
      .subscribe((ua) => {
        this.uaUpdateForm.patchValue({
          userAgent: ua,
        });
      });
  }

  openUpdateNameDialog() {
    this.nameUpdateDialog = {
      form: this.fb.group({
        name: this.fb.control(this.confluence$.getValue()?.name ?? '', [Validators.required])
      })
    }
  }

  acceptUpdateNameDialog() {
    const form = this.nameUpdateDialog?.form;
    if (!this.nameUpdateDialog || !form) {
      return;
    }
    form.markAllAsTouched();
    if (!form.valid) {
      return;
    }
    this.overlayService
      .withSuspense(
        this.confluence$.pipe(
          take(1),
          filter((c): c is ConfluenceDto => !!c),
          switchMap((c) =>
            this.confluenceService.updateConfluence(c.id, {
              name: form.value.name ?? undefined
            })
          ),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Saved successfully',
        });
      });
  }

  cancelUpdateNameDialog() {
    this.nameUpdateDialog = undefined;
  }

  saveTmpl() {
    this.overlayService
      .withSuspense(
        this.confluence$.pipe(
          take(1),
          filter((c): c is ConfluenceDto => !!c),
          switchMap((c) =>
            this.confluenceService.updateConfluence(c.id, {
              template: this.tmpl,
            })
          ),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Saved successfully',
        });
      });
  }

  resetTmpl() {
    this.tmpl = this.confluence$.getValue()?.template ?? '';
    this.overlayService.toast({
      severity: 'success',
      summary: 'Success',
      detail: 'Reset Success',
    });
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
    this.overlayService
      .withSuspense(
        this.confluenceService
          .addSubscribeSource({
            ...this.subscribeSourceCreation.value,
            ...(form.value as RecursiveNonNullable<typeof form.value>),
          })
          .pipe(
            combineLatestWith(this.confluenceId$),
            switchMap(([_, id]) =>
              this.confluenceService.getConfluenceById(id)
            ),
            takeUntilDestroyed(this.destoryRef)
          )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.subscribeSourceCreation = undefined;
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Saved successfully',
        });
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
    this.overlayService
      .withSuspense(
        this.confluenceService
          .updateSubscribeSource(
            this.subscribeSourceUpdate.value.id,
            form.value as RecursiveNonNullable<SubscribeSourceUpdateDto>
          )
          .pipe(
            combineLatestWith(this.confluenceId$),
            switchMap(([_, id]) =>
              this.confluenceService.getConfluenceById(id)
            ),
            takeUntilDestroyed(this.destoryRef)
          )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.subscribeSourceUpdate = undefined;
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Updated successfully',
        });
      });
  }

  removeSubscribeSource(id: number) {
    this.overlayService
      .withSuspense(
        this.confluenceService.removeSubscribeSource(id).pipe(
          combineLatestWith(this.confluenceId$),
          switchMap(([_, id]) => this.confluenceService.getConfluenceById(id)),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.subscribeSourceCreation = undefined;
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Remove successfully',
        });
      });
  }

  syncConfluence() {
    this.overlayService
      .withSuspense(
        this.confluenceId$.pipe(
          take(1),
          switchMap((id) => this.confluenceService.syncConfluence(id)),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Sync successfully',
        });
      });
  }

  openPreviewSubscribeSourceContentDialog(item: SubscribeSourceDto) {
    this.configContentPreview = item;
  }

  cancelPreviewSubscribeSourceContentDialog() {
    this.configContentPreview = undefined;
  }

  muxConfluence() {
    this.overlayService
      .withSuspense(
        this.confluenceId$.pipe(
          take(1),
          switchMap((id) => this.confluenceService.muxConfluence(id)),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Mux successfully',
        });
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

  formatTime = format;

  createProfile() {
    this.overlayService
      .withSuspense(
        this.confluenceId$.pipe(
          take(1),
          switchMap((id) =>
            this.confluenceService.addProfile({ confluence_id: id })
          ),
          combineLatestWith(this.confluenceId$),
          switchMap(([_, id]) => this.confluenceService.getConfluenceById(id)),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Remove successfully',
        });
      });
  }

  removeProfile(id: number) {
    this.overlayService
      .withSuspense(
        this.confluenceService.removeProfile(id).pipe(
          combineLatestWith(this.confluenceId$),
          switchMap(([_, id]) => this.confluenceService.getConfluenceById(id)),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.subscribeSourceCreation = undefined;
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Remove successfully',
        });
      });
  }

  saveCron() {
    const form = this.cronUpdateForm;
    form.markAllAsTouched();
    if (!form.valid) {
      return;
    }
    this.overlayService
      .withSuspense(
        this.confluenceId$.pipe(
          take(1),
          switchMap((id) =>
            this.confluenceService
              .updateConfluenceCron(id, {
                cron_expr: form.value.cronExpr as Exclude<
                  typeof form.value.cronExpr,
                  null | undefined
                >,
                cron_expr_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })
              .pipe(map(() => id))
          ),
          switchMap((id) => this.confluenceService.getConfluenceById(id)),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Saved successfully',
        });
      });
  }

  saveUA() {
    const form = this.uaUpdateForm;
    form.markAllAsTouched();
    if (!form.valid) {
      return;
    }
    this.overlayService
      .withSuspense(
        this.confluenceId$.pipe(
          take(1),
          switchMap((id) =>
            this.confluenceService.updateConfluence(id, {
              user_agent: form.value.userAgent as Exclude<
                typeof form.value.userAgent,
                null | undefined
              >,
            })
          ),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluence$.next(c);
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Saved successfully',
        });
      });
  }

  async copyProfileUrl(item: ProfileDto) {
    const profileUrl = this.confluenceService.getProfileUrl(
      item.resource_token
    );
    const qrcodeDataUrl = await this.qrcodeService.toDataURL(profileUrl);
    this.urlPreview = {
      url: profileUrl,
      qrcodeDataUrl: qrcodeDataUrl,
    };
    await this.copyUrl(profileUrl);
  }

  async copyUrl(url: string) {
    try {
      await this.clipboardService.copyText(url);
      this.overlayService.toast({
        severity: 'success',
        summary: 'Success',
        detail: 'Copy successfully',
      });
    } catch (err: unknown) {
      this.overlayService.toast({
        severity: 'error',
        summary: 'Error',
        detail: (<Error>err)?.message,
      });
    }
  }

  cancelUrlPreviewDialog() {
    this.urlPreview = undefined;
  }
}
