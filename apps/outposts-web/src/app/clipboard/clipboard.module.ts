import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipboardService } from './clipboard.service';

@NgModule({
  providers: [ClipboardService],
  declarations: [],
  exports: [],
  imports: [
    CommonModule
  ],
})
export class ClipboardModule {
  constructor() {}
}
