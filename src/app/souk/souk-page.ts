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
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
  type OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { CatalogData, Univers } from '../core/catalog.model';
import { Seo } from '../core/seo';
import { Sound } from '../core/sound';
import {
  type AlleeId,
  P,
  SOUK_ALLEES,
  SOUK_ATELIERS,
  SOUK_CHAPTERS,
  SOUK_FILTERS,
  SOUK_INTRO_ORBS,
  SOUK_SCENE_MS,
  SOUK_SCENES,
  SOUK_SCREENS,
} from './data/souk';
import { SoukSound } from './souk-sound';

/** One bubble of the field: a universe plus the layout values computed in design/souk.dc.html. */
interface Orb extends Univers {
  no: string;
  alleeLabel: string;
  c1: string;
  c2: string;
  c3: string;
  sh: string;
  shadow: string;
  left: string;
  top: string;
  sizeN: number;
  depth: number;
}

const NUMBERS = ['Zéro', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-sept', 'Dix-huit', 'Dix-neuf', 'Vingt', 'Vingt et un', 'Vingt-deux', 'Vingt-trois', 'Vingt-quatre'];

/**
 * « Le Souk — page d’accueil », translated from design/souk.dc.html (source of truth).
 * The template keeps the design's markup and inline values; the names below mirror renderVals().
 */
@Component({
  selector: 'app-souk-page',
  imports: [SoukSound],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './souk-page.html',
  styleUrl: './souk.scss',
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class SoukPage implements OnInit {
  readonly catalog = input.required<CatalogData>();
  private readonly doc = inject(DOCUMENT);
  private readonly seo = inject(Seo);
  private readonly sound = inject(Sound);
  private readonly destroy = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly vid = viewChild<ElementRef<HTMLVideoElement>>('vid');
  private readonly route = inject(ActivatedRoute);

  // Design properties (« Cristal » and « Film d’accueil »), at the design's defaults.
  readonly holo = 0.9;
  private readonly motion = signal(true);
  private readonly intro = true;

  // State (this.state in the design).
  private readonly t = signal(0);
  private readonly paused_ = signal(false);
  private readonly introDone = signal(false);
  private readonly allee = signal<'all' | AlleeId>('all');
  private readonly sel = signal<string | null>(null);
  readonly ox = signal('50%');
  readonly oy = signal('50%');
  readonly interest = signal('');
  private readonly sent_ = signal(false);
  private readonly mx = signal(0);
  private readonly my = signal(0);
  /** Remounts the hero after the intro, so its entrance plays again. */
  readonly heroRun = signal(0);

  // Form: the design's fields, plus a way to answer the visitor.
  readonly formName = signal('');
  readonly formOrg = signal('');
  readonly formContact = signal('');
  readonly formMsg = signal('');
  readonly formError = signal('');
  readonly sending = signal(false);

  private lastOpener: HTMLElement | null = null;
  private linked: string | null = null;
  private linkApplied = false;
  private raf = 0;
  private m: [number, number] = [0, 0];

  constructor() {
    // A shared link (?univers=…) opens that universe directly, on the server as in the browser,
    // so the page and its metadata speak for it from the first byte.
    const linked = this.route.snapshot.queryParamMap.get('univers');
    this.linked = linked;

    afterNextRender(() => {
      const win = this.doc.defaultView!;
      if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) this.motion.set(false);
      const iv = win.setInterval(() => {
        if (this.introDone() || this.paused_() || !this.intro) return;
        const t = this.t() + 100;
        if (t >= SOUK_SCENE_MS * SOUK_SCENES) this.finishIntro();
        else this.t.set(t);
      }, 100);
      const onPop = () => {
        const s = new URL(win.location.href).searchParams.get('univers');
        this.sel.set(s && this.base().some((x) => x.slug === s) ? s : null);
      };
      win.addEventListener('popstate', onPop);
      this.destroy.onDestroy(() => {
        win.clearInterval(iv);
        win.removeEventListener('popstate', onPop);
        cancelAnimationFrame(this.raf);
      });
    });

    // Page metadata follows the open universe; the panel takes the focus when it opens.
    effect(() => {
      const open = this.sel();
      const list = this.catalog().univers;
      untracked(() => this.seo.forSouk(list, open ? (list.find((u) => u.slug === open) ?? null) : null));
    });
    effect(() => {
      if (!this.sel()) return;
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('.uni button')?.focus(), 0);
    });
  }

  // ─── renderVals() ──────────────────────────────────────────────────────

  get introOn() {
    return this.intro && !this.introDone();
  }
  get showHero() {
    return true;
  }
  private get scene() {
    return Math.min(SOUK_SCENES - 1, Math.floor(this.t() / SOUK_SCENE_MS));
  }
  get segs() {
    const t = this.t();
    const scene = this.scene;
    return Array.from({ length: SOUK_SCENES }, (_, k) => {
      const w = k < scene ? 100 : k > scene ? 0 : Math.round(((t - k * SOUK_SCENE_MS) / SOUK_SCENE_MS) * 100);
      return { w: w + '%' };
    });
  }
  get sc0() { return this.scene === 0; }
  get sc1() { return this.scene === 1; }
  get sc2() { return this.scene === 2; }
  get sc3() { return this.scene === 3; }
  get sc4() { return this.scene === 4; }
  get sc5() { return this.scene === 5; }
  readonly introOrbs = SOUK_INTRO_ORBS;
  get paused() { return this.paused_(); }
  get playing() { return !this.paused_(); }
  get pauseLabel() { return this.paused_() ? 'Reprendre le film' : 'Mettre le film en pause'; }

  readonly base = computed<Orb[]>(() => this.layout(this.catalog().univers));

  /** Opens the linked universe on first render (server and browser alike). */
  ngOnInit() {
    if (this.linkApplied) return;
    this.linkApplied = true;
    if (this.linked && this.catalog().univers.some((u) => u.slug === this.linked)) {
      this.introDone.set(true);
      this.sel.set(this.linked);
    }
  }

  private layout(list: Univers[]): Orb[] {
    return list.map((x, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const size = 205 + ((i * 37) % 75);
      const [c1, c2, c3, sh] = P[x.palette] ?? P.lilac;
      return {
        ...x,
        no: (i < 9 ? '0' : '') + (i + 1),
        alleeLabel: SOUK_ALLEES[x.allee],
        c1, c2, c3, sh,
        shadow: sh + 'cc',
        left: 2 + col * 23 + (row % 2 ? 7 : 0) + ((i * 13) % 4) + '%',
        top: row * 300 + ((i * 53) % 70) + 'px',
        sizeN: size,
        depth: 0.5 + ((i * 29) % 8) / 10,
      };
    });
  }

  get rootCls() {
    return this.motion() ? '' : 'still';
  }
  get total() {
    return String(this.base().length);
  }
  /** « Dix-neuf » in the design; follows the catalogue when the team adds or removes a universe. */
  get totalWords() {
    return NUMBERS[this.base().length] ?? String(this.base().length);
  }
  get fieldH() {
    return Math.ceil(this.base().length / 4) * 300 + 80 + 'px';
  }

  readonly orbs = computed(() => {
    const allee = this.allee();
    const mx = this.motion() ? this.mx() : 0;
    const my = this.motion() ? this.my() : 0;
    return this.base().map((x, i) => {
      const on = allee === 'all' || x.allee === allee;
      return {
        ...x,
        cls: on ? 'orbwrap' : 'orbwrap dim',
        size: x.sizeN + 'px',
        fs: Math.round(x.sizeN / 10) + 'px',
        px: Math.round(mx * 26 * x.depth) + 'px',
        py: Math.round(my * 20 * x.depth) + 'px',
        delay: -1.3 * i + 's',
        rot: i * 40 + 'deg',
        open: (e: MouseEvent) => this.openAt(x.slug, e),
      };
    });
  });
  get filmOrbs() {
    return this.orbs().filter((x) => x.film);
  }
  get filmCount() {
    return this.filmOrbs.length;
  }
  readonly chapters = SOUK_CHAPTERS.map((c) => ({
    time: c[1],
    label: c[2],
    go: () => {
      const v = this.vid()?.nativeElement;
      if (!v) return;
      v.currentTime = c[0];
      void v.play()?.catch(() => undefined);
    },
  }));
  get allees() {
    const allee = this.allee();
    return SOUK_FILTERS.map(([id, label]) => ({
      label,
      pressed: String(id === allee),
      cls: id === allee ? 'chip on' : 'chip',
      pick: () => {
        this.allee.set(id);
        this.sound.play('tap');
      },
    }));
  }
  get allOrbs() {
    return this.base().map((x) => ({ id: x.slug, name: x.name }));
  }
  readonly ateliers = SOUK_ATELIERS;

  private get ci() {
    const i = this.base().findIndex((x) => x.slug === this.sel());
    return i < 0 ? 0 : i;
  }
  get cur() { return this.base()[this.ci]; }
  get prev() { const b = this.base(); return b[(this.ci + b.length - 1) % b.length]; }
  get next() { const b = this.base(); return b[(this.ci + 1) % b.length]; }
  get hasSel() { return !!this.sel() && this.base().length > 0; }

  get scr() {
    const s = this.cur?.screen;
    return { agenda: s === 'agenda', chat: s === 'chat', files: s === 'files', dash: s === 'dash', people: s === 'people', form: s === 'form', card: s === 'card', rating: s === 'rating', queue: s === 'queue' };
  }
  get agendaCols() {
    const cur = this.cur;
    return SOUK_SCREENS.agendaCols.map((d, j) => ({ day: d[0], ev: d[1].map((h, k) => ({ h, c: (j + k) % 2 ? cur.c2 : cur.c1 })) }));
  }
  get tiles8() { const cur = this.cur; return [0, 1, 2, 3, 4, 5, 6, 7].map((j) => ({ c: j % 3 === 0 ? cur.c2 : cur.c1 })); }
  get kpis() { const cur = this.cur; return [{ w: '70%', c: cur.c1 }, { w: '55%', c: cur.c2 }, { w: '82%', c: cur.c1 }]; }
  get bars() { const cur = this.cur; return SOUK_SCREENS.bars.map((h, j) => ({ h: h + '%', c: j % 4 === 3 ? cur.c2 : cur.c1 })); }
  get rows5() { const cur = this.cur; return SOUK_SCREENS.rowW.map((w, j) => ({ w, tag: SOUK_SCREENS.rowTag[j], c: j % 2 ? cur.c2 : cur.c1 })); }
  readonly fields = SOUK_SCREENS.fields;
  get counters() { const cur = this.cur; return SOUK_SCREENS.counters.map((g, j) => ({ n: g[0], t: g[1], c: j === 1 ? cur.c1 : '#ECE8F2' })); }
  get faces() { const cur = this.cur; return SOUK_SCREENS.mouths.map((m, j) => ({ mouth: m, s: j === 4 ? '74px' : '58px', bg: j === 4 ? cur.c1 : '#F1EEF6' })); }

  get heroX() { return Math.round((this.motion() ? this.mx() : 0) * -34) + 'px'; }
  get heroY() { return Math.round((this.motion() ? this.my() : 0) * -26) + 'px'; }
  get sent() { return this.sent_(); }
  get notSent() { return !this.sent_(); }

  // ─── Actions ───────────────────────────────────────────────────────────

  togglePause() {
    this.paused_.update((p) => !p);
  }
  skip() {
    this.finishIntro();
  }
  replay() {
    this.doc.defaultView?.scrollTo(0, 0);
    this.sel.set(null);
    this.paused_.set(false);
    this.t.set(0);
    this.introDone.set(false);
  }
  private finishIntro() {
    if (this.introDone()) return;
    this.introDone.set(true);
    this.t.set(0);
    this.paused_.set(false);
    this.heroRun.update((n) => n + 1);
  }

  /** Mouse parallax, at most once per frame (as in the design). */
  move(e: MouseEvent) {
    if (!this.motion()) return;
    const win = this.doc.defaultView!;
    this.m = [(e.clientX / (win.innerWidth || 1)) * 2 - 1, (e.clientY / (win.innerHeight || 1)) * 2 - 1];
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.mx.set(this.m[0]);
      this.my.set(this.m[1]);
    });
  }

  openAt(id: string, e?: MouseEvent) {
    const ox = e && e.clientX ? Math.round(e.clientX) + 'px' : '50%';
    const oy = e && e.clientY ? Math.round(e.clientY) + 'px' : '50%';
    if (!this.sel()) this.lastOpener = (e?.currentTarget as HTMLElement | null) ?? (this.doc.activeElement as HTMLElement | null);
    this.sound.play('open');
    this.setUrl(id);
    if (this.sel()) {
      // Close then reopen on the next frame, so the entrance plays again from the new point.
      this.sel.set(null);
      requestAnimationFrame(() => {
        this.ox.set(ox);
        this.oy.set(oy);
        this.sel.set(id);
      });
    } else {
      this.ox.set(ox);
      this.oy.set(oy);
      this.sel.set(id);
    }
  }
  close() {
    if (!this.sel()) return;
    this.sel.set(null);
    this.sound.play('close');
    this.setUrl(null);
    const back = this.lastOpener;
    this.lastOpener = null;
    setTimeout(() => back?.focus({ preventScroll: true }), 0);
  }
  goPrev(e: MouseEvent) {
    this.openAt(this.prev.slug, e);
  }
  goNext(e: MouseEvent) {
    this.openAt(this.next.slug, e);
  }
  askDemo() {
    this.interest.set(this.sel() ?? '');
    this.sel.set(null);
    this.setUrl(null);
    setTimeout(() => this.doc.getElementById('marchand')?.scrollIntoView({ behavior: this.motion() ? 'smooth' : 'auto' }), 80);
  }
  pickInterest(e: Event) {
    this.interest.set((e.target as HTMLSelectElement).value);
  }
  onEscape() {
    if (this.sel()) this.close();
    else if (this.introOn) this.skip();
  }

  /** ?univers=<slug>: shareable, and the browser's back button closes the universe. */
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

  // ─── Form ──────────────────────────────────────────────────────────────

  async send(e: Event) {
    e.preventDefault();
    this.formError.set('');
    if (!this.formName().trim()) return this.formError.set('Indiquez votre nom.');
    if (!this.formContact().trim())
      return this.formError.set('Indiquez un e-mail ou un téléphone pour que le marchand vous réponde.');
    this.sending.set(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.formName(),
          organisation: this.formOrg(),
          contact: this.formContact(),
          productSlug: this.interest(),
          message: this.formMsg(),
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
        err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'Connexion perdue : vérifiez votre réseau puis réessayez.',
      );
    } finally {
      this.sending.set(false);
    }
  }
  value(e: Event) {
    return (e.target as HTMLInputElement).value;
  }
}
