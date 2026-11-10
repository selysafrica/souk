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
import type { EtalsScene } from '../../three/etals-scene';

@Component({
  selector: 'app-etals',
  imports: [SiteHeader, CatalogIndex, DemoForm, SiteFooter, Icon, SceneNav, Swipe],
  providers: [Showcase],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './etals.html',
  styleUrl: './etals.scss',
})
export class Etals {
  readonly catalog = input.required<CatalogData>();
  protected readonly showcase = inject(Showcase);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  protected readonly ready = signal(false);
  protected readonly failed = signal(false);
  private scene: EtalsScene | null = null;

  constructor() {
    effect(() => untracked(() => this.showcase.init(this.catalog().products)));

    afterNextRender(async () => {
      const el = this.canvas()?.nativeElement;
      if (!el || !this.showcase.products().length) return;
      try {
        const { EtalsScene } = await import('../../three/etals-scene');
        this.scene = new EtalsScene(el, this.showcase.products(), (i) => this.showcase.select(i));
        await this.scene.build(this.showcase.index());
        this.ready.set(true);
      } catch (e) {
        console.warn('Scène 3D indisponible, affichage simplifié.', e);
        this.failed.set(true);
      }
    });

    effect(() => {
      const i = this.showcase.index();
      untracked(() => this.scene?.goTo(i));
    });

    inject(DestroyRef).onDestroy(() => this.scene?.dispose());
  }
}
