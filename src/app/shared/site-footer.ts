import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer>
      <img src="/brand/selys-logo-white.png" alt="Selys Africa" width="1835" height="414" />
      <p>Nos innovations vous distinguent.</p>
      <address class="contact">
        <a href="tel:+2250702065271">+225 0702065271</a>
        <span aria-hidden="true">/</span>
        <a href="mailto:hi@selys-africa.com">hi&#64;selys-africa.com</a>
      </address>
      <p class="small">© {{ year }} Selys Africa</p>
    </footer>
  `,
  styles: `
    :host { display: block; background: var(--ink); color: #fff; }
    footer { max-width: 1320px; margin: 0 auto; padding: 56px var(--gutter) 40px; display: grid; gap: 12px; }
    img { height: 34px; width: auto; margin-bottom: 8px; }
    p { font-weight: 600; }
    .contact { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; font-style: normal; font-weight: 600; }
    .contact a { color: #fff; text-decoration: none; padding: 10px 0; }
    .contact a:hover { color: var(--aqua); text-decoration: underline; }
    .contact span { color: #b9cfd1; }
    .small { font-weight: 500; font-size: 0.875rem; color: #b9cfd1; }
  `,
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();
}
