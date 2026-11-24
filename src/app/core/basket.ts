import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

const KEY = 'souk-panier';

/**
 * The visitor's basket: the solutions they set aside while walking the gallery.
 * Kept in this browser only, so it survives a reload; it is sent with the demo request.
 */
@Injectable({ providedIn: 'root' })
export class Basket {
  private readonly win = inject(DOCUMENT).defaultView;
  readonly slugs = signal<string[]>([]);
  readonly count = computed(() => this.slugs().length);

  constructor() {
    try {
      const saved = JSON.parse(this.win?.localStorage.getItem(KEY) ?? '[]');
      if (Array.isArray(saved)) this.slugs.set(saved.filter((s): s is string => typeof s === 'string').slice(0, 30));
    } catch {
      /* storage unavailable or corrupted: start empty */
    }
  }

  has(slug: string) {
    return this.slugs().includes(slug);
  }

  /** Adds or removes a solution; returns true when it is now in the basket. */
  toggle(slug: string): boolean {
    const on = !this.has(slug);
    this.set(on ? [...this.slugs(), slug] : this.slugs().filter((s) => s !== slug));
    return on;
  }

  remove(slug: string) {
    this.set(this.slugs().filter((s) => s !== slug));
  }

  clear() {
    this.set([]);
  }

  /** Drops slugs that are no longer published. */
  keepOnly(known: string[]) {
    const next = this.slugs().filter((s) => known.includes(s));
    if (next.length !== this.slugs().length) this.set(next);
  }

  private set(next: string[]) {
    this.slugs.set(next);
    try {
      this.win?.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode: the basket still works for this visit */
    }
  }
}
