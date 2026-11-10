export const DESIGN_IDS = ['etals', 'coffrets', 'appareils'] as const;
export type DesignId = (typeof DESIGN_IDS)[number];

export const DESIGN_LABELS: Record<DesignId, string> = {
  etals: 'Les étals du souk',
  coffrets: 'Coffrets logiciels',
  appareils: 'Vitrine d’appareils',
};

/** Kind of generated product screen used until real screenshots are provided. */
export const SCREEN_LAYOUTS = ['dashboard', 'form', 'agenda', 'documents', 'orders', 'floorplan', 'people'] as const;
export type ScreenLayout = (typeof SCREEN_LAYOUTS)[number];

export const SCREEN_LAYOUT_LABELS: Record<ScreenLayout, string> = {
  dashboard: 'Tableau de bord',
  form: 'Formulaire',
  agenda: 'Agenda',
  documents: 'Documents',
  orders: 'Commandes',
  floorplan: 'Plan de salle',
  people: 'Personnes',
};

export interface Product {
  id: number;
  slug: string;
  name: string;
  metier: string;
  tagline: string;
  description: string;
  features: string[];
  price: string | null;
  accent: string;
  layout: ScreenLayout;
  imageUrl: string | null;
  /** Phone-format screenshot (portrait), used on phone screens. */
  mobileImageUrl: string | null;
  demoUrl: string | null;
  position: number;
  published: boolean;
}

export type ProductInput = Omit<Product, 'id'>;

export interface CatalogData {
  products: Product[];
  defaultDesign: DesignId;
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
  productSlug: string | null;
  message: string;
  createdAt: string;
}
