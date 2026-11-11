import type { AlleeId, PaletteId, ScreenId } from '../souk/data/souk';

/**
 * A universe of the Souk: one Selys Africa solution, shown as a bubble.
 * Stored in SQLite (table « univers »), seeded from design/souk.dc.html, edited in /admin.
 */
export interface Univers {
  id: number;
  slug: string;
  name: string;
  allee: AlleeId;
  palette: PaletteId;
  /** Illustrative screen shown in the universe panel when no real screenshot is set. */
  screen: ScreenId;
  badge: string;
  /** Listed among « Les 11 solutions du film ». */
  film: boolean;
  line1: string;
  who: string;
  features: string[];
  screenTitle: string;
  screenCta: string;
  /** Real screenshots (desktop / phone); they replace the illustrative screen when set. */
  imageUrl: string | null;
  mobileImageUrl: string | null;
  /** Product site or demo, opened in a new tab from the universe's sheet. */
  link: string | null;
  position: number;
  published: boolean;
}

export type UniversInput = Omit<Univers, 'id'>;

export interface CatalogData {
  univers: Univers[];
}

/** Built-in tracks, generated in the browser (no file, no rights to clear). */
export const BUILTIN_TRACKS = [
  { id: 'elan', title: 'Élan', mood: 'Entraînant' },
  { id: 'lagune', title: 'Lagune', mood: 'Calme' },
  { id: 'plateau', title: 'Plateau', mood: 'Énergique' },
] as const;
export type BuiltinTrackId = (typeof BUILTIN_TRACKS)[number]['id'];

/** A track added by the team: an audio file Selys holds the broadcast rights for. */
export interface Track {
  id: number;
  title: string;
  artist: string;
  url: string;
  rights: string;
  position: number;
  published: boolean;
}

export type TrackInput = Omit<Track, 'id'>;

export interface Lead {
  id: number;
  name: string;
  contact: string;
  organisation: string;
  /** Slug of the universe the visitor picked, if any. */
  productSlug: string | null;
  message: string;
  createdAt: string;
}
