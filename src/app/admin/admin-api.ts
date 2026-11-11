import type { CatalogData, Lead, Track, TrackInput, Univers, UniversInput } from '../core/catalog.model';

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
  create: (p: UniversInput) => call<Univers>('POST', '/api/admin/univers', p),
  update: (id: number, p: UniversInput) => call<Univers>('PUT', `/api/admin/univers/${id}`, p),
  remove: (id: number) => call<{ ok: true }>('POST', `/api/admin/univers/${id}/remove`),
  reorder: (ids: number[]) => call<{ ok: true }>('PUT', '/api/admin/order', { ids }),
  leads: () => call<Lead[]>('GET', '/api/admin/leads'),
  tracks: () => call<Track[]>('GET', '/api/admin/tracks'),
  uploadTrack: async (title: string, file: File): Promise<Track> => {
    const q = new URLSearchParams({ title, file: file.name });
    let res: Response;
    try {
      res = await fetch(`/api/admin/tracks/upload?${q}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
        credentials: 'same-origin',
      });
    } catch {
      throw new ApiError('Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.', 0);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? `Erreur ${res.status}`, res.status);
    return data as Track;
  },
  updateTrack: (id: number, t: TrackInput) => call<Track>('PUT', `/api/admin/tracks/${id}`, t),
  removeTrack: (id: number) => call<{ ok: true }>('POST', `/api/admin/tracks/${id}/remove`),
};
