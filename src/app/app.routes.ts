import { Routes } from '@angular/router';
import { catalogResolver } from './core/catalog.loader';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then((m) => m.Home), resolve: { catalog: catalogResolver } },
  // The souk is the only presentation now: the former addresses lead to the home page (a shared ?produit= link keeps its painting).
  { path: 'galerie', redirectTo: '', pathMatch: 'full' },
  { path: 'etals', redirectTo: '', pathMatch: 'full' },
  { path: 'coffrets', redirectTo: '', pathMatch: 'full' },
  { path: 'appareils', redirectTo: '', pathMatch: 'full' },
  { path: 'admin', loadComponent: () => import('./admin/admin').then((m) => m.Admin) },
  { path: '**', redirectTo: '' },
];
