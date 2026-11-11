import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  type OnInit,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { CatalogData, Univers } from '../core/catalog.model';
import { Seo } from '../core/seo';
import { Sound } from '../core/sound';
import { P, SOUK_ALLEES } from './data/souk';
import { SoukSound } from './souk-sound';

/** Screen used in the « L’écran » bite, per illustrative screen (B_SCR in the design). */
const B_SCR: Record<string, 'chat' | 'dash' | 'files' | 'card'> = {
  agenda: 'dash',
  chat: 'chat',
  files: 'files',
  dash: 'dash',
  people: 'files',
  form: 'files',
  card: 'card',
  rating: 'card',
  queue: 'card',
};
/** The 46 stars of the design (B_STARS). */
const B_STARS = Array.from({ length: 46 }, (_, i) => ({
  x: ((i * 37) % 100) + '%',
  y: ((i * 53) % 60) + '%',
  s: 1 + (i % 3) + 'px',
  d: -(i % 7) * 0.6 + 's',
}));

interface Stall extends Univers {
  no: string;
  alleeLabel: string;
  c1: string;
  c2: string;
  c3: string;
  sh: string;
  idx: number;
}

/**
 * « Souk — Proposition B, la promenade », translated from design/souk-b-nuit.dc.html.
 * The template keeps the design's markup and inline values; the names mirror renderVals().
 */
@Component({
  selector: 'app-souk-nuit',
  imports: [SoukSound],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './souk-nuit.html',
  styleUrl: './souk-nuit.scss',
  host: { '(document:keydown.escape)': 'closeTaste()' },
})
export class SoukNuit implements OnInit {
  readonly catalog = input.required<CatalogData>();
  private readonly doc = inject(DOCUMENT);
  private readonly seo = inject(Seo);
  private readonly sound = inject(Sound);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly vid = viewChild<ElementRef<HTMLVideoElement>>('vid');

  // State (this.state in the design).
  private readonly pos = signal(0);
  private readonly basket = signal<string[]>([]);
  private readonly taste = signal<string | null>(null);
  private readonly sent_ = signal(false);

  readonly formName = signal('');
  readonly formOrg = signal('');
  readonly formContact = signal('');
  readonly formError = signal('');
  readonly sending = signal(false);

  private opener: HTMLElement | null = null;
  /** Day theme by default; the night theme of the design on demand. Remembered per visitor. */
  readonly day = signal(true);
  /** Phone-width promenade: smaller, closer bubbles so the walk fits the screen. */
  private readonly compact = signal(false);

  /** BeaForm widget (« Restons en contact »): loaded once, after hydration, then it styles the button. */
  private loadBeaForm(win: Window) {
    const w = win as Window & { BeaForm?: { mount(): void } };
    if (w.BeaForm) return w.BeaForm.mount();
    if (this.doc.querySelector('script[data-beaform-embed]')) return;
    const s = this.doc.createElement('script');
    s.src = 'https://bea-form-display.selys.app/embed.js';
    s.async = true;
    s.dataset['beaformEmbed'] = '';
    this.doc.body.appendChild(s);
  }

