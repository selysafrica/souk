import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { Showcase } from '../core/showcase';
import { Icon } from './icon';

const HINT_KEY = 'souk-swipe-hint-seen';

/**
 * Phone navigation drawn on the 3D scene: side arrows, the current product with its position,
 * dots to jump, and a one-time swipe hint. Hidden on larger screens, where each presentation
 * keeps its own controls.
 */
@Component({
  selector: 'app-scene-nav',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-light]': "tone() === 'light'" },
  template: `
    @if (count() > 1) {
      <button type="button" class="side side--prev" (click)="go(-1)" [attr.aria-label]="'Produit précédent : ' + neighbour(-1)">
        <app-icon name="arrow-left" />
      </button>
      <button type="button" class="side side--next" (click)="go(1)" [attr.aria-label]="'Produit suivant : ' + neighbour(1)">
        <app-icon name="arrow-right" />
      </button>
      <div class="tag">
        <p class="label" aria-live="polite">
          <span class="name">{{ showcase.active()?.name }}</span>
          <span class="pos">{{ showcase.index() + 1 }} / {{ count() }}</span>
        </p>
        <div class="dots" role="tablist" aria-label="Choisir un produit">
          @for (p of showcase.products(); track p.id; let i = $index) {
            <button type="button" role="tab" class="dot" [style.--p]="p.accent"
              [attr.aria-selected]="i === showcase.index()" [attr.aria-label]="p.name" (click)="pick(i)">
              <span></span>
            </button>
          }
        </div>
      </div>
      @if (hint()) {
        <p class="hint" aria-hidden="true">
          <app-icon name="arrow-left" /> Glissez pour changer de produit <app-icon name="arrow-right" />
        </p>
      }
    }
  `,
  styles: `
    :host {
      display: none;
      position: absolute; inset: 0; z-index: 3; pointer-events: none;
      --nav-bg: rgba(3, 41, 43, 0.62); --nav-fg: #fff; --nav-line: rgba(255, 255, 255, 0.35);
    }
    :host(.is-light) { --nav-bg: rgba(255, 255, 255, 0.88); --nav-fg: #0f2830; --nav-line: rgba(15, 40, 48, 0.18); }
    @media (max-width: 760px), (pointer: coarse) and (max-height: 520px) { :host { display: block; } }
    button { pointer-events: auto; font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .side {
      position: absolute; top: 50%; width: 48px; height: 48px; margin-top: -24px;
      display: grid; place-items: center; border-radius: 50%;
      border: 1px solid var(--nav-line); background: var(--nav-bg); color: var(--nav-fg);
      backdrop-filter: blur(8px); box-shadow: 0 8px 18px -10px rgba(0,0,0,.5);
      transition: transform .2s var(--ease-out);
    }
    .side:active { transform: scale(.92); }
    .side--prev { left: 10px; }
    .side--next { right: 10px; }
    .side app-icon { --icon: 22px; }
    .tag {
      position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%);
      display: grid; justify-items: center; gap: 6px; padding: 8px 14px 6px; max-width: calc(100% - 132px);
      border-radius: 18px; background: var(--nav-bg); color: var(--nav-fg); border: 1px solid var(--nav-line);
      backdrop-filter: blur(8px);
    }
    .label { display: flex; align-items: baseline; gap: 8px; margin: 0; white-space: nowrap; min-width: 0; }
    .name { font-weight: 800; font-size: .9375rem; overflow: hidden; text-overflow: ellipsis; }
    .pos { font-size: .8125rem; font-weight: 600; opacity: .8; font-variant-numeric: tabular-nums; }
    .dots { display: flex; gap: 0; }
    /* 24px tap targets around small visible dots. */
    .dot { width: 24px; height: 20px; padding: 0; border: 0; background: none; display: grid; place-items: center; }
    .dot span { width: 7px; height: 7px; border-radius: 50%; background: var(--nav-fg); opacity: .4; transition: width .3s var(--ease-out), opacity .3s; }
    .dot[aria-selected='true'] span { width: 18px; border-radius: 4px; opacity: 1; background: var(--p); box-shadow: 0 0 0 1.5px var(--nav-fg); }
    .hint {
      position: absolute; left: 50%; top: var(--nav-top, 14px); transform: translateX(-50%); margin: 0;
      display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
      padding: 8px 14px; border-radius: 999px; font-size: .8125rem; font-weight: 700;
      background: var(--nav-bg); color: var(--nav-fg); border: 1px solid var(--nav-line);
      animation: nudge 1.6s var(--ease-out) infinite;
    }
    .hint app-icon { --icon: 16px; }
    @keyframes nudge { 0%, 100% { transform: translateX(-50%); } 50% { transform: translateX(calc(-50% + 6px)); } }
    @media (prefers-reduced-motion: reduce) { .hint { animation: none; } }
  `,
})
export class SceneNav {
  protected readonly showcase = inject(Showcase);
  readonly tone = input<'dark' | 'light'>('dark');
  protected readonly count = computed(() => this.showcase.products().length);
  protected readonly hint = signal(false);
  private timer = 0;

  constructor() {
    afterNextRender(() => {
      let seen = false;
      try {
        seen = localStorage.getItem(HINT_KEY) === '1';
      } catch {
        /* storage unavailable: show the hint once per visit */
      }
      if (seen) return;
      this.hint.set(true);
      this.timer = window.setTimeout(() => this.dismissHint(), 5000);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected neighbour(delta: number) {
    const list = this.showcase.products();
    return list[(this.showcase.index() + delta + list.length) % list.length]?.name ?? '';
  }

  /** Called by the presentation when a swipe happens, and by the arrows. */
  go(delta: number) {
    this.dismissHint();
    this.showcase.select(this.showcase.index() + delta);
  }

  protected pick(i: number) {
    this.dismissHint();
    this.showcase.select(i);
  }

  private dismissHint() {
    if (!this.hint()) return;
    this.hint.set(false);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  }
}
