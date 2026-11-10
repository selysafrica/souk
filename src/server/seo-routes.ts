import { Router } from 'express';
import { getCatalog } from './db';

/** Public origin for absolute URLs: SITE_URL, or https://APP_DOMAIN. Never taken from the Host header. */
export function siteUrl(): string {
  const url = process.env['SITE_URL'] || (process.env['APP_DOMAIN'] ? `https://${process.env['APP_DOMAIN']}` : '');
  return (url || 'https://souk.selys-africa.com').replace(/\/$/, '');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function createSeoRoutes(): Router {
  const r = Router();

  r.get('/robots.txt', (_req, res) => {
    res
      .type('text/plain')
      .set('Cache-Control', 'public, max-age=3600')
      .send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteUrl()}/sitemap.xml\n`);
  });

  r.get('/sitemap.xml', (_req, res) => {
    const base = siteUrl();
    const { products } = getCatalog();
    const urls = [
      `  <url><loc>${base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
      ...products.map((p) => {
        const img = p.imageUrl
          ? `\n    <image:image><image:loc>${esc(base + p.imageUrl)}</image:loc><image:title>${esc(p.name)}</image:title></image:image>`
          : '';
        return `  <url><loc>${esc(`${base}/?produit=${encodeURIComponent(p.slug)}`)}</loc><changefreq>monthly</changefreq><priority>0.8</priority>${img}\n  </url>`;
      }),
    ];
    res
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`,
      );
  });

  return r;
}