  toggleTheme() {
    const day = !this.day();
    this.day.set(day);
    this.doc.documentElement.classList.toggle('theme-jour', day);
    try {
      this.doc.defaultView?.localStorage.setItem('souk-theme', day ? 'jour' : 'nuit');
    } catch {
      /* storage unavailable: the choice lasts for this visit */
    }
    this.sound.play('tap');
  }

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      // The entrance film starts muted, as in the design.
      const v = this.vid()?.nativeElement;
      if (v) {
        v.muted = true;
        void v.play()?.catch(() => undefined);
      }
      this.day.set(this.doc.documentElement.classList.contains('theme-jour'));
      const win = this.doc.defaultView!;
      this.loadBeaForm(win);
      const mq = win.matchMedia('(max-width: 600px)');
      const onMq = () => this.compact.set(mq.matches);
      onMq();
      mq.addEventListener('change', onMq);
      destroy.onDestroy(() => mq.removeEventListener('change', onMq));
      const onPop = () => {
        const s = new URL(win.location.href).searchParams.get('univers');
        this.taste.set(s && this.base().some((x) => x.slug === s) ? s : null);
      };
      win.addEventListener('popstate', onPop);
      destroy.onDestroy(() => win.removeEventListener('popstate', onPop));
    });
    effect(() => {
      const open = this.taste();
      const list = this.catalog().univers;
      untracked(() =>
        this.seo.forSouk(list, open ? (list.find((u) => u.slug === open) ?? null) : null),
      );
    });
    effect(() => {
      if (!this.taste()) return;
      setTimeout(
        () =>
          this.host.nativeElement
            .querySelector<HTMLElement>('[role=dialog] button[aria-label="Fermer"]')
            ?.focus(),
        0,
      );
    });
  }

  /** A shared link (?univers=…) opens the tasting of that universe, on the server as in the browser. */
  ngOnInit() {
    const slug = this.route.snapshot.queryParamMap.get('univers');
    const i = this.base().findIndex((x) => x.slug === slug);
    if (slug && i >= 0) {
      this.pos.set(i);
      this.taste.set(slug);
    }
  }

  // ─── renderVals() ──────────────────────────────────────────────────────

  readonly base = computed<Stall[]>(() =>
    this.catalog().univers.map((x, i) => {
      const [c1, c2, c3, sh] = P[x.palette] ?? P.lilac;
      return {
        ...x,
        // A bracketed text is an editorial note, never a feature to show.
        features: x.features.filter((f) => !/^\[.*\]$/.test(f.trim())),
        c1,
        c2,
        c3,
        sh,
        no: (i < 9 ? '0' : '') + (i + 1),
        alleeLabel: SOUK_ALLEES[x.allee],
        idx: i,
      };
    }),
  );
  private get N() {
    return this.base().length;
  }

  private go(i: number) {
    const next = Math.max(0, Math.min(this.N, i));
    if (next !== this.pos()) this.sound.play('nav');
    this.pos.set(next);
  }
  private toggle(slug: string) {
    const b = this.basket();
    this.basket.set(b.includes(slug) ? b.filter((z) => z !== slug) : [...b, slug]);
    this.sound.play('tap');
  }
  private inB(slug: string) {
    return this.basket().includes(slug);
  }

  readonly stalls = computed(() => {
    const pos = this.pos();
    // On phones the design's distances (330px aside, 320px bubble) overflow: same walk, scaled down.
    const k = this.compact();
    return this.base().map((x, i) => {
      const d = i - pos;
      const side = i % 2 ? 1 : -1;
      let X: number, Y: number, Z: number, op: number, blur: string;
      if (d < 0) {
        X = side * 900;
        Y = 120;
        Z = 500;
        op = 0;
        blur = 'blur(6px)';
      } else if (d === 0) {
        X = 0;
        Y = 0;
        Z = 0;
        op = 1;
        blur = 'none';
      } else {
        X = side * (k ? 150 + d * 18 : 330 + d * 40);
        Y = -d * (k ? 18 : 26);
        Z = -d * 520;
        op = Math.max(0, 1 - d * 0.15);
        blur = d > 3 ? 'blur(' + (d - 3) + 'px)' : 'none';
      }
      const size = k ? (d === 0 ? 230 : 170) : d === 0 ? 320 : 260;
      return {
        ...x,
        size: size + 'px',
        half: -size / 2 + 'px',
        fs: Math.round(size / (k ? 9 : 10)) + 'px',
        x: X + 'px',
        y: Y + 'px',
        z: Z + 'px',
        op,
        blur,
        pe: op > 0.05 ? 'auto' : 'none',
        tab: d >= 0 && d < 6 ? '0' : '-1',
        rot: i * 40 + 'deg',
        delay: -1.1 * i + 's',
        aria: d === 0 ? 'Goûter ' + x.name : 'Marcher jusqu’à ' + x.name,
        go: () => (d === 0 ? this.openTaste(x.slug) : this.go(i)),
      };
    });
  });
  readonly dots = computed(() => {
    const pos = this.pos();
    const N = this.N;
    return [
      ...this.base().map((x, i) => ({
        label: 'Aller à ' + x.name,
        s: i === pos ? '14px' : '8px',
        ring: i === pos ? '6px' : '0',
        c: i <= pos ? x.c1 : 'rgba(255,255,255,.35)',
        go: () => this.go(i),
      })),
      {
        label: 'Bout de l’allée',
        s: pos === N ? '14px' : '8px',
        ring: pos === N ? '6px' : '0',
        c: pos === N ? '#F4F0FF' : 'rgba(255,255,255,.35)',
        go: () => this.go(N),
      },
    ];
  });

  readonly stars = B_STARS;
  get pathW() {
    return (this.N ? (this.pos() / this.N) * 100 : 0) + '%';
  }
  get floorY() {
    return this.pos() * 240 + 'px';
  }
  get cur() {
    return this.base()[Math.min(this.pos(), this.N - 1)];
  }
  get glowA() {
    return this.cur?.c1;
  }
  get glowB() {
    return this.cur?.c2;
  }
  get alleeNow() {
    return this.pos() === this.N ? 'Le bout du souk' : this.cur?.alleeLabel;
  }
  get stepLabel() {
    return (this.pos() === this.N ? this.N : this.pos() + 1) + ' / ' + this.N;
  }
  get atStall() {
    return this.pos() < this.N;
  }
  get atEnd() {
    return this.pos() === this.N;
  }
  get curInBasketStr() {
    return String(this.inB(this.cur.slug));
  }
  get curBasketLabel() {
    return this.inB(this.cur.slug) ? 'Dans mon panier' : '+ Ajouter au panier';
  }
  get basketCount() {
    return String(this.basket().length);
  }
  get basketEmpty() {
    return this.basket().length === 0;
  }
  get basketItems() {
    return this.base()
      .filter((x) => this.inB(x.slug))
      .map((x) => ({ ...x, remove: () => this.toggle(x.slug) }));
  }
  get demoLabel() {
    const n = this.basket().length;
    return n > 1 ? n + ' démos' : n === 1 ? 'ma démo' : 'une démo';
  }
  get sent() {
    return this.sent_();
  }
  get notSent() {
    return !this.sent_();
  }
  get tasting() {
    return !!this.taste() && this.N > 0;
  }
  get t() {
    return this.base().find((x) => x.slug === this.taste()) ?? this.cur;
  }
  get v() {
    const vk = B_SCR[this.t.screen] ?? 'card';
    return { chat: vk === 'chat', dash: vk === 'dash', files: vk === 'files', card: vk === 'card' };
  }
  get bars() {
    const t = this.t;
    return [38, 52, 44, 66, 58, 74, 62, 80, 70, 88, 76, 94].map((h, j) => ({
      h: h + '%',
      c: j % 4 === 3 ? t.c2 : t.c1,
    }));
  }
  get tiles() {
    const t = this.t;
    return [0, 1, 2, 3, 4, 5, 6, 7].map((j) => ({ c: j % 3 === 0 ? t.c2 : t.c1 }));
  }
  get tInBasketStr() {
    return String(this.inB(this.t.slug));
  }
  get tBasketLabel() {
    return this.inB(this.t.slug) ? 'Dans mon panier ✓' : 'Ajouter à mon panier de démos';
  }

  // ─── Actions ───────────────────────────────────────────────────────────

  back() {
    this.go(this.pos() - 1);
  }
  fwd() {
    this.go(this.pos() + 1);
  }
  restart() {
    this.go(0);
  }
  tasteCur() {
    this.openTaste(this.cur.slug);
  }
  toggleCur() {
    this.toggle(this.cur.slug);
  }
  toggleTaste() {
    this.toggle(this.t.slug);
  }
  /** From the sheet of a universe without a product link: back to the walk, one stall further. */
  continueWalk() {
    this.closeTaste();
    this.go(this.pos() + 1);
  }

  private openTaste(slug: string) {
    this.opener = this.doc.activeElement as HTMLElement | null;
    this.taste.set(slug);
    this.sound.play('open');
    this.setUrl(slug);
  }
  closeTaste() {
    if (!this.taste()) return;
    this.taste.set(null);
    this.sound.play('close');
    this.setUrl(null);
    const back = this.opener;
    this.opener = null;
    setTimeout(() => back?.focus({ preventScroll: true }), 0);
  }

  /** ?univers=<slug>: shareable, and the browser's back button closes the tasting. */
  private setUrl(slug: string | null) {
    const win = this.doc.defaultView;
    if (!win) return;
    const url = new URL(win.location.href);
    const current = url.searchParams.get('univers');
    if (slug === current) return;
    if (slug) url.searchParams.set('univers', slug);
    else url.searchParams.delete('univers');
    if (slug && !current) win.history.pushState(null, '', url);
    else win.history.replaceState(null, '', url);
  }

  // ─── Form: « Demander les démos de mon panier » ─────────────────────────

  async send(e: Event) {
    e.preventDefault();
    this.formError.set('');
    if (!this.formName().trim()) return this.formError.set('Indiquez votre nom.');
    if (!this.formContact().trim())
      return this.formError.set('Indiquez un e-mail ou un téléphone pour qu’on vous recontacte.');
    const picked = this.basketItems;
    this.sending.set(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.formName(),
          organisation: this.formOrg(),
          contact: this.formContact(),
          productSlug: picked[0]?.slug ?? '',
          message: picked.length
            ? 'Panier de dégustation : ' + picked.map((p) => p.name).join(', ')
            : '',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Envoi impossible pour le moment.');
      }
      this.sent_.set(true);
      this.sound.play('tap');
    } catch (err) {
      this.formError.set(
        err instanceof Error && err.message !== 'Failed to fetch'
          ? err.message
          : 'Connexion perdue : vérifiez votre réseau puis réessayez.',
      );
    } finally {
      this.sending.set(false);
    }
  }
  value(e: Event) {
    return (e.target as HTMLInputElement).value;
  }
}
