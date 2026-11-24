import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { CatalogData } from '../core/catalog.model';
import { Galerie } from '../designs/galerie/galerie';

/** The public home is the souk: the corridor of paintings that ends in the salon. */
@Component({
  selector: 'app-home',
  imports: [Galerie],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-galerie [catalog]="catalog()" />`,
})
export class Home {
  readonly catalog = input.required<CatalogData>();
}
