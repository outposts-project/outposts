import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ConfluenceRoutingModule } from './confluence-rounting.module';
import { DocModule } from '@/tools/doc/doc.module';
import { ScrollTopModule } from 'primeng/scrolltop';
import { DataViewModule } from 'primeng/dataview';
import { TagModule } from 'primeng/tag';
import { ConfluenceService } from './confluence.service';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { FieldsetModule } from 'primeng/fieldset';
import { WorkspaceComponent } from './workspace/workspace.component';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ClipboardModule } from '@/tools/clipboard/clipboard.module';
import { QrcodeModule } from '@/tools/qrcode/qrcode.module';
import { SkeletonModule } from 'primeng/skeleton';
import { BreadcrumbModule } from 'primeng/breadcrumb';

@NgModule({
  declarations: [DashboardComponent, WorkspaceComponent],
  providers: [ConfluenceService],
  imports: [
    BreadcrumbModule,
    CommonModule,
    ConfluenceRoutingModule,
    DocModule,
    ScrollTopModule,
    DataViewModule,
    TagModule,
    ButtonModule,
    CardModule,
    AvatarModule,
    FieldsetModule,
    RouterModule,
    FormsModule,
    MonacoEditorModule,
    DialogModule,
    ReactiveFormsModule,
    InputTextModule,
    ClipboardModule,
    QrcodeModule,
    SkeletonModule,
    CheckboxModule
  ],
})
export class ConfluenceModule { }
