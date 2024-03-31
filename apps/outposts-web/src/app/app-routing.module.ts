import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { canActiveConfluence } from './confluence/confluence-can-active.guard';
import { AuthModule } from './auth/auth.module';

const routes: Routes = [
  {
    path: 'confluence',
    canActivate: [canActiveConfluence],
    loadChildren: () => import(/* webpackChunkName: "confluence-module" */'./confluence/confluence.module').then(m => m.ConfluenceModule)
  },
  {
    path: 'auth',
    loadChildren: () => AuthModule
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
