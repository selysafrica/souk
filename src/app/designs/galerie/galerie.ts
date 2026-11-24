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
  viewChildren,
} from '@angular/core';
import { Basket } from '../../core/basket';
import type { CatalogData, Product } from '../../core/catalog.model';
import { Showcase } from '../../core/showcase';
import { Sound } from '../../core/sound';
import { Icon } from '../../shared/icon';
import { ScreenViewer } from '../../shared/screen-viewer';
import { SiteFooter } from '../../shared/site-footer';
import { SiteHeader } from '../../shared/site-header';
import type { GalleryScene } from '../../three/gallery-scene';
import { type GalaRun, playGala } from './gala-burst';
import { Salon } from './salon';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Le souk (route /galerie): a circular corridor hung with one painting per solution.
 * Scrolling walks the visitor along it without pausing; when they stop near a painting, they step up to it and read its label.
 * The corridor ends in the salon, where the basket waits and the hostesses take the request.
 */
@Component({
  selector: 'app-galerie',
  imports: [SiteHeader, SiteFooter, Icon, ScreenViewer, Salon],
  providers: [Showcase],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './galerie.html',
  styleUrl: './galerie.scss',
})
export class Galerie {
  readonly catalog = input.required<CatalogData>();
  protected readonly showcase = inject(Showcase);
  protected readonly basket = inject(Basket);
  private readonly sound = inject(Sound);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly film = viewChild<ElementRef<HTMLVideoElement>>('film');
  private readonly burst = viewChild<ElementRef<HTMLCanvasElement>>('burst');
  private readonly stops = viewChildren<ElementRef<HTMLElement>>('stop');
  private readonly cartels = viewChildren<ElementRef<HTMLElement>>('cartel');
  private readonly marker = viewChild<ElementRef<SVGGElement>>('marker');
  private readonly viewer = viewChild(ScreenViewer);
  protected readonly ready = signal(false);
  protected readonly failed = signal(false);
  /** Where the visitor is: the entrance, in the corridor, or in the salon. */
  protected readonly zone = signal<'entree' | 'couloir' | 'salon'>('entree');
  /** Painting whose full label is unfolded (phones). */
  protected readonly open = signal<number | null>(null);
  /** A short confirmation after adding to the basket. */
  protected readonly flash = signal<string | null>(null);
  /**
   * The home page opens on the entrance film. When it ends, or at the visitor's first scroll, the gala opening
   * bursts onto the souk ("boom"), and the visitor stands at the corridor's mouth ("landed").
   * « Revoir l'animation » brings the film back.
   */
  protected readonly intro = signal<'film' | 'boom' | 'landed'>('film');
  /** The boom has gone off: the film is gone behind the flash. */
  protected readonly burstOut = signal(false);
  protected readonly basketItems = computed(() => {
    const bySlug = new Map(this.showcase.products().map((p) => [p.slug, p]));
    return this.basket.slugs().map((s) => bySlug.get(s)).filter((p): p is Product => !!p);
  });
  private scene: GalleryScene | null = null;
  private progress = -1;
  private flashTimer = 0;
  private gala: GalaRun | null = null;

  constructor() {
    effect(() => untracked(() => this.showcase.init(this.catalog().products)));

    afterNextRender(() => {
      this.basket.keepOnly(this.showcase.products().map((p) => p.slug));
      const onScroll = () => this.measure();
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll, { passive: true });
      this.destroy.onDestroy(() => {
        removeEventListener('scroll', onScroll);
        removeEventListener('resize', onScroll);
      });
      // A shared link to a painting opens the gallery in front of it.
      const slug = new URLSearchParams(location.search).get('produit');
      const i = slug ? this.showcase.products().findIndex((p) => p.slug === slug) : -1;
      if (i >= 0) {
        this.intro.set('landed');
        this.goTo(i, true);
      }
      this.listenForEntry();
      // The logo, on the home page, brings back the opening film.
      const onHome = () => this.replay();
      addEventListener('souk:home', onHome);
      this.destroy.onDestroy(() => removeEventListener('souk:home', onHome));
      this.measure();
      void this.startScene();
    });

