import { Location } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { Product } from './catalog.model';

/** Per-page state shared by a presentation and its sections: the active product and the demo request. */
@Injectable()
export class Showcase {
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  readonly products = signal<Product[]>([]);
  readonly index = signal(0);
  readonly active = computed(() => this.products()[this.index()] ?? null);
  readonly demoSlug = signal<string>('');

  init(products: Product[]) {
    this.products.set(products);
    const slug = this.route.snapshot.queryParamMap.get('produit');
    const found = slug ? products.findIndex((p) => p.slug === slug) : -1;
    this.index.set(found >= 0 ? found : 0);
    this.demoSlug.set(this.active()?.slug ?? '');
  }

  /** Selects a product, wrapping around the ends; returns the new index. */
  select(i: number) {
    const n = this.products().length;
    if (!n) return 0;
    const next = ((i % n) + n) % n;
    this.index.set(next);
    this.demoSlug.set(this.products()[next].slug);
    const path = this.location.path().split('?')[0];
    this.location.replaceState(path, `produit=${this.products()[next].slug}`);
    return next;
  }

  /** Keyboard: arrows move, digits 1–9 jump. Returns true when handled. */
  handleKey(e: KeyboardEvent): boolean {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') this.select(this.index() + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') this.select(this.index() - 1);
    else if (/^[1-9]$/.test(e.key) && Number(e.key) <= this.products().length) this.select(Number(e.key) - 1);
    else return false;
    e.preventDefault();
    return true;
  }

  requestDemo(slug: string) {
    this.demoSlug.set(slug);
    document.getElementById('demo')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setTimeout(() => (document.getElementById('demo-name') as HTMLInputElement | null)?.focus({ preventScroll: true }), 500);
  }
}
