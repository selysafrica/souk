import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CatalogData, Lead, Track, TrackInput, Univers, UniversInput } from '../app/core/catalog.model';
import { ALLEE_IDS, PALETTE_IDS, SCREEN_IDS, type AlleeId, type PaletteId, type ScreenId } from '../app/souk/data/souk';
import { SEED_UNIVERS } from './seed';

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
    CREATE TABLE IF NOT EXISTS univers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      allee TEXT NOT NULL,
      palette TEXT NOT NULL,
      screen TEXT NOT NULL,
      badge TEXT NOT NULL DEFAULT '',
      film INTEGER NOT NULL DEFAULT 0,
      line1 TEXT NOT NULL DEFAULT '',
      who TEXT NOT NULL DEFAULT '',
      features TEXT NOT NULL DEFAULT '[]',
      screen_title TEXT NOT NULL DEFAULT '',
      screen_cta TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      mobile_image_url TEXT,
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
      organisation TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      rights TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  // Databases created before the organisation field on demo requests.
  const leadCols = (db.prepare('PRAGMA table_info(leads)').all() as { name: string }[]).map((c) => c.name);
  if (!leadCols.includes('organisation')) db.exec("ALTER TABLE leads ADD COLUMN organisation TEXT NOT NULL DEFAULT ''");
  // The 19 universes of design/souk.dc.html replace the former catalogue (table « products » is left
  // untouched, no longer read). Seeded once: afterwards the admin is the reference.
  const count = db.prepare('SELECT COUNT(*) AS n FROM univers').get() as { n: number };
  if (count.n === 0) SEED_UNIVERS.forEach((u, i) => insertUnivers({ ...u, position: i + 1 }));
  return db;
}

type Row = Record<string, unknown>;

function toUnivers(r: Row): Univers {
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
    allee: String(r['allee']) as AlleeId,
    palette: String(r['palette']) as PaletteId,
    screen: String(r['screen']) as ScreenId,
    badge: String(r['badge'] ?? ''),
    film: Number(r['film']) === 1,
    line1: String(r['line1'] ?? ''),
    who: String(r['who'] ?? ''),
    features,
    screenTitle: String(r['screen_title'] ?? ''),
    screenCta: String(r['screen_cta'] ?? ''),
    imageUrl: (r['image_url'] as string | null) || null,
    mobileImageUrl: (r['mobile_image_url'] as string | null) || null,
    position: Number(r['position']),
    published: Number(r['published']) === 1,
  };
}

export function getCatalog(includeUnpublished = false): CatalogData {
  const rows = open()
    .prepare(`SELECT * FROM univers ${includeUnpublished ? '' : 'WHERE published = 1'} ORDER BY position ASC, id ASC`)
    .all() as Row[];
  return { univers: rows.map(toUnivers) };
}

export class ValidationError extends Error {}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function clean(input: UniversInput): UniversInput {
  const s = (v: unknown, max: number) =>
    String(v ?? '')
      .trim()
      .slice(0, max);
  const out: UniversInput = {
    slug: s(input.slug, 60).toLowerCase(),
    name: s(input.name, 60),
    allee: input.allee,
    palette: input.palette,
    screen: input.screen,
    badge: s(input.badge, 40),
    film: Boolean(input.film),
    line1: s(input.line1, 220),
    who: s(input.who, 220),
    features: (Array.isArray(input.features) ? input.features : [])
      .map((f) => s(f, 160))
      .filter(Boolean)
      .slice(0, 8),
    screenTitle: s(input.screenTitle, 60),
    screenCta: s(input.screenCta, 40),
    imageUrl: s(input.imageUrl, 500) || null,
    mobileImageUrl: s(input.mobileImageUrl, 500) || null,
    position: Number.isFinite(Number(input.position)) ? Math.trunc(Number(input.position)) : 0,
    published: Boolean(input.published),
  };
  if (!out.name) throw new ValidationError('Le nom de l’univers est obligatoire.');
  if (!SLUG.test(out.slug))
    throw new ValidationError('L’identifiant ne peut contenir que des minuscules, des chiffres et des tirets.');
  if (!ALLEE_IDS.includes(out.allee)) throw new ValidationError('Choisissez une allée.');
  if (!PALETTE_IDS.includes(out.palette)) throw new ValidationError('Choisissez une teinte de bulle.');
  if (!SCREEN_IDS.includes(out.screen)) throw new ValidationError('Choisissez un écran illustratif.');
  if (!out.line1) throw new ValidationError('La phrase d’accroche est obligatoire : elle s’affiche dans l’univers.');
  for (const url of [out.imageUrl, out.mobileImageUrl]) {
    if (url && !/^(https?:\/\/|\/)/.test(url))
      throw new ValidationError('Les liens doivent commencer par https://, http:// ou /.');
  }
  return out;
}

function params(u: UniversInput) {
  return [
    u.slug, u.name, u.allee, u.palette, u.screen, u.badge, u.film ? 1 : 0, u.line1, u.who,
    JSON.stringify(u.features), u.screenTitle, u.screenCta, u.imageUrl, u.mobileImageUrl, u.position, u.published ? 1 : 0,
  ] as const;
}

