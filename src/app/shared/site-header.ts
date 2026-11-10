import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sound } from '../core/sound';
import { Icon } from './icon';
import type { DesignId } from '../core/catalog.model';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, Icon],
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
      <div class="sound-wrap">
        <button type="button" class="sound" (click)="openPanel()" [attr.aria-expanded]="panel()" aria-controls="sound-panel"
          [class.is-on]="sound.enabled()" [attr.aria-label]="'Son et musique : ' + (sound.enabled() ? 'activé' : 'coupé')">
          <app-icon [name]="sound.enabled() ? 'sound-on' : 'sound-off'" />
        </button>
        @if (panel()) {
          <div class="panel" id="sound-panel" role="dialog" aria-label="Son et musique" (keydown.escape)="panel.set(false)">
            <div class="row">
              <p class="label">Son et musique</p>
              <button type="button" class="switch-btn" role="switch" [attr.aria-checked]="sound.enabled()" (click)="sound.toggle()">
                <span class="knob"></span><span class="visually-hidden">{{ sound.enabled() ? 'Couper le son' : 'Activer le son' }}</span>
              </button>
            </div>
            <div class="now">
              <button type="button" class="mini" (click)="sound.step(-1)" aria-label="Morceau précédent"><app-icon name="arrow-left" /></button>
              <p><strong>{{ sound.currentItem().title }}</strong><span>{{ sound.currentItem().subtitle }}</span></p>
              <button type="button" class="mini" (click)="sound.step(1)" aria-label="Morceau suivant"><app-icon name="arrow-right" /></button>
            </div>
            <ul class="list" role="radiogroup" aria-label="Playlist">
              @for (t of sound.playlist(); track t.key) {
                <li>
                  <button type="button" role="radio" [attr.aria-checked]="t.key === sound.current()" (click)="sound.choose(t.key)">
                    <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
                    <span class="t">{{ t.title }}</span><span class="s">{{ t.subtitle }}</span>
                  </button>
                </li>
              }
            </ul>
          </div>
        }
      </div>
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
    .sound {
      width: 44px; height: 44px; flex: none; display: grid; place-items: center; border-radius: 50%;
      border: 1px solid var(--line); background: color-mix(in srgb, var(--ground) 82%, transparent);
      backdrop-filter: blur(10px); color: var(--fg-2); cursor: pointer;
      transition: color .25s var(--ease-out), background-color .25s var(--ease-out);
    }
    .sound:hover { color: var(--fg); }
    .sound.is-on { background: var(--action); color: var(--action-fg); border-color: transparent; }
    .sound-wrap { position: relative; }
    .panel {
      position: absolute; right: 0; top: calc(100% + 10px); width: min(320px, calc(100vw - 32px)); z-index: 20;
      padding: 14px; border-radius: 18px; background: #0f2830; color: #fff;
      box-shadow: 0 24px 48px -20px rgba(0,0,0,.7); border: 1px solid rgba(255,255,255,.12);
      animation: drop .25s var(--ease-out);
    }
    @keyframes drop { from { opacity: 0; transform: translateY(-6px); } }
    @media (max-width: 760px) { .panel { position: fixed; left: 16px; right: 16px; top: 72px; width: auto; } }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .label { margin: 0; font-weight: 800; font-size: .9375rem; }
    .switch-btn { width: 48px; height: 28px; padding: 3px; border-radius: 999px; border: 0; background: #3c5c63; cursor: pointer; display: flex; transition: background-color .2s; }
    .switch-btn .knob { width: 22px; height: 22px; border-radius: 50%; background: #fff; transition: transform .25s var(--ease-out); }
    .switch-btn[aria-checked='true'] { background: #43e0d0; }
    .switch-btn[aria-checked='true'] .knob { transform: translateX(20px); }
    .now { display: flex; align-items: center; gap: 8px; margin: 14px 0 10px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,.07); }
    .now p { margin: 0; flex: 1; min-width: 0; display: grid; text-align: center; }
    .now strong { font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .now span { font-size: .8125rem; color: #9fc4c1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mini { width: 40px; height: 40px; flex: none; display: grid; place-items: center; border-radius: 50%; border: 1px solid rgba(255,255,255,.25); background: none; color: #fff; cursor: pointer; }
    .mini app-icon { --icon: 18px; }
    .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; max-height: 260px; overflow: auto; }
    .list button {
      width: 100%; min-height: 44px; display: grid; grid-template-columns: 22px 1fr; column-gap: 10px; align-items: center; text-align: left;
      padding: 6px 10px; border: 0; border-radius: 10px; background: none; color: #fff; cursor: pointer; font: inherit;
    }
    .list button:hover { background: rgba(255,255,255,.07); }
    .list .t { font-weight: 700; font-size: .9375rem; }
    .list .s { grid-column: 2; font-size: .8125rem; color: #9fc4c1; }
    .list .eq { grid-row: span 2; display: flex; align-items: flex-end; gap: 2px; height: 14px; opacity: 0; }
    .list .eq i { width: 4px; background: #43e0d0; border-radius: 1px; height: 40%; }
    .list button[aria-checked='true'] { background: rgba(67,224,208,.12); }
    .list button[aria-checked='true'] .eq { opacity: 1; }
    :host-context(body) .list button[aria-checked='true'] .eq i { animation: eq 0.9s ease-in-out infinite alternate; }
    .list button[aria-checked='true'] .eq i:nth-child(2) { animation-delay: -.3s; }
    .list button[aria-checked='true'] .eq i:nth-child(3) { animation-delay: -.6s; }
    @keyframes eq { to { height: 100%; } }
    @media (prefers-reduced-motion: reduce) { .list .eq i { animation: none !important; height: 70%; } }
    .sound app-icon { --icon: 20px; }
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
  protected readonly sound = inject(Sound);
  protected readonly panel = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Close the panel on a click elsewhere.
    afterNextRender(() => {
      const close = (e: Event) => {
        if (this.panel() && !this.host.nativeElement.querySelector('.sound-wrap')?.contains(e.target as Node)) this.panel.set(false);
      };
      document.addEventListener('pointerdown', close);
      this.destroy.onDestroy(() => document.removeEventListener('pointerdown', close));
    });
  }
  private readonly destroy = inject(DestroyRef);

  protected openPanel() {
    this.panel.update((v) => !v);
    if (this.panel()) void this.sound.loadPlaylist();
  }
  readonly tone = input<'dark' | 'light'>('dark');
  readonly current = input<DesignId | null>(null);
}
