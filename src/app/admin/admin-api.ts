import type { CatalogData, DesignId, Lead, Product, ProductInput } from '../core/catalog.model';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Erreur ${res.status}`, res.status);
  return data as T;
}

export const adminApi = {
  session: () => call<{ ok: true }>('GET', '/api/admin/session'),
  login: (password: string) => call<{ ok: true }>('POST', '/api/admin/login', { password }),
  logout: () => call<{ ok: true }>('POST', '/api/admin/logout'),
  catalog: () => call<CatalogData>('GET', '/api/admin/catalog'),
  create: (p: ProductInput) => call<Product>('POST', '/api/admin/products', p),
  update: (id: number, p: ProductInput) => call<Product>('PUT', `/api/admin/products/${id}`, p),
  remove: (id: number) => call<{ ok: true }>('DELETE', `/api/admin/products/${id}`),
  reorder: (ids: number[]) => call<{ ok: true }>('PUT', '/api/admin/order', { ids }),
  setDesign: (defaultDesign: DesignId) => call<{ ok: true }>('PUT', '/api/admin/settings', { defaultDesign }),
  leads: () => call<Lead[]>('GET', '/api/admin/leads'),
};
