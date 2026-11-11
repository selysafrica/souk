import type { UniversInput } from '../app/core/catalog.model';
import { SOUK } from '../app/souk/data/souk';

/**
 * Real screenshots taken earlier (demonstration data), matched to the universes of the design.
 * The former « SAE » archive screens are BeaGed's, and BeaMS Couture became Selys Couture.
 */
export const CAPTURES: Record<string, string> = {
  bearh: 'bearh',
  beaform: 'beaform',
  beaevent: 'beaevent',
  beagec: 'beagec',
  beaged: 'sae-ged',
  couture: 'beams-couture',
};

/** Captures that only exist in the desktop format: phones show the desktop capture, fitted. */
const DESKTOP_ONLY = new Set(['bearh']);

/** The 19 universes of design/souk.dc.html, in the design's order. */
export const SEED_UNIVERS: Omit<UniversInput, 'position'>[] = SOUK.map((u) => {
  const shot = CAPTURES[u.id];
  return {
    slug: u.id,
    name: u.name,
    allee: u.allee,
    palette: u.pal,
    screen: u.scr,
    badge: u.badge,
    film: u.film,
    line1: u.line1,
    who: u.who,
    features: [...u.features],
    screenTitle: u.screenTitle,
    screenCta: u.screenCta,
    imageUrl: shot ? `/captures/${shot}-desktop.webp` : null,
    mobileImageUrl: shot && !DESKTOP_ONLY.has(shot) ? `/captures/${shot}-mobile.webp` : null,
    published: true,
  };
});