    // The film plays only while it can be seen, and never for visitors who prefer less motion.
    effect(() => {
      const v = this.film()?.nativeElement;
      const on = this.intro() === 'film' && this.zone() === 'entree';
      if (!v || typeof matchMedia === 'undefined') return;
      if (on && !matchMedia('(prefers-reduced-motion: reduce)').matches) void v.play()?.catch(() => undefined);
      else v.pause();
    });

    effect(() => {
      const items = this.basketItems();
      untracked(() => this.scene?.setBasket(items));
    });

    this.destroy.onDestroy(() => {
      clearTimeout(this.flashTimer);
      this.gala?.cancel();
      this.scene?.dispose();
    });
  }
  private readonly destroy = inject(DestroyRef);

  private async startScene() {
    const el = this.canvas()?.nativeElement;
    if (!el || !this.showcase.products().length) return;
    try {
      const { GalleryScene } = await import('../../three/gallery-scene');
      this.scene = new GalleryScene(
        el,
        this.showcase.products(),
        (i) => this.goTo(i),
        () => this.toSalon(),
        (i, d) => this.stand(i, d),
      );
      await this.scene.build(this.progress);
      this.scene.setBasket(this.basketItems());
      this.ready.set(true);
      this.measure();
    } catch (e) {
      console.warn('Scène 3D indisponible, affichage simplifié.', e);
      this.failed.set(true);
    }
  }

  /** Can the gala opening play? From the film at the top, once the corridor is built, for visitors who accept motion. */
  private canOpen() {
    return !!this.scene && this.intro() === 'film' && this.progress < -0.9 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * At the film, the first attempt to scroll (wheel, swipe, arrow keys) sets off the opening instead of scrolling;
   * during the opening, the same gestures hurry it.
   */
  private listenForEntry() {
    const keys = ['ArrowDown', 'PageDown', ' ', 'End'];
    const onGesture = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        const field = (e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]');
        if (field || !keys.includes(e.key)) return;
        // Space on a button presses the button.
        if (e.key === ' ' && (e.target as HTMLElement | null)?.closest?.('button, a')) return;
      }
      if (e instanceof WheelEvent && e.deltaY <= 0) return;
      if (this.intro() === 'boom') {
        e.preventDefault();
        this.hurry();
      } else if (this.canOpen()) {
        e.preventDefault();
        this.openSouk();
      }
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0]?.clientY ?? 0);
    const onTouchMove = (e: TouchEvent) => {
      if ((e.touches[0]?.clientY ?? 0) < touchY - 8) onGesture(e);
      else if (this.intro() === 'boom') e.preventDefault();
    };
    addEventListener('wheel', onGesture, { passive: false });
    addEventListener('keydown', onGesture);
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchmove', onTouchMove, { passive: false });
    this.destroy.onDestroy(() => {
      removeEventListener('wheel', onGesture);
      removeEventListener('keydown', onGesture);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      this.lockScroll(false);
    });
  }

  /** The film has played to its end: the souk opens. */
  protected filmEnded() {
    if (this.canOpen()) this.openSouk();
    else if (this.intro() === 'film') {
      // The corridor is not ready yet: the film plays again meanwhile.
      const v = this.film()?.nativeElement;
      if (v) {
        v.currentTime = 0;
        void v.play()?.catch(() => undefined);
      }
    }
  }

  /** The gala opening: a jump through the stars, the boom, and the souk's entrance appears behind the glitter. */
  private openSouk() {
    const scene = this.scene;
    const canvas = this.burst()?.nativeElement;
    if (!scene || !canvas) return;
    this.lockScroll(true);
    scrollTo({ top: 0, behavior: 'auto' });
    this.burstOut.set(false);
    this.intro.set('boom');
    this.sound.play('open');
    let landed = 0;
    const land = () => {
      if (++landed < 2) return;
      this.gala = null;
      this.lockScroll(false);
      this.intro.set('landed');
    };
    // The camera rushes in from the moment of the boom; the page settles once both have finished.
    this.gala = playGala(canvas, () => {
      this.burstOut.set(true);
      scene.playIntro(land);
    });
    void this.gala.done.then(land);
  }

  private hurry() {
    this.gala?.hurry();
    this.scene?.skipIntro();
  }

  private lockScroll(on: boolean) {
    document.documentElement.style.overflow = on ? 'hidden' : '';
  }

  /** « Commencer la promenade »: the opening if it can play, else straight to the first painting. */
  protected enter() {
    if (this.intro() === 'boom') this.hurry();
    else if (this.canOpen()) this.openSouk();
    else {
      this.intro.set('landed');
      this.goTo(0);
    }
  }

  /** « Revoir l'animation »: back to the top, where the film starts over. */
  protected replay() {
    this.sound.play('tap');
    this.lockScroll(false);
    scrollTo({ top: 0, behavior: 'auto' });
    this.burstOut.set(false);
    this.intro.set('film');
    const v = this.film()?.nativeElement;
    if (v) v.currentTime = 0;
  }

  /** Reads the scroll position: s = i when painting i's stop is centred on screen. */
  private measure() {
    const stops = this.stops();
    if (!stops.length) return;
    const vh = innerHeight;
    const r = stops[0].nativeElement.getBoundingClientRect();
    const s = (vh / 2 - (r.top + r.height / 2)) / r.height;
    this.progress = s;
    const n = stops.length;
    this.scene?.setProgress(s);
    this.zone.set(s < -0.5 ? 'entree' : s > n - 0.55 ? 'salon' : 'couloir');
    // Walking in without the opening (less motion, or the corridor was not ready): the film stays behind.
    if (this.intro() === 'film' && s > -0.3) this.intro.set('landed');

    const nearest = Math.round(s);
    if (nearest >= 0 && nearest < n && Math.abs(s - nearest) < 0.4 && nearest !== this.showcase.index()) this.showcase.select(nearest);

    // The visitor's dot on the plan.
    const m = this.marker()?.nativeElement;
    if (m) m.setAttribute('transform', this.rot(Math.max(-1, Math.min(n, s))));
  }

  /**
   * A label only shows once the visitor has stopped in front of its painting:
   * it fades in as they step up to it, and away as soon as they walk on.
   */
  private stand(at: number, amount: number) {
    // Only once the visitor has nearly finished turning to face the painting.
    const o = smooth(0.8, 0.97, amount);
    // The counter follows the painting the visitor stepped up to.
    if (at >= 0 && amount > 0.5 && at !== this.showcase.index()) this.showcase.select(at);
    this.cartels().forEach((c, i) => {
      const el = c.nativeElement;
      const v = i === at ? o : 0;
      el.style.opacity = String(v);
      el.classList.toggle('is-away', v < 0.5);
    });
  }

  /** Rotation on the plan for a position s; the visit turns anticlockwise, as in the corridor. */
  protected rot(s: number) {
    const n = this.showcase.products().length;
    return `rotate(${(-(s + 1) * 360) / (n + 2.4)} 50 50)`;
  }

  /** Scrolls to painting i's stop. */
  protected goTo(i: number, instant = false) {
    const el = this.stops()[i]?.nativeElement;
    if (!el) return;
    const top = el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 - innerHeight / 2;
    scrollTo({ top, behavior: instant || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  /** Tabbing into a label walks the visitor to its painting. */
  protected focused(i: number) {
    if (Math.abs(this.progress - i) > 0.3) this.goTo(i);
  }

  protected step(delta: number) {
    const n = this.showcase.products().length;
    const next = Math.round(this.progress) + delta;
    if (next >= n) this.toSalon();
    else this.goTo(Math.max(0, next));
  }

  protected toSalon() {
    this.sound.play('tap');
    document.getElementById('salon')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  protected toggleBasket(p: Product) {
    const added = this.basket.toggle(p.slug);
    this.sound.play(added ? 'open' : 'close');
    clearTimeout(this.flashTimer);
    this.flash.set(added ? `${p.name} est dans votre panier.` : `${p.name} a quitté votre panier.`);
    this.flashTimer = window.setTimeout(() => this.flash.set(null), 2600);
  }

  protected toggleOpen(i: number) {
    this.open.update((v) => (v === i ? null : i));
  }

  protected zoom(p: Product) {
    this.viewer()?.open(p);
  }

  protected hostessTalk(which: number) {
    this.scene?.talk(which);
  }
}
