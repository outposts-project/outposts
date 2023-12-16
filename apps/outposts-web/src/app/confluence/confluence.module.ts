import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DashboardComponent} from "./dashboard/dashboard.component";
import {ConfluenceRoutingModule} from "./confluence-rounting.module";
import {DocModule} from "@app/doc/doc.module";

@NgModule({
  declarations: [
    DashboardComponent,
  ],
  imports: [
    CommonModule,
    ConfluenceRoutingModule,
    DocModule
  ]
})
export class ConfluenceModule { }
