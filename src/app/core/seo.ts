import { DOCUMENT } from '@angular/common';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import type { Univers } from './catalog.model';
import { SOUK_ALLEES } from '../souk/data/souk';

/** Public origin of the site (https://souk.selys-africa.com), used for absolute URLs in shares. */
export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  providedIn: 'root',
  factory: () => {
    const doc = inject(DOCUMENT);
    return doc.location?.origin && doc.location.origin !== 'null' ? doc.location.origin : 'https://souk.selys-africa.com';
  },
});

const SITE_NAME = 'Selys Souk';
const DEFAULT_TITLE = 'Souk — Selys Africa';
const DEFAULT_DESCRIPTION =
  'Le Souk de Selys Africa : la vitrine de toutes nos solutions. Flânez, touchez une bulle et entrez dans son univers.';
const DEFAULT_IMAGE = '/og/souk.jpg';

interface PageMeta {
  title: string;
  description: string;
  /** Path and query, e.g. "/?produit=beaform". */
  path: string;
  image?: string | null;
  imageAlt?: string;
  noindex?: boolean;
}

/** Title, description, canonical, Open Graph, Twitter card and structured data, rendered on the server. */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly origin = inject(SITE_ORIGIN).replace(/\/$/, '');

  private abs(url: string) {
    return /^https?:\/\//.test(url) ? url : this.origin + (url.startsWith('/') ? url : '/' + url);
  }

  set(page: PageMeta) {
    const url = this.abs(page.path);
    const image = this.abs(page.image || DEFAULT_IMAGE);
    const [w, h] = page.image && !page.image.startsWith('/og/') ? ['1600', '1000'] : ['1200', '630'];
    this.title.setTitle(page.title);
    const tags: Record<string, string> = {
      description: page.description,
      robots: page.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
      'og:type': 'website',
      'og:site_name': SITE_NAME,
      'og:locale': 'fr_FR',
      'og:title': page.title,
      'og:description': page.description,
      'og:url': url,
      'og:image': image,
      'og:image:width': w,
      'og:image:height': h,
      'og:image:alt': page.imageAlt ?? page.title,
      'twitter:card': 'summary_large_image',
      'twitter:title': page.title,
      'twitter:description': page.description,
      'twitter:image': image,
    };
    for (const [key, content] of Object.entries(tags)) {
      const attr = key.startsWith('og:') ? 'property' : 'name';
      this.meta.updateTag({ [attr]: key, content }, `${attr}="${key}"`);
    }
    this.link('canonical', url);
  }

  /** The Souk; with a universe open (?univers=<slug>), the page speaks for that universe. */
  forSouk(univers: Univers[], active: Univers | null) {
    if (!active) {
      this.set({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: '/' });
    } else {
      this.set({
        title: `${active.name} · ${SOUK_ALLEES[active.allee]} | Selys Souk`,
        description: this.clip(`${active.line1} Pour qui : ${active.who}`),
        path: `/?univers=${encodeURIComponent(active.slug)}`,
        image: active.imageUrl && !/\.webp$/i.test(active.imageUrl) ? active.imageUrl : null,
        imageAlt: `Écran de ${active.name}`,
      });
    }
    this.jsonLd(univers);
  }

  noindex(title: string) {
    this.set({ title, description: DEFAULT_DESCRIPTION, path: '/admin', noindex: true });
  }

  private clip(text: string, max = 160) {
    const t = text.replace(/\s+/g, ' ').trim();
    return t.length <= max ? t : t.slice(0, t.lastIndexOf(' ', max - 1)) + '…';
  }

  private link(rel: string, href: string) {
    let el = this.doc.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!el) {
      el = this.doc.createElement('link');
      el.setAttribute('rel', rel);
      this.doc.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  /** Organization + the list of software, so search engines understand the catalogue. */
  private jsonLd(univers: Univers[]) {
    const data = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${this.origin}/#org`,
          name: 'Selys Africa',
          slogan: 'Nos innovations vous distinguent',
          url: this.origin + '/',
          logo: this.abs('/brand/selys-logo.png'),
        },
        {
          '@type': 'ItemList',
          name: 'Les univers du Souk',
          itemListElement: univers.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: this.abs(`/?univers=${encodeURIComponent(p.slug)}`),
            item: {
              '@type': 'SoftwareApplication',
              name: p.name,
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: this.clip(`${p.line1} ${p.who}`, 300),
              ...(p.imageUrl ? { screenshot: this.abs(p.imageUrl) } : {}),
              publisher: { '@id': `${this.origin}/#org` },
            },
          })),
        },
      ],
    };
    let el = this.doc.head.querySelector<HTMLScriptElement>('script#souk-ld');
    if (!el) {
      el = this.doc.createElement('script');
      el.id = 'souk-ld';
      el.type = 'application/ld+json';
      this.doc.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }
}
