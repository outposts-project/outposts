import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QrcodeService } from './qrcode.service';

@NgModule({
  providers: [QrcodeService],
  declarations: [],
  exports: [],
  imports: [CommonModule],
})
export class QrcodeModule {
}
