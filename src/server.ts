import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { createApi } from './server/api';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
// Hosts allowed to render pages (SSRF protection). Add your domain through ALLOWED_HOSTS=souk.example.com,www.example.com
const angularApp = new AngularNodeAppEngine({
  allowedHosts: [
    'localhost',
    '127.0.0.1',
    ...(process.env['ALLOWED_HOSTS']
      ?.split(',')
      .map((h) => h.trim())
      .filter(Boolean) ?? []),
  ],
});

app.disable('x-powered-by');
// Behind Nginx / Caddy: read the visitor's address from X-Forwarded-For (admin login throttling).
app.set('trust proxy', process.env['TRUST_PROXY'] ?? 'loopback, uniquelocal');
app.use('/api', createApi());

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
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
