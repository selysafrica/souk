import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { CatalogData } from '../core/catalog.model';
import { Appareils } from '../designs/appareils/appareils';
import { Coffrets } from '../designs/coffrets/coffrets';
import { Etals } from '../designs/etals/etals';

/** The public home shows whichever presentation the admin chose. */
@Component({
  selector: 'app-home',
  imports: [Etals, Coffrets, Appareils],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (catalog().defaultDesign) {
      @case ('coffrets') { <app-coffrets [catalog]="catalog()" /> }
      @case ('appareils') { <app-appareils [catalog]="catalog()" /> }
      @default { <app-etals [catalog]="catalog()" /> }
    }
  `,
})
export class Home {
  readonly catalog = input.required<CatalogData>();
}
