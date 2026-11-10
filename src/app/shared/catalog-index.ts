import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Showcase } from '../core/showcase';
import { Icon } from './icon';

/** The full list, readable without 3D: one row per product, ruled like a market register. */
@Component({
  selector: 'app-catalog-index',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="index" id="produits" aria-labelledby="produits-title">
      <div class="head">
        <h2 id="produits-title">{{ title() }}</h2>
        <p>{{ intro() }}</p>
      </div>
      @if (showcase.products().length) {
        <ol class="rows">
          @for (p of showcase.products(); track p.id; let i = $index) {
            <li class="row" [id]="'produit-' + p.slug" [class.is-active]="i === showcase.index()" [style.--p]="p.accent">
              <span class="marker marker--{{ marker() }}" aria-hidden="true">
                @switch (marker()) {
                  @case ('awning') { <span class="awning"></span><span class="board">{{ p.metier }}</span> }
                  @case ('box') { <span class="box3d"><span class="f">{{ p.name }}</span><span class="s"></span><span class="t"></span></span> }
                  @default { <span class="screen"><span class="sb"></span><span class="l1"></span><span class="l2"></span><span class="l3"></span></span> }
                }
              </span>
              <div class="id">
                <h3>{{ p.name }}</h3>
                <p class="metier">{{ p.metier }}</p>
              </div>
              <div class="body">
                <p class="tagline">{{ p.tagline }}</p>
                <p class="desc">{{ p.description }}</p>
                @if (p.features.length) {
                  <ul class="features">
                    @for (f of p.features; track f) {
                      <li><app-icon name="check" />{{ f }}</li>
                    }
                  </ul>
                }
              </div>
              <div class="side">
                <p class="price">{{ p.price ?? 'Tarif sur demande' }}</p>
                <button type="button" class="btn btn--primary" (click)="showcase.requestDemo(p.slug)">
                  Demander une démo
                </button>
                <button type="button" class="see" (click)="see(i)">
                  {{ seeLabel() }} <app-icon name="arrow-right" />
                </button>
              </div>
            </li>
          }
        </ol>
      } @else {
        <p class="empty">Aucun produit n’est publié pour le moment. Revenez bientôt, ou écrivez-nous ci-dessous.</p>
      }
    </section>
  `,
  styles: `
    :host { display: block; background: var(--ground-2); color: var(--fg); }
    .index { padding: clamp(72px, 10vw, 140px) var(--gutter) clamp(56px, 8vw, 110px); max-width: 1320px; margin: 0 auto; }
    .head { display: grid; gap: 16px; max-width: 46rem; margin-bottom: clamp(40px, 6vw, 72px); }
    h2 { font-size: clamp(2.2rem, 5vw, 4rem); font-weight: 900; letter-spacing: -0.03em; }
    .head p { font-size: 1.125rem; color: var(--fg-2); max-width: 40rem; }
    .rows { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--line); }
    .row {
      display: grid; grid-template-columns: 120px minmax(180px, 1fr) minmax(0, 2.2fr) minmax(200px, auto);
      gap: clamp(16px, 3vw, 44px); align-items: start;
      padding: clamp(28px, 4vw, 44px) 0; border-bottom: 1px solid var(--line);
    }
    .marker { display: block; width: 120px; transition: transform .5s var(--ease-out); }
    .row.is-active .marker { transform: translateY(-6px); }
    /* Étals: a scalloped awning over a painted name board. */
    .awning { display: block; height: 30px; background: repeating-linear-gradient(90deg, var(--p) 0 15px, #fff 15px 30px);
      -webkit-mask: radial-gradient(circle at 7.5px 22px, #000 8px, transparent 8.5px) 0 0 / 15px 30px repeat-x, linear-gradient(#000 0 0) 0 0 / 100% 22px no-repeat;
      mask: radial-gradient(circle at 7.5px 22px, #000 8px, transparent 8.5px) 0 0 / 15px 30px repeat-x, linear-gradient(#000 0 0) 0 0 / 100% 22px no-repeat; }
    .board { display: block; margin: 8px 6px 0; padding: 6px 4px; border: 3px solid var(--p); border-radius: 6px; background: #fff; color: #0f2830;
      font-size: .6875rem; font-weight: 800; line-height: 1.2; text-align: center; text-transform: uppercase; letter-spacing: .02em; text-wrap: balance;
      box-shadow: 0 6px 10px -6px rgba(0,0,0,.5); }
    /* Coffrets: a small box in CSS 3D. */
    .box3d { position: relative; display: block; width: 64px; height: 84px; margin: 6px 0 0 18px; transform-style: preserve-3d; transform: rotateX(-12deg) rotateY(-28deg); }
    .box3d > span { position: absolute; display: block; }
    .box3d .f { inset: 0; background: var(--p); border-radius: 2px; padding: 6px 5px; font-size: .5625rem; font-weight: 900; line-height: 1.1; color: #fff; text-shadow: 0 1px 1px rgba(0,0,0,.35); transform: translateZ(11px); overflow: hidden; }
    .box3d .s { top: 0; bottom: 0; right: -11px; width: 22px; background: color-mix(in srgb, var(--p) 72%, #0f2830); transform: rotateY(90deg); transform-origin: center; right: -11px; }
    .box3d .t { left: 0; right: 0; top: -11px; height: 22px; background: color-mix(in srgb, var(--p) 55%, #fff); transform: rotateX(90deg); }
    /* Appareils: a miniature screen showing the product colour. */
    .screen { position: relative; display: block; width: 112px; height: 72px; border-radius: 8px; background: #0b1416; border: 3px solid #c7d2d5; overflow: hidden; box-shadow: 0 10px 18px -10px rgba(0,0,0,.7); }
    .screen span { position: absolute; display: block; border-radius: 3px; }
    .screen .sb { left: 0; top: 0; right: 0; height: 12px; background: var(--p); border-radius: 0; }
    .screen .l1 { left: 8px; top: 20px; width: 60%; height: 6px; background: #e8f0f0; }
    .screen .l2 { left: 8px; top: 32px; width: 80%; height: 6px; background: #5d7377; }
    .screen .l3 { left: 8px; top: 44px; width: 40%; height: 14px; background: var(--p); opacity: .8; }
    h3 { font-size: clamp(1.5rem, 2.4vw, 2rem); font-weight: 900; letter-spacing: -0.02em; }
    .metier { margin-top: 6px; font-weight: 600; color: var(--fg-2); }
    .tagline { font-size: 1.1875rem; font-weight: 700; line-height: 1.35; margin-bottom: 10px; max-width: 40rem; }
    .desc { color: var(--fg-2); max-width: 62ch; }
    .features { list-style: none; padding: 0; margin: 18px 0 0; display: flex; flex-wrap: wrap; gap: 10px 22px; }
    .features li { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9375rem; }
    .features app-icon { --icon: 18px; color: var(--action); }
    .side { display: grid; gap: 12px; justify-items: start; }
    .price { font-weight: 700; color: var(--fg-2); }
    .see {
      display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0;
      background: none; border: 0; cursor: pointer; font-weight: 700; color: var(--fg);
      text-decoration: underline; text-underline-offset: .25em;
    }
    .see app-icon { --icon: 18px; transition: transform .25s var(--ease-out); }
    .see:hover app-icon { transform: translateX(4px); }
    .empty { font-size: 1.125rem; color: var(--fg-2); }
    @media (max-width: 900px) {
      .row { grid-template-columns: 1fr; gap: 16px; }
    }
  `,
})
export class CatalogIndex {
  protected readonly showcase = inject(Showcase);
  readonly title = input('Tous nos logiciels');
  readonly intro = input('');
  readonly seeLabel = input('Voir en 3D');
  readonly marker = input<'awning' | 'box' | 'screen'>('screen');

  protected see(i: number) {
    this.showcase.select(i);
    document.getElementById('vitrine')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}
