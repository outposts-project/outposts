import { AuthModule } from '@/domain/auth/auth.module';
import { canActiveConfluence } from '@/domain/confluence/confluence-can-active.guard';
import { AppMainComponent } from '@/components/layout/app.main.component';
import { LandingComponent } from '@/pages/landing/landing.component';
import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', component: LandingComponent, pathMatch: 'full' },
    {
        path: '',
        component: AppMainComponent,
        children: [
            {
                path: 'confluence',
                canActivate: [canActiveConfluence],
                loadChildren: () => import(/* webpackChunkName: "confluence-module" */'../domain/confluence/confluence.module').then(m => m.ConfluenceModule)
            },
            {
                path: 'auth',
                loadChildren: () => AuthModule
            }
        ]
    },
    { path: 'notfound', loadChildren: () => import('@/pages/notfound/routes') },
    { path: '**', redirectTo: '/notfound' }
];
