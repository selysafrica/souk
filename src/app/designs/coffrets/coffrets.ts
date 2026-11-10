import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import type { CatalogData } from '../../core/catalog.model';
import { Showcase } from '../../core/showcase';
import { CatalogIndex } from '../../shared/catalog-index';
import { DemoForm } from '../../shared/demo-form';
import { Icon } from '../../shared/icon';
import { SiteFooter } from '../../shared/site-footer';
import { SceneNav } from '../../shared/scene-nav';
import { SiteHeader } from '../../shared/site-header';
import { Swipe } from '../../shared/swipe';
import type { CoffretsScene } from '../../three/coffrets-scene';

@Component({
  selector: 'app-coffrets',
  imports: [SiteHeader, CatalogIndex, DemoForm, SiteFooter, Icon, SceneNav, Swipe],
  providers: [Showcase],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coffrets.html',
  styleUrl: './coffrets.scss',
})
export class Coffrets {
  readonly catalog = input.required<CatalogData>();
  protected readonly showcase = inject(Showcase);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  protected readonly ready = signal(false);
  protected readonly open = signal(false);
  private scene: CoffretsScene | null = null;

  constructor() {
    effect(() => untracked(() => this.showcase.init(this.catalog().products)));

    afterNextRender(async () => {
      const el = this.canvas()?.nativeElement;
      if (!el || !this.showcase.products().length) return;
      try {
        const { CoffretsScene } = await import('../../three/coffrets-scene');
        this.scene = new CoffretsScene(el, this.showcase.products(), (i) => this.showcase.select(i));
        await this.scene.build(this.showcase.index());
        this.ready.set(true);
      } catch (e) {
        console.warn('Scène 3D indisponible, affichage simplifié.', e);
      }
    });

    effect(() => {
      const i = this.showcase.index();
      untracked(() => {
        this.open.set(false);
        void this.scene?.show(i);
      });
    });

    inject(DestroyRef).onDestroy(() => this.scene?.dispose());
  }

  protected longest(text: string) {
    return Math.max(...text.split(/\s+/).map((w) => w.length));
  }

  protected toggle() {
    if (this.scene) this.open.set(this.scene.toggleOpen());
  }
}
