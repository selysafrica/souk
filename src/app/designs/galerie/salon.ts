import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Basket } from '../../core/basket';
import type { Product } from '../../core/catalog.model';
import { Sound } from '../../core/sound';
import { Icon } from '../../shared/icon';

type Step = 'name' | 'contact' | 'message' | 'sent';
const ORDER: Step[] = ['name', 'contact', 'message', 'sent'];

/** "BeaForm", "BeaForm et Tablée", "BeaForm, Tablée et BeaGec". */
function list(names: string[]) {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
}

/**
 * The salon at the end of the souk: the visitor's basket, and a conversation
 * with the Selys hostesses that collects the demo request one question at a time.
 */
@Component({
  selector: 'app-salon',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="salon" id="salon" aria-labelledby="salon-title">
      <header class="head">
        <h2 id="salon-title">Le salon Selys</h2>
        <p>Vous voici au bout du souk. Retrouvez votre panier et dites à nos hôtesses ce qui vous ferait plaisir de voir en marche.</p>
      </header>

      <div class="grid">
        <aside class="basket" aria-labelledby="basket-title">
          <h3 id="basket-title"><app-icon name="basket" /> Mon panier <span class="count">{{ items().length }}</span></h3>
          @if (items().length) {
            <ul>
              @for (p of items(); track p.id) {
                <li [style.--p]="p.accent">
                  <span class="swatch" aria-hidden="true"></span>
                  <div class="what">
                    <strong>{{ p.name }}</strong>
                    <span>{{ p.metier }}</span>
                  </div>
                  <span class="price">{{ p.price ?? 'Sur demande' }}</span>
                  <button type="button" class="remove" (click)="remove(p)" [attr.aria-label]="'Retirer ' + p.name + ' du panier'"><app-icon name="close" /></button>
                </li>
              }
            </ul>
          } @else {
            <p class="empty">Votre panier est vide. Remontez le souk et touchez « Ajouter à mon panier » sous les tableaux qui vous parlent.</p>
          }
          <button type="button" class="back" (click)="back.emit()"><app-icon name="arrow-left" /> Retour à l’accueil</button>
        </aside>

        <form class="talk" id="demo" (ngSubmit)="answer()" novalidate aria-labelledby="talk-title">
          <div class="talk-head">
            <span class="avatar" aria-hidden="true">
              <svg viewBox="0 0 40 40"><rect x="9" y="13" width="4" height="16" rx="1.5" /><rect x="15" y="13" width="4" height="16" rx="1.5" /><rect class="up" x="21" y="9" width="4" height="16" rx="1.5" /><rect x="27" y="13" width="4" height="16" rx="1.5" /></svg>
            </span>
            <div>
              <p class="who" id="talk-title">Les hôtesses Selys</p>
              <p class="status"><span class="live" aria-hidden="true"></span>Au salon, elles vous répondent ici</p>
            </div>
          </div>

          <ol class="thread" aria-live="polite">
            <li class="msg host">{{ greeting() }}</li>
            <li class="msg host">
              @if (step() === 'name') { <label for="talk-name">Pour commencer, comment vous appelez-vous ?</label> }
              @else { Pour commencer, comment vous appelez-vous ? }
            </li>
            @if (reached('contact')) {
              <li class="msg me">{{ name }} @if (step() !== 'sent') { <button type="button" class="edit" (click)="goBack('name')">Modifier</button> }</li>
              <li class="msg host">
                @if (step() === 'contact') { <label for="talk-contact">Enchantée, {{ firstName() }}. Sur quel e-mail ou numéro de téléphone pouvons-nous vous recontacter ?</label> }
                @else { Enchantée, {{ firstName() }}. Sur quel e-mail ou numéro de téléphone pouvons-nous vous recontacter ? }
              </li>
            }
            @if (reached('message')) {
              <li class="msg me">{{ contact }} @if (step() !== 'sent') { <button type="button" class="edit" (click)="goBack('contact')">Modifier</button> }</li>
              <li class="msg host">
                @if (step() === 'message') { <label for="talk-message">C’est noté. Un mot sur votre besoin ou votre activité ? C’est facultatif.</label> }
                @else { C’est noté. Un mot sur votre besoin ou votre activité ? C’est facultatif. }
              </li>
            }
            @if (step() === 'sent') {
              @if (message.trim()) { <li class="msg me">{{ message }}</li> }
              <li class="msg host done">
                <app-icon name="check" />
                <span>Merci {{ firstName() }} ! Votre demande{{ sentFor() ? ' pour ' + sentFor() : '' }} est bien partie. L’équipe Selys Africa vous recontacte au {{ contact }} pour organiser votre démonstration.</span>
              </li>
            }
            @if (error()) {
              <li class="msg host error" role="alert">{{ error() }}</li>
            }
          </ol>

          <div class="composer">
            @switch (step()) {
              @case ('name') {
                <input id="talk-name" name="name" autocomplete="name" required [(ngModel)]="name" placeholder="Votre nom" />
                <button class="btn btn--primary" type="submit">Répondre <app-icon name="send" /></button>
              }
              @case ('contact') {
                <input id="talk-contact" name="contact" autocomplete="email" inputmode="email" required [(ngModel)]="contact" placeholder="E-mail ou téléphone"
                  [attr.aria-invalid]="error() ? 'true' : null" aria-describedby="talk-contact-help" />
                <button class="btn btn--primary" type="submit">Répondre <app-icon name="send" /></button>
                <p class="help" id="talk-contact-help">Uniquement pour vous répondre.</p>
              }
              @case ('message') {
                <textarea id="talk-message" name="message" rows="3" [(ngModel)]="message" placeholder="Par exemple : un atelier de couture de 6 personnes à Abidjan"></textarea>
                <button class="btn btn--primary" type="submit" [disabled]="sending()">
                  @if (sending()) { Envoi en cours… } @else { <app-icon name="send" /> Envoyer ma demande }
                </button>
              }
              @case ('sent') {
                <button class="btn btn--ghost" type="button" (click)="restart()">Faire une autre demande</button>
              }
            }
          </div>
        </form>
      </div>
    </section>
  `,
  styleUrl: './salon.scss',
})
export class Salon {
  readonly items = input.required<Product[]>();
  /** A hostess answers: 0 or 1, for the scene to animate. */
  readonly talk = output<number>();
  readonly back = output<void>();
  private readonly basket = inject(Basket);
  private readonly sound = inject(Sound);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly step = signal<Step>('name');
  protected readonly error = signal('');
  protected readonly sending = signal(false);
  protected readonly sentFor = signal('');
  protected name = '';
  protected contact = '';
  protected message = '';

  protected readonly greeting = computed(() => {
    const names = this.items().map((p) => p.name);
    if (!names.length) return 'Bonjour et bienvenue au salon Selys. Votre panier est encore vide : dites-nous simplement ce qui vous amène, nous vous orienterons vers la bonne solution.';
    return `Bonjour et bienvenue au salon Selys. Vous avez retenu ${list(names)} : nous allons organiser une démonstration rien que pour vous.`;
  });

  protected firstName() {
    return this.name.trim().split(/\s+/)[0] ?? '';
  }

  protected reached(s: Step) {
    return ORDER.indexOf(this.step()) >= ORDER.indexOf(s);
  }

  protected remove(p: Product) {
    this.basket.remove(p.slug);
    this.sound.play('close');
  }

  protected async answer() {
    this.error.set('');
    const step = this.step();
    if (step === 'name') {
      if (!this.name.trim()) return this.fail('Je n’ai pas saisi votre nom. Comment dois-je vous appeler ?');
      return this.go('contact');
    }
    if (step === 'contact') {
      const c = this.contact.trim();
      if (!c) return this.fail('Il nous faut un e-mail ou un numéro de téléphone pour vous répondre.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) && !/^\+?[\d\s().-]{6,}$/.test(c))
        return this.fail('Ce contact ne ressemble ni à un e-mail ni à un numéro de téléphone. Pouvez-vous le vérifier ?');
      return this.go('message');
    }
    if (step === 'message') await this.send();
  }

  private async send() {
    this.sending.set(true);
    const slugs = this.items().map((p) => p.slug);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.name, contact: this.contact, productSlugs: slugs, message: this.message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Envoi impossible pour le moment.');
      }
      this.sentFor.set(list(this.items().map((p) => p.name)));
      this.go('sent');
    } catch (e) {
      this.fail(e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'La connexion a été perdue. Vérifiez votre réseau, puis renvoyez votre demande.');
    } finally {
      this.sending.set(false);
    }
  }

  private go(next: Step) {
    this.step.set(next);
    this.sound.play('tap');
    this.talk.emit(next === 'contact' ? 1 : 0);
    this.focusComposer();
  }

  private fail(message: string) {
    this.error.set(message);
    this.talk.emit(1);
    this.focusComposer();
  }

  protected goBack(s: Step) {
    this.error.set('');
    this.step.set(s);
    this.focusComposer();
  }

  protected restart() {
    this.message = '';
    this.sentFor.set('');
    this.step.set('message');
    this.focusComposer();
  }

  private focusComposer() {
    setTimeout(() => {
      // The latest message stays in view.
      const thread = this.host.nativeElement.querySelector<HTMLElement>('.thread');
      if (thread) thread.scrollTop = thread.scrollHeight;
      const el = this.host.nativeElement.querySelector<HTMLElement>('.composer input, .composer textarea, .composer button');
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }
}
