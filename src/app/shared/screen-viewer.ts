import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import type { Product } from '../core/catalog.model';
import { Sound } from '../core/sound';
import { Icon } from './icon';

type View = 'desktop' | 'mobile';

/** Full-screen view of a product's real screenshots (native modal dialog, pinch-zoom on phones). */
@Component({
  selector: 'app-screen-viewer',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="viewer" [attr.aria-label]="product() ? 'Écrans de ' + product()!.name : null" (close)="onClose()" (click)="backdrop($event)">
      @if (product(); as p) {
        <div class="bar">
          <p class="title">{{ p.name }} <span>· {{ p.metier }}</span></p>
          @if (p.imageUrl && p.mobileImageUrl) {
            <div class="views" role="tablist" aria-label="Format de l’écran">
              <button type="button" role="tab" [attr.aria-selected]="view() === 'desktop'" (click)="view.set('desktop'); sound.play('tap')">Ordinateur</button>
              <button type="button" role="tab" [attr.aria-selected]="view() === 'mobile'" (click)="view.set('mobile'); sound.play('tap')">Téléphone</button>
            </div>
          }
          <button type="button" class="close" (click)="close()" aria-label="Fermer"><app-icon name="close" /></button>
        </div>
        <div class="body" [class.is-mobile]="src(p).mobile">
          @if (src(p).mobile) {
            <div class="phone"><img [src]="src(p).url" [alt]="'Écran de ' + p.name + ' sur téléphone'" /></div>
          } @else {
            <img [src]="src(p).url" [alt]="'Écran de ' + p.name + ' sur ordinateur'" />
          }
        </div>
        <p class="note">Capture réalisée avec des données de démonstration.</p>
      }
    </dialog>
  `,
  styles: `
    .viewer {
      width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
      flex-direction: column; background: rgba(2, 30, 32, 0.97); color: #fff; font-family: var(--font);
    }
    .viewer[open] { display: flex; animation: appear .3s var(--ease-out); }
    .viewer::backdrop { background: rgba(2, 30, 32, 0.6); }
    .bar { display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px clamp(16px, 3vw, 32px); }
    .title { margin: 0 auto 0 0; font-weight: 800; font-size: 1.125rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .title span { font-weight: 500; opacity: .75; }
    .views { display: flex; padding: 4px; border-radius: 999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); }
    .views button {
      min-height: 38px; padding: 0 14px; border: 0; border-radius: 999px; background: none; color: #c9e4e2;
      font: inherit; font-size: .875rem; font-weight: 700; cursor: pointer;
    }
    .views button[aria-selected='true'] { background: #43e0d0; color: #0f2830; }
    .close {
      width: 48px; height: 48px; flex: none; display: grid; place-items: center; border-radius: 50%;
      border: 1px solid rgba(255,255,255,.3); background: transparent; color: #fff; cursor: pointer;
    }
    .close:hover { background: rgba(255,255,255,.1); }
    .close app-icon { --icon: 22px; }
    /* Native pinch-zoom and panning on phones. */
    .body {
      flex: 1; min-height: 0; overflow: auto; touch-action: pan-x pan-y pinch-zoom;
      display: flex; justify-content: center; align-items: flex-start; padding: 8px clamp(16px, 3vw, 40px) 8px;
    }
    .body img {
      display: block; width: min(100%, 1500px); height: auto; border-radius: 12px;
      box-shadow: 0 30px 60px -24px rgba(0,0,0,.8);
    }
    /* Phone: the whole screen, framed as a phone, fitted to the available height. */
    .body.is-mobile { align-items: center; }
    .phone {
      flex: none; height: 100%; max-height: 900px; aspect-ratio: 780 / 1688; max-width: 100%;
      padding: 10px; border-radius: 34px; background: #0b1416;
      box-shadow: 0 0 0 2px #3c5c63, 0 30px 60px -24px rgba(0,0,0,.8);
    }
    .phone img { width: 100%; height: 100%; object-fit: contain; border-radius: 24px; box-shadow: none; }
    @media (min-width: 761px) { .body:not(.is-mobile) { align-items: center; } .body:not(.is-mobile) img { max-height: calc(100dvh - 130px); width: auto; max-width: 100%; } }
    .note { margin: 0; padding: 6px 16px 14px; text-align: center; font-size: .8125rem; color: #9fc4c1; }
    @keyframes appear { from { opacity: 0; transform: scale(.985); } }
  `,
})
export class ScreenViewer {
  protected readonly sound = inject(Sound);
  protected readonly product = signal<Product | null>(null);
  protected readonly view = signal<View>('desktop');
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Opens on the format that suits the screen the visitor is using. */
  open(p: Product) {
    if (!p.imageUrl && !p.mobileImageUrl) return;
    const phone = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 760px)').matches;
    this.view.set((phone && p.mobileImageUrl) || !p.imageUrl ? 'mobile' : 'desktop');
    this.product.set(p);
    this.dialog().nativeElement.showModal();
    this.sound.play('open');
  }

  protected onClose() {
    this.product.set(null);
    this.sound.play('close');
  }

  close() {
    this.dialog().nativeElement.close();
  }

  protected src(p: Product) {
    const mobile = this.view() === 'mobile' ? !!p.mobileImageUrl : !p.imageUrl;
    return { url: (mobile ? p.mobileImageUrl : p.imageUrl)!, mobile };
  }

  /** A click on the dark area around the image closes the viewer. */
  protected backdrop(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (t === this.dialog().nativeElement || t.classList.contains('body')) this.close();
  }
}
