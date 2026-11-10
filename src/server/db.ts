import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type {
  CatalogData,
  DesignId,
  Lead,
  Product,
  ProductInput,
  ScreenLayout,
} from '../app/core/catalog.model';
import { DESIGN_IDS, SCREEN_LAYOUTS } from '../app/core/catalog.model';
import { SEED_PRODUCTS } from './seed';

const DB_PATH = resolve(process.env['SOUK_DB'] ?? 'data/souk.db');

// Loaded through getBuiltinModule: bundlers strip the required `node:` prefix from `node:sqlite`.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite');

let db: DatabaseSyncType | null = null;

function open(): DatabaseSyncType {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      metier TEXT NOT NULL,
      tagline TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      features TEXT NOT NULL DEFAULT '[]',
      price TEXT,
      accent TEXT NOT NULL DEFAULT '#43E0D0',
      layout TEXT NOT NULL DEFAULT 'dashboard',
      image_url TEXT,
      mobile_image_url TEXT,
      demo_url TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      product_slug TEXT,
      message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
  `);
  // Migration: databases created before the mobile screenshot field.
  const cols = (db.prepare('PRAGMA table_info(products)').all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes('mobile_image_url')) db.exec('ALTER TABLE products ADD COLUMN mobile_image_url TEXT');
  db.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('default_design', 'etals')`,
  ).run();
  const count = db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number };
  if (count.n === 0) {
    SEED_PRODUCTS.forEach((p, i) => insertProduct({ ...p, position: i + 1 }));
  }
  // Real screenshots shipped with the app: filled in once, only where no screenshot is set,
  // so a screenshot the team removes in the admin does not come back on restart.
  const done = db.prepare(`SELECT 1 FROM settings WHERE key = 'captures_v1'`).get();
  if (!done && SEED_PRODUCTS.some((p) => p.imageUrl || p.mobileImageUrl)) {
    const fill = db.prepare(
      'UPDATE products SET image_url = COALESCE(image_url, ?), mobile_image_url = COALESCE(mobile_image_url, ?) WHERE slug = ?',
    );
    for (const p of SEED_PRODUCTS) if (p.imageUrl || p.mobileImageUrl) fill.run(p.imageUrl, p.mobileImageUrl, p.slug);
    db.prepare(`INSERT INTO settings (key, value) VALUES ('captures_v1', datetime('now'))`).run();
  }
  return db;
}

type Row = Record<string, unknown>;

function toProduct(r: Row): Product {
  let features: string[] = [];
  try {
    const parsed = JSON.parse(String(r['features'] ?? '[]'));
    if (Array.isArray(parsed)) features = parsed.map(String);
  } catch {
    features = [];
  }
  return {
    id: Number(r['id']),
    slug: String(r['slug']),
    name: String(r['name']),
    metier: String(r['metier']),
    tagline: String(r['tagline'] ?? ''),
    description: String(r['description'] ?? ''),
    features,
    price: (r['price'] as string | null) || null,
    accent: String(r['accent']),
    layout: String(r['layout']) as ScreenLayout,
    imageUrl: (r['image_url'] as string | null) || null,
    mobileImageUrl: (r['mobile_image_url'] as string | null) || null,
    demoUrl: (r['demo_url'] as string | null) || null,
    position: Number(r['position']),
    published: Number(r['published']) === 1,
  };
}

export function getCatalog(includeUnpublished = false): CatalogData {
  const d = open();
  const rows = d
    .prepare(
      `SELECT * FROM products ${includeUnpublished ? '' : 'WHERE published = 1'} ORDER BY position ASC, id ASC`,
    )
    .all() as Row[];
  return { products: rows.map(toProduct), defaultDesign: getDefaultDesign() };
}

export function getDefaultDesign(): DesignId {
  const row = open().prepare(`SELECT value FROM settings WHERE key = 'default_design'`).get() as
    { value: string } | undefined;
  const v = row?.value as DesignId | undefined;
  return v && DESIGN_IDS.includes(v) ? v : 'etals';
}

