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
import type { AppareilsScene } from '../../three/appareils-scene';

@Component({
  selector: 'app-appareils',
  imports: [SiteHeader, CatalogIndex, DemoForm, SiteFooter, Icon, SceneNav, Swipe],
  providers: [Showcase],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './appareils.html',
  styleUrl: './appareils.scss',
})
export class Appareils {
  readonly catalog = input.required<CatalogData>();
  protected readonly showcase = inject(Showcase);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  protected readonly ready = signal(false);
  private scene: AppareilsScene | null = null;

  constructor() {
    effect(() => untracked(() => this.showcase.init(this.catalog().products)));

    afterNextRender(async () => {
      const el = this.canvas()?.nativeElement;
      if (!el || !this.showcase.products().length) return;
      try {
        const { AppareilsScene } = await import('../../three/appareils-scene');
        this.scene = new AppareilsScene(el, this.showcase.products());
        await this.scene.build(this.showcase.index());
        this.ready.set(true);
      } catch (e) {
        console.warn('Scène 3D indisponible, affichage simplifié.', e);
      }
    });

    effect(() => {
      const i = this.showcase.index();
      untracked(() => void this.scene?.show(i));
    });

    inject(DestroyRef).onDestroy(() => this.scene?.dispose());
  }
}
