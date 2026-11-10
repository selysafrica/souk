import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Showcase } from '../core/showcase';
import { Icon } from './icon';

type Status = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-demo-form',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="demo" id="demo" aria-labelledby="demo-title">
      <div class="intro">
        <h2 id="demo-title">{{ title() }}</h2>
        <p>Dites-nous quel logiciel vous intéresse. L’équipe Selys Africa vous recontacte pour vous le montrer en marche.</p>
      </div>
      @if (status() === 'sent') {
        <div class="done" role="status">
          <app-icon name="check" />
          <div>
            <p class="done-title">Merci {{ name }}, votre demande est bien partie.</p>
            <p>Nous vous répondons au {{ contact }}.</p>
            <button type="button" class="again" (click)="reset()">Faire une autre demande</button>
          </div>
        </div>
      } @else {
        <form (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="demo-name">Votre nom</label>
            <input id="demo-name" name="name" autocomplete="name" required [(ngModel)]="name" />
          </div>
          <div class="field">
            <label for="demo-contact">E-mail ou téléphone</label>
            <input id="demo-contact" name="contact" autocomplete="email" inputmode="email" required [(ngModel)]="contact"
              [attr.aria-invalid]="status() === 'error' ? 'true' : null" aria-describedby="demo-contact-help" />
            <p class="help" id="demo-contact-help">Pour que l’on puisse vous répondre. Rien d’autre.</p>
          </div>
          <div class="field field--wide">
            <label for="demo-product">Le logiciel</label>
            <select id="demo-product" name="product" [ngModel]="showcase.demoSlug()" (ngModelChange)="showcase.demoSlug.set($event)">
              @for (p of showcase.products(); track p.id) {
                <option [value]="p.slug">{{ p.name }} · {{ p.metier }}</option>
              }
              <option value="">Je ne sais pas encore</option>
            </select>
          </div>
          <div class="field field--wide">
            <label for="demo-message">Votre besoin <span class="opt">(facultatif)</span></label>
            <textarea id="demo-message" name="message" rows="4" [(ngModel)]="message"></textarea>
          </div>
          @if (status() === 'error') {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <button class="btn btn--primary" type="submit" [disabled]="status() === 'sending'">
            @if (status() === 'sending') { Envoi en cours… } @else { <app-icon name="send" /> Envoyer ma demande }
          </button>
        </form>
      }
    </section>
  `,
  styles: `
    :host { display: block; background: var(--ground); color: var(--fg); }
    .demo {
      max-width: 1320px; margin: 0 auto; padding: clamp(72px, 10vw, 140px) var(--gutter);
      display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: clamp(32px, 6vw, 96px); align-items: start;
    }
    h2 { font-size: clamp(2.2rem, 5vw, 4rem); font-weight: 900; letter-spacing: -0.03em; margin-bottom: 18px; }
    .intro p { font-size: 1.125rem; color: var(--fg-2); max-width: 32rem; }
    form { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 20px; }
    .field { display: grid; gap: 8px; align-content: start; }
    .field--wide, .error, form > .btn { grid-column: 1 / -1; }
    form > .btn { justify-self: start; }
    label { font-weight: 700; font-size: 0.9375rem; }
    .opt { font-weight: 500; color: var(--fg-2); }
    input, select, textarea {
      width: 100%; min-height: 52px; padding: 12px 16px; border-radius: 14px;
      border: 2px solid var(--line); background: color-mix(in srgb, var(--fg) 8%, transparent);
      color: var(--fg); font-size: 1rem; caret-color: var(--action);
      transition: border-color .2s var(--ease-out), background-color .2s var(--ease-out);
    }
    select option { color: #0f2830; }
    textarea { resize: vertical; min-height: 120px; }
    input:hover, select:hover, textarea:hover { border-color: color-mix(in srgb, var(--fg) 55%, transparent); }
    input:focus-visible, select:focus-visible, textarea:focus-visible { outline: none; border-color: var(--action); background: color-mix(in srgb, var(--fg) 12%, transparent); }
    input[aria-invalid='true'] { border-color: #ffb4a8; }
    .help { font-size: 0.875rem; color: var(--fg-2); }
    .error { padding: 14px 18px; border-radius: 14px; background: #fff1ee; color: var(--danger); font-weight: 600; }
    .done { display: flex; gap: 18px; align-items: flex-start; padding: 28px; border-radius: 22px; background: color-mix(in srgb, var(--fg) 10%, transparent); border: 1px solid var(--line); }
    .done app-icon { --icon: 32px; color: var(--action); }
    .done-title { font-size: 1.375rem; font-weight: 800; margin-bottom: 6px; }
    .again { margin-top: 14px; background: none; border: 0; padding: 0; min-height: 44px; font-weight: 700; text-decoration: underline; cursor: pointer; }
    @media (max-width: 860px) {
      .demo { grid-template-columns: 1fr; }
      form { grid-template-columns: 1fr; }
    }
  `,
})
export class DemoForm {
  protected readonly showcase = inject(Showcase);
  readonly title = input('Voir un logiciel en marche');
  protected name = '';
  protected contact = '';
  protected message = '';
  protected readonly status = signal<Status>('idle');
  protected readonly error = signal('');

  protected async submit() {
    if (!this.name.trim() || !this.contact.trim()) {
      this.error.set('Indiquez votre nom et un e-mail ou un téléphone pour que l’on puisse vous répondre.');
      this.status.set('error');
      return;
    }
    this.status.set('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.name, contact: this.contact, productSlug: this.showcase.demoSlug(), message: this.message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Envoi impossible pour le moment.');
      }
      this.status.set('sent');
    } catch (e) {
      this.error.set(e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Connexion perdue : vérifiez votre réseau puis réessayez.');
      this.status.set('error');
    }
  }

  protected reset() {
    this.message = '';
    this.status.set('idle');
  }
}
