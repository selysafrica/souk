import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { createApi } from './server/api';
import { createSeoRoutes } from './server/seo-routes';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
/**
 * Hosts allowed to render pages (SSRF protection). Any of these variables may carry the domain:
 * ALLOWED_HOSTS / NG_ALLOWED_HOSTS (comma-separated lists) or APP_DOMAIN (the deploy .env value).
 */
const allowedHosts = [
  ...new Set(
    [
      'localhost',
      '127.0.0.1',
      process.env['ALLOWED_HOSTS'],
      process.env['NG_ALLOWED_HOSTS'],
      process.env['APP_DOMAIN'],
    ]
      .flatMap((v) => (v ?? '').split(','))
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  ),
];
const angularApp = new AngularNodeAppEngine({ allowedHosts });

app.disable('x-powered-by');
// Behind Nginx / Caddy: read the visitor's address from X-Forwarded-For (admin login throttling).
app.set('trust proxy', process.env['TRUST_PROXY'] ?? 'loopback, uniquelocal');
app.use('/api', createApi());
app.use(createSeoRoutes());
// The admin is never indexed, whatever the crawler reads first.
app.use('/admin', (_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

/**
 * Music files live outside git and outside the image, in their own volume (SOUK_MUSIC, see
 * docker-compose.yml): /musique/* is looked up there first, then in the build.
 */
const musicFolder = process.env['SOUK_MUSIC'];
if (musicFolder) {
  app.use(
    '/musique',
    express.static(musicFolder, {
      index: false,
      redirect: false,
      setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=86400'),
    }),
  );
}

/**
 * Serve static files from /browser. Hashed build files are cached for a year;
 * logos and screenshots keep their names when replaced, so they get one hour.
 */
const HASHED = /-[A-Z0-9]{8}\.(js|css|mjs)$/;
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      res.setHeader(
        'Cache-Control',
        HASHED.test(path) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      );
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
    console.log(`Allowed hosts: ${allowedHosts.join(', ')}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
