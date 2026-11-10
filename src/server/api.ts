import express, { type NextFunction, type Request, type Response, Router } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { DesignId } from '../app/core/catalog.model';
import {
  createSession,
  deleteProduct,
  deleteSession,
  getCatalog,
  insertLead,
  insertProduct,
  isValidSession,
  listLeads,
  reorderProducts,
  setDefaultDesign,
  updateProduct,
  ValidationError,
} from './db';

const COOKIE = 'souk_admin';
const SESSION_TTL = 1000 * 60 * 60 * 12;
const isProd = process.env['NODE_ENV'] === 'production';

function adminPassword(): string | null {
  const fromEnv = process.env['ADMIN_PASSWORD'];
  if (fromEnv) return fromEnv;
  return isProd ? null : 'selys-admin';
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = readCookie(req, COOKIE);
  if (token && isValidSession(token)) return next();
  res.status(401).json({ error: 'Session expirée : reconnectez-vous.' });
}

function handle(fn: (req: Request, res: Response) => void) {
  return (req: Request, res: Response) => {
    try {
      fn(req, res);
    } catch (e) {
      if (e instanceof ValidationError) {
        res.status(400).json({ error: e.message });
      } else {
        console.error(e);
        res.status(500).json({ error: 'Erreur du serveur. Réessayez dans un instant.' });
      }
    }
  };
}

const loginAttempts = new Map<string, { count: number; until: number }>();

export function createApi(): Router {
  const api = Router();
  api.use(express.json({ limit: '100kb' }));

  api.get('/catalog', handle((_req, res) => {
    res.set('Cache-Control', 'no-store').json(getCatalog());
  }));

  api.post('/leads', handle((req, res) => {
    insertLead(req.body ?? {});
    res.status(201).json({ ok: true });
  }));

  api.post('/admin/login', handle((req, res) => {
    const ip = req.ip ?? 'unknown';
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.until > Date.now() && attempt.count >= 5) {
      res.status(429).json({ error: 'Trop de tentatives. Patientez une minute avant de réessayer.' });
      return;
    }
    const expected = adminPassword();
    if (!expected) {
      res.status(503).json({ error: 'ADMIN_PASSWORD n’est pas configuré sur le serveur.' });
      return;
    }
    const given = Buffer.from(String(req.body?.password ?? ''));
    const want = Buffer.from(expected);
    const ok = given.length === want.length && timingSafeEqual(given, want);
    if (!ok) {
      const count = (attempt && attempt.until > Date.now() ? attempt.count : 0) + 1;
      loginAttempts.set(ip, { count, until: Date.now() + 60_000 });
      res.status(401).json({ error: 'Mot de passe incorrect.' });
      return;
    }
    loginAttempts.delete(ip);
    const token = randomBytes(32).toString('hex');
    createSession(token, SESSION_TTL);
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: isProd, maxAge: SESSION_TTL, path: '/api' });
    res.json({ ok: true });
  }));

  api.post('/admin/logout', handle((req, res) => {
    const token = readCookie(req, COOKIE);
    if (token) deleteSession(token);
    res.clearCookie(COOKIE, { path: '/api' }).json({ ok: true });
  }));

  api.get('/admin/session', requireAdmin, (_req, res) => {
    res.json({ ok: true });
  });

  api.get('/admin/catalog', requireAdmin, handle((_req, res) => {
    res.set('Cache-Control', 'no-store').json(getCatalog(true));
  }));

  api.post('/admin/products', requireAdmin, handle((req, res) => {
    res.status(201).json(insertProduct(req.body));
  }));

  api.put('/admin/products/:id', requireAdmin, handle((req, res) => {
    res.json(updateProduct(Number(req.params['id']), req.body));
  }));

  api.delete('/admin/products/:id', requireAdmin, handle((req, res) => {
    deleteProduct(Number(req.params['id']));
    res.json({ ok: true });
  }));

  api.put('/admin/order', requireAdmin, handle((req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
    reorderProducts(ids);
    res.json({ ok: true });
  }));

  api.put('/admin/settings', requireAdmin, handle((req, res) => {
    setDefaultDesign(String(req.body?.defaultDesign) as DesignId);
    res.json({ ok: true });
  }));

  api.get('/admin/leads', requireAdmin, handle((_req, res) => {
    res.set('Cache-Control', 'no-store').json(listLeads());
  }));

  api.use((_req, res) => {
    res.status(404).json({ error: 'Route API inconnue.' });
  });

  return api;
}
