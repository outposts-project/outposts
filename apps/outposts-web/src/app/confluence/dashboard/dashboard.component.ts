import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ConfluenceService } from '../confluence.service';
import { switchMap } from 'rxjs';
import { ConfluenceDto } from '../bindings/ConfluenceDto';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppOverlayService } from '@app/core/servces/app-overlay.service';

@Component({
  selector: 'confluence-dashboard',
  template: `
    <p-dataView #dv [value]="confluences">
      <ng-template pTemplate="header">
        <div class="flex justify-content-between align-items-center">
          <div class="text-2xl flex align-items-center h-100">Confluence</div>
          <p-button
            label="Add"
            (click)="addConfluence()"
            icon="pi pi-plus"
            [outlined]="true"
          />
        </div>
      </ng-template>
      <ng-template let-confluence pTemplate="list">
        @for (item of confluences; track $index) {
        <div
          class="flex flex-row align-items-start p-4 gap-4"
          [ngClass]="{ 'border-top-1 surface-border': !$first }"
        >
          <p-avatar
            [label]="item.name.slice(0, 1).toUpperCase()"
            styleClass="mr-1"
            size="xlarge"
          ></p-avatar>
          <div
            class="flex justify-content-between align-items-center flex-1 gap-4"
          >
            <div
              class="flex flex-column align-items-start gap-2"
            >
              <div class="text-2xl font-bold text-900">{{ item.name }}</div>
              <div class="flex align-items-center gap-3">
                <span class="flex align-items-center gap-2">
                  <i class="pi pi-user-edit"></i>
                  <span class="font-semibold">{{ item.creator }}</span>
                </span>
                <p-tag
                  [value]="getSeverityText(item)"
                  [severity]="getSeverity(item)"
                  [style]="{
                    background:
                      getSeverityText(item) === 'active'
                        ? 'var(--blue-500)'
                        : 'var(--gray-500)'
                  }"
                ></p-tag>
              </div>
            </div>
            <div class="flex align-items-center justify-content-center gap-1">
              <a
                [routerLink]="['/confluence/workspace', item.id]"
                rel="noopener noreferrer"
                class="p-button p-button-rounded p-button-icon-only p-ripple p-button-outlined"
              >
                <i class="pi pi-file-edit"></i>
              </a>
              <p-button
                icon="pi pi-trash"
                [outlined]="true"
                [rounded]="true"
                (click)="removeConfluence(item.id)"
              ></p-button>
            </div>
          </div>
        </div>
        }
      </ng-template>
      <ng-template pTemplate="empty">
        @if (overlayService.loading$$ | async) {
        <div class="p-3">
          <p-skeleton styleClass="mb-2"></p-skeleton>
          <p-skeleton width="10rem" styleClass="mb-2"></p-skeleton>
          <p-skeleton width="5rem" styleClass="mb-2"></p-skeleton>
          <p-skeleton height="2rem" styleClass="mb-2"></p-skeleton>
        </div>
        }
      </ng-template>
    </p-dataView>
  `,
  providers: [],
})
export class DashboardComponent implements OnInit {
  protected readonly confluenceService = inject(ConfluenceService);
  protected readonly destoryRef = inject(DestroyRef);
  protected readonly overlayService = inject(AppOverlayService);

  confluences: ConfluenceDto[] = [];

  ngOnInit() {
    this.overlayService
      .withSuspense(this.confluenceService.getAllConfluences())
      .pipe(takeUntilDestroyed(this.destoryRef))
      .subscribe((data) => {
        this.confluences = data;
      });
  }

  async addConfluence() {
    this.overlayService
      .withSuspense(
        this.confluenceService.addConfluence().pipe(
          switchMap(() => this.confluenceService.getAllConfluences()),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluences = c;
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Create successfully',
        });
      });
  }

  getSeverityText(item: ConfluenceDto): string {
    if (item.mux_content && item.profiles.length) {
      return 'active';
    }
    return 'not active';
  }

  getSeverity(_item: ConfluenceDto) {
    return 'info';
  }

  removeConfluence(id: number) {
    this.overlayService
      .withSuspense(
        this.confluenceService.removeConfluence(id).pipe(
          switchMap(() => this.confluenceService.getAllConfluences()),
          takeUntilDestroyed(this.destoryRef)
        )
      )
      .subscribe((c) => {
        this.confluences = c;
        this.overlayService.toast({
          severity: 'success',
          summary: 'Success',
          detail: 'Remove successfully',
        });
      });
  }
}