export function setDefaultDesign(design: DesignId): void {
  if (!DESIGN_IDS.includes(design)) throw new ValidationError('Présentation inconnue.');
  open()
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('default_design', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(design);
}

export class ValidationError extends Error {}

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function clean(input: ProductInput): ProductInput {
  const s = (v: unknown, max: number) =>
    String(v ?? '')
      .trim()
      .slice(0, max);
  const out: ProductInput = {
    slug: s(input.slug, 60).toLowerCase(),
    name: s(input.name, 60),
    metier: s(input.metier, 60),
    tagline: s(input.tagline, 160),
    description: s(input.description, 1200),
    features: (Array.isArray(input.features) ? input.features : [])
      .map((f) => s(f, 120))
      .filter(Boolean)
      .slice(0, 8),
    price: s(input.price, 60) || null,
    accent: s(input.accent, 7),
    layout: (SCREEN_LAYOUTS.includes(input.layout) ? input.layout : 'dashboard') as ScreenLayout,
    imageUrl: s(input.imageUrl, 500) || null,
    mobileImageUrl: s(input.mobileImageUrl, 500) || null,
    demoUrl: s(input.demoUrl, 500) || null,
    position: Number.isFinite(Number(input.position)) ? Math.trunc(Number(input.position)) : 0,
    published: Boolean(input.published),
  };
  if (!out.name) throw new ValidationError('Le nom du produit est obligatoire.');
  if (!out.metier)
    throw new ValidationError('Le métier est obligatoire : il s’affiche en grand sur la vitrine.');
  if (!SLUG.test(out.slug))
    throw new ValidationError(
      'L’identifiant (slug) ne peut contenir que des minuscules, des chiffres et des tirets.',
    );
  if (!HEX.test(out.accent)) throw new ValidationError('La couleur doit être au format #RRGGBB.');
  for (const url of [out.imageUrl, out.mobileImageUrl, out.demoUrl]) {
    if (url && !/^(https?:\/\/|\/)/.test(url))
      throw new ValidationError('Les liens doivent commencer par https://, http:// ou /.');
  }
  return out;
}

function params(p: ProductInput) {
  return [
    p.slug,
    p.name,
    p.metier,
    p.tagline,
    p.description,
    JSON.stringify(p.features),
    p.price,
    p.accent,
    p.layout,
    p.imageUrl,
    p.mobileImageUrl,
    p.demoUrl,
    p.position,
    p.published ? 1 : 0,
  ] as const;
}

export function insertProduct(input: ProductInput): Product {
  const p = clean(input);
  try {
    const res = open()
      .prepare(
        `INSERT INTO products (slug, name, metier, tagline, description, features, price, accent, layout, image_url, mobile_image_url, demo_url, position, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(...params(p));
    return getProduct(Number(res.lastInsertRowid))!;
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      throw new ValidationError('Un produit utilise déjà cet identifiant.');
    throw e;
  }
}

export function updateProduct(id: number, input: ProductInput): Product {
  const p = clean(input);
  try {
    const res = open()
      .prepare(
        `UPDATE products SET slug = ?, name = ?, metier = ?, tagline = ?, description = ?, features = ?, price = ?, accent = ?,
         layout = ?, image_url = ?, mobile_image_url = ?, demo_url = ?, position = ?, published = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(...params(p), id);
    if (res.changes === 0) throw new ValidationError('Produit introuvable.');
    return getProduct(id)!;
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      throw new ValidationError('Un produit utilise déjà cet identifiant.');
    throw e;
  }
}

export function getProduct(id: number): Product | null {
  const r = open().prepare('SELECT * FROM products WHERE id = ?').get(id) as Row | undefined;
  return r ? toProduct(r) : null;
}

export function deleteProduct(id: number): void {
  open().prepare('DELETE FROM products WHERE id = ?').run(id);
}

export function reorderProducts(ids: number[]): void {
  const d = open();
  const stmt = d.prepare('UPDATE products SET position = ? WHERE id = ?');
  d.exec('BEGIN');
  try {
    ids.forEach((id, i) => stmt.run(i + 1, id));
    d.exec('COMMIT');
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

export function insertLead(input: Partial<Lead>): void {
  const s = (v: unknown, max: number) =>
    String(v ?? '')
      .trim()
      .slice(0, max);
  const name = s(input.name, 120);
  const contact = s(input.contact, 160);
  if (!name) throw new ValidationError('Indiquez votre nom.');
  if (!contact)
    throw new ValidationError(
      'Indiquez un e-mail ou un numéro de téléphone pour que l’on puisse vous répondre.',
    );
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isPhone = /^\+?[\d\s().-]{6,}$/.test(contact);
  if (!isEmail && !isPhone)
    throw new ValidationError(
      'Ce contact ne ressemble ni à un e-mail ni à un numéro de téléphone.',
    );
  open()
    .prepare('INSERT INTO leads (name, contact, product_slug, message) VALUES (?, ?, ?, ?)')
    .run(name, contact, s(input.productSlug, 60) || null, s(input.message, 2000));
}

export function listLeads(): Lead[] {
  return (open().prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 500').all() as Row[]).map(
    (r) => ({
      id: Number(r['id']),
      name: String(r['name']),
      contact: String(r['contact']),
      productSlug: (r['product_slug'] as string | null) ?? null,
      message: String(r['message'] ?? ''),
      createdAt: String(r['created_at']),
    }),
  );
}

export function createSession(token: string, ttlMs: number): void {
  const d = open();
  d.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  d.prepare('INSERT INTO sessions (token, expires_at) VALUES (?, ?)').run(
    token,
    Date.now() + ttlMs,
  );
}

export function isValidSession(token: string): boolean {
  const r = open().prepare('SELECT expires_at FROM sessions WHERE token = ?').get(token) as
    { expires_at: number } | undefined;
  return !!r && r.expires_at > Date.now();
}

export function deleteSession(token: string): void {
  open().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
