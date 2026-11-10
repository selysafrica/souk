import { Routes } from '@angular/router';
import { catalogResolver } from './core/catalog.loader';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then((m) => m.Home), resolve: { catalog: catalogResolver } },
  { path: 'etals', loadComponent: () => import('./designs/etals/etals').then((m) => m.Etals), resolve: { catalog: catalogResolver } },
  { path: 'coffrets', loadComponent: () => import('./designs/coffrets/coffrets').then((m) => m.Coffrets), resolve: { catalog: catalogResolver } },
  { path: 'appareils', loadComponent: () => import('./designs/appareils/appareils').then((m) => m.Appareils), resolve: { catalog: catalogResolver } },
  { path: 'admin', loadComponent: () => import('./admin/admin').then((m) => m.Admin) },
  { path: '**', redirectTo: '' },
];
