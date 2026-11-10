import { inject, Injectable, makeStateKey, TransferState } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import type { CatalogData } from './catalog.model';

/** Where catalogue data comes from: SQLite on the server, the API in the browser. */
export abstract class CatalogLoader {
  abstract load(): Promise<CatalogData>;
}

@Injectable()
export class HttpCatalogLoader extends CatalogLoader {
  async load(): Promise<CatalogData> {
    const res = await fetch('/api/catalog');
    if (!res.ok) throw new Error(`Catalogue indisponible (${res.status})`);
    return res.json();
  }
}

const CATALOG_KEY = makeStateKey<CatalogData>('souk-catalog');

/** Loads once on the server, then hands the same data to the browser through TransferState. */
export const catalogResolver: ResolveFn<CatalogData> = async () => {
  const state = inject(TransferState);
  const cached = state.get(CATALOG_KEY, null);
  if (cached) {
    state.remove(CATALOG_KEY);
    return cached;
  }
  try {
    const data = await inject(CatalogLoader).load();
    state.set(CATALOG_KEY, data);
    return data;
  } catch {
    return { univers: [] };
  }
};
