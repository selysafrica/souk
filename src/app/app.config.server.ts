import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { CatalogLoader } from './core/catalog.loader';
import { ServerCatalogLoader } from './core/catalog.server';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes)), { provide: CatalogLoader, useClass: ServerCatalogLoader }],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
