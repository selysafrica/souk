import { Routes } from '@angular/router';
import { catalogResolver } from './core/catalog.loader';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./souk/souk-page').then((m) => m.SoukPage), resolve: { catalog: catalogResolver } },
  { path: 'admin', loadComponent: () => import('./admin/admin').then((m) => m.Admin) },
  // Former presentations and product links lead to the Souk.
  { path: '**', redirectTo: '' },
];
