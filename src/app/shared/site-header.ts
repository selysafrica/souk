import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { DesignId } from '../core/catalog.model';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <a routerLink="/" class="brand" aria-label="Selys Africa, accueil du catalogue">
        <img [src]="tone() === 'dark' ? '/brand/selys-logo-white.png' : '/brand/selys-logo.png'" alt="Selys Africa" width="1835" height="414" />
      </a>
      <nav class="links" aria-label="Sections">
        <a href="#produits">Produits</a>
        <a href="#demo">Contact</a>
      </nav>
      <nav class="switch" aria-label="Présentations proposées">
        <a routerLink="/etals" [attr.aria-current]="current() === 'etals' ? 'page' : null">Étals</a>
        <a routerLink="/coffrets" [attr.aria-current]="current() === 'coffrets' ? 'page' : null">Coffrets</a>
        <a routerLink="/appareils" [attr.aria-current]="current() === 'appareils' ? 'page' : null">Appareils</a>
      </nav>
    </header>
  `,
  styles: `
    :host { position: absolute; inset: 0 0 auto; z-index: 10; pointer-events: none; }
    .bar {
      display: flex; align-items: center; gap: clamp(12px, 3vw, 40px);
      padding: clamp(14px, 2.4vw, 28px) var(--gutter);
    }
    .bar > * { pointer-events: auto; }
    .brand img { height: clamp(26px, 3.2vw, 36px); width: auto; }
    .links { display: flex; gap: 28px; margin-left: auto; font-weight: 600; }
    .links a { text-decoration: none; padding: 10px 0; }
    .links a:hover { text-decoration: underline; }
    .switch {
      display: flex; padding: 4px; border-radius: 999px;
      background: color-mix(in srgb, var(--ground) 82%, transparent);
      backdrop-filter: blur(10px);
      border: 1px solid var(--line);
      font-size: 0.875rem; font-weight: 600;
    }
    .switch a {
      padding: 8px 14px; min-height: 36px; display: grid; place-items: center;
      border-radius: 999px; text-decoration: none; color: var(--fg-2);
      transition: background-color .25s var(--ease-out), color .25s var(--ease-out);
    }
    .switch a:hover { color: var(--fg); }
    .switch a[aria-current='page'] { background: var(--action); color: var(--action-fg); }
    @media (max-width: 760px) {
      .links { display: none; }
      .switch { margin-left: auto; font-size: 0.8125rem; }
      .switch a { padding: 6px 10px; }
    }
  `,
})
export class SiteHeader {
  readonly tone = input<'dark' | 'light'>('dark');
  readonly current = input<DesignId | null>(null);
}
