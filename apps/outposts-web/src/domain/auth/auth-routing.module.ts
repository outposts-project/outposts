import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthCallbackComponent } from './auth-callback.component';

const routes: Routes = [
  {
    path: 'callback',
    component: AuthCallbackComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [],
})
export class AuthRoutingModule {}
