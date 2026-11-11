import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';

/**
 * Where the playlist's audio files live: the « souk_musique » volume in production (SOUK_MUSIC),
 * next to the database otherwise. Never in git, never in the image. Served under /musique/.
 */
export const MUSIC_DIR = resolve(
  process.env['SOUK_MUSIC'] ?? join(dirname(resolve(process.env['SOUK_DB'] ?? 'data/souk.db')), 'musique'),
);

/** Largest file accepted from the admin (a 6-minute MP3 at 320 kbit/s is about 15 MB). */
export const MAX_AUDIO_BYTES = 40 * 1024 * 1024;

const BY_TYPE: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/webm': 'webm',
};
const EXTENSIONS = new Set(Object.values(BY_TYPE));

export class AudioError extends Error {}

/** Writes an uploaded file under a generated name and returns its public URL. */
export function saveAudio(title: string, contentType: string, originalName: string, data: Buffer): string {
  const fromName = extname(originalName).slice(1).toLowerCase();
  const ext = BY_TYPE[contentType.split(';')[0].trim().toLowerCase()] ?? (EXTENSIONS.has(fromName) ? fromName : null);
  if (!ext) throw new AudioError('Choisissez un fichier audio (MP3, M4A, OGG, OPUS, WAV ou WEBM).');
  if (!data.length) throw new AudioError('Le fichier est vide.');
  const slug =
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'morceau';
  const file = `${slug}-${randomBytes(3).toString('hex')}.${ext}`;
  mkdirSync(MUSIC_DIR, { recursive: true });
  writeFileSync(join(MUSIC_DIR, file), data);
  return `/musique/${file}`;
}

/** Deletes the file behind a /musique/ URL, if it is in the music folder. */
export function deleteAudio(url: string): void {
  if (!url.startsWith('/musique/')) return;
  const path = join(MUSIC_DIR, basename(decodeURIComponent(url)));
  if (existsSync(path)) unlinkSync(path);
}
