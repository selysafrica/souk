import { Routes } from '@angular/router';
import { catalogResolver } from './core/catalog.loader';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then((m) => m.Home), resolve: { catalog: catalogResolver }, title: 'Logiciels Selys Africa · Le catalogue' },
  { path: 'etals', loadComponent: () => import('./designs/etals/etals').then((m) => m.Etals), resolve: { catalog: catalogResolver }, title: 'Les étals du souk · Selys Africa' },
  { path: 'coffrets', loadComponent: () => import('./designs/coffrets/coffrets').then((m) => m.Coffrets), resolve: { catalog: catalogResolver }, title: 'Coffrets logiciels · Selys Africa' },
  { path: 'appareils', loadComponent: () => import('./designs/appareils/appareils').then((m) => m.Appareils), resolve: { catalog: catalogResolver }, title: 'Vitrine d’appareils · Selys Africa' },
  { path: 'admin', loadComponent: () => import('./admin/admin').then((m) => m.Admin), title: 'Administration du catalogue · Souk' },
  { path: '**', redirectTo: '' },
];
