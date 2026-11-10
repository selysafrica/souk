import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { CatalogLoader } from './core/catalog.loader';
import { ServerCatalogLoader } from './core/catalog.server';
import { SITE_ORIGIN } from './core/seo';

function siteOrigin() {
  const url = process.env['SITE_URL'] || (process.env['APP_DOMAIN'] ? `https://${process.env['APP_DOMAIN']}` : '');
  return url || 'https://souk.selys-africa.com';
}

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes)), { provide: CatalogLoader, useClass: ServerCatalogLoader },
    { provide: SITE_ORIGIN, useFactory: siteOrigin }],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
