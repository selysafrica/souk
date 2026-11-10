import { Injectable } from '@angular/core';
import { getCatalog } from '../../server/db';
import { CatalogLoader } from './catalog.loader';
import type { CatalogData } from './catalog.model';

@Injectable()
export class ServerCatalogLoader extends CatalogLoader {
  async load(): Promise<CatalogData> {
    return getCatalog();
  }
}