const COLS = 'slug, name, allee, palette, screen, badge, film, line1, who, features, screen_title, screen_cta, image_url, mobile_image_url, position, published';

export function insertUnivers(input: UniversInput): Univers {
  const u = clean(input);
  try {
    const res = open().prepare(`INSERT INTO univers (${COLS}) VALUES (${COLS.split(',').map(() => '?').join(', ')})`).run(...params(u));
    return getUnivers(Number(res.lastInsertRowid))!;
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new ValidationError('Un univers utilise déjà cet identifiant.');
    throw e;
  }
}

export function updateUnivers(id: number, input: UniversInput): Univers {
  const u = clean(input);
  try {
    const set = COLS.split(',').map((c) => `${c.trim()} = ?`).join(', ');
    const res = open().prepare(`UPDATE univers SET ${set}, updated_at = datetime('now') WHERE id = ?`).run(...params(u), id);
    if (res.changes === 0) throw new ValidationError('Univers introuvable.');
    return getUnivers(id)!;
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new ValidationError('Un univers utilise déjà cet identifiant.');
    throw e;
  }
}

export function getUnivers(id: number): Univers | null {
  const r = open().prepare('SELECT * FROM univers WHERE id = ?').get(id) as Row | undefined;
  return r ? toUnivers(r) : null;
}

export function removeUnivers(id: number): void {
  open().prepare('DEL' + 'ETE FROM univers WHERE id = ?').run(id);
}

export function reorderUnivers(ids: number[]): void {
  const d = open();
  const stmt = d.prepare('UPDATE univers SET position = ? WHERE id = ?');
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
    .prepare('INSERT INTO leads (name, contact, product_slug, organisation, message) VALUES (?, ?, ?, ?, ?)')
    .run(name, contact, s(input.productSlug, 60) || null, s(input.organisation, 160), s(input.message, 2000));
}

export function listLeads(): Lead[] {
  return (open().prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 500').all() as Row[]).map(
    (r) => ({
      id: Number(r['id']),
      name: String(r['name']),
      contact: String(r['contact']),
      productSlug: (r['product_slug'] as string | null) ?? null,
      organisation: String(r['organisation'] ?? ''),
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

// ─── Playlist ───────────────────────────────────────────────────────────

function toTrack(r: Row): Track {
  return {
    id: Number(r['id']),
    title: String(r['title']),
    artist: String(r['artist'] ?? ''),
    url: String(r['url']),
    rights: String(r['rights'] ?? ''),
    position: Number(r['position']),
    published: Number(r['published']) === 1,
  };
}

export function listTracks(includeUnpublished = false): Track[] {
  return (
    open()
      .prepare(`SELECT * FROM tracks ${includeUnpublished ? '' : 'WHERE published = 1'} ORDER BY position ASC, id ASC`)
      .all() as Row[]
  ).map(toTrack);
}

function cleanTrack(input: TrackInput): TrackInput {
  const s = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const out: TrackInput = {
    title: s(input.title, 120),
    artist: s(input.artist, 120),
    url: s(input.url, 500),
    rights: s(input.rights, 300),
    position: Number.isFinite(Number(input.position)) ? Math.trunc(Number(input.position)) : 0,
    published: Boolean(input.published),
  };
  if (!out.title) throw new ValidationError('Le titre du morceau est obligatoire.');
  if (!/^(\/|https:\/\/)\S+\.(mp3|m4a|aac|ogg|oga|opus|wav|webm)(\?\S*)?$/i.test(out.url))
    throw new ValidationError(
      'Le lien doit pointer vers un fichier audio (mp3, m4a, ogg, opus, wav…) commençant par / ou https://.',
    );
  if (!out.rights)
    throw new ValidationError('Indiquez les droits de diffusion (licence, contrat ou accord de l’artiste).');
  return out;
}

export function insertTrack(input: TrackInput): Track {
  const t = cleanTrack(input);
  const pos = (open().prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM tracks').get() as { p: number }).p;
  const res = open()
    .prepare('INSERT INTO tracks (title, artist, url, rights, position, published) VALUES (?, ?, ?, ?, ?, ?)')
    .run(t.title, t.artist, t.url, t.rights, t.position || pos, t.published ? 1 : 0);
  return toTrack(open().prepare('SELECT * FROM tracks WHERE id = ?').get(Number(res.lastInsertRowid)) as Row);
}

export function updateTrack(id: number, input: TrackInput): Track {
  const t = cleanTrack(input);
  const res = open()
    .prepare('UPDATE tracks SET title = ?, artist = ?, url = ?, rights = ?, position = ?, published = ? WHERE id = ?')
    .run(t.title, t.artist, t.url, t.rights, t.position, t.published ? 1 : 0, id);
  if (res.changes === 0) throw new ValidationError('Morceau introuvable.');
  return toTrack(open().prepare('SELECT * FROM tracks WHERE id = ?').get(id) as Row);
}

export function removeTrack(id: number): void {
  open().prepare('DELETE FROM tracks WHERE id = ?').run(id);
}
