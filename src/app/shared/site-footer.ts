import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer>
      <img src="/brand/selys-logo-white.png" alt="Selys Africa" width="1835" height="414" />
      <p>Nos innovations vous distinguent.</p>
      <p class="small">© {{ year }} Selys Africa · Visuels d’écran provisoires, en attendant les captures officielles.</p>
    </footer>
  `,
  styles: `
    :host { display: block; background: var(--ink); color: #fff; }
    footer { max-width: 1320px; margin: 0 auto; padding: 56px var(--gutter) 40px; display: grid; gap: 12px; }
    img { height: 34px; width: auto; margin-bottom: 8px; }
    p { font-weight: 600; }
    .small { font-weight: 500; font-size: 0.875rem; color: #b9cfd1; }
  `,
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();
}
