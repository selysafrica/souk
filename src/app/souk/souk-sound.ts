import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { Sound } from '../core/sound';

/** Sound and playlist, in the glass language of the Souk nav. Off until the visitor turns it on. */
@Component({
  selector: 'app-souk-sound',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="glass-btn snd" (click)="toggle()" [attr.aria-expanded]="open()" aria-controls="souk-sound-panel"
      [attr.aria-label]="'Son et musique : ' + (sound.enabled() ? 'activé' : 'coupé')" [class.on]="sound.enabled()">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        @if (sound.enabled()) { <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> } @else { <path d="M16 9.5l5 5M21 9.5l-5 5" /> }
      </svg>
    </button>
    @if (open()) {
      <div class="panel" id="souk-sound-panel" role="dialog" aria-label="Son et musique" (keydown.escape)="open.set(false)">
        <div class="row">
          <span class="label">Son et musique</span>
          <button type="button" class="switch" role="switch" [attr.aria-checked]="sound.enabled()" (click)="sound.toggle()">
            <span></span><span class="sr">{{ sound.enabled() ? 'Couper le son' : 'Activer le son' }}</span>
          </button>
        </div>
        <ul class="list" role="radiogroup" aria-label="Playlist">
          @for (t of sound.playlist(); track t.key) {
            <li>
              <button type="button" role="radio" [attr.aria-checked]="t.key === sound.current()" (click)="sound.choose(t.key)">
                <span class="dot" aria-hidden="true"></span><span class="t">{{ t.title }}</span><span class="s">{{ t.subtitle }}</span>
              </button>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    :host { position: relative; display: inline-flex; }
    .snd {
      width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%;
      border: 1px solid #FFFFFF; background: rgba(255,255,255,.55); color: #3A3646; cursor: pointer;
    }
    .snd.on { background: #17151F; color: #F4F2F7; border-color: #17151F; }
    .panel {
      position: absolute; right: 0; top: calc(100% + 12px); z-index: 30; width: min(300px, calc(100vw - 32px));
      padding: 16px; border-radius: 26px; background: rgba(255,255,255,.82); border: 1px solid #FFFFFF;
      backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5);
      box-shadow: 0 20px 60px -30px rgba(70,50,150,.35); color: #17151F;
      animation: k-rise .5s cubic-bezier(.2,.7,.1,1) both;
    }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .label { font-size: 15px; font-weight: 500; }
    .switch { width: 48px; height: 28px; padding: 3px; border: 0; border-radius: 999px; background: #E2DEEA; cursor: pointer; display: flex; }
    .switch > span:first-child { width: 22px; height: 22px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 2px 6px rgba(23,21,31,.2); transition: transform .3s cubic-bezier(.2,.7,.1,1); }
    .switch[aria-checked='true'] { background: #17151F; }
    .switch[aria-checked='true'] > span:first-child { transform: translateX(20px); }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    .list button {
      width: 100%; min-height: 48px; display: grid; grid-template-columns: 18px 1fr; column-gap: 10px; align-items: center;
      padding: 6px 12px; border: 1px solid transparent; border-radius: 16px; background: none; color: #17151F; font: inherit; text-align: left; cursor: pointer;
    }
    .list button:hover { background: rgba(255,255,255,.7); }
    .list button[aria-checked='true'] { background: #FFFFFF; border-color: #E2DEEA; }
    .dot { grid-row: span 2; width: 14px; height: 14px; border-radius: 50%; background: #E2DEEA; }
    [aria-checked='true'] .dot { background: radial-gradient(circle at 32% 28%, #FFFFFF 0%, rgba(255,255,255,0) 45%), conic-gradient(from 210deg, #C9B8FF, #9EE7E3, #FFD3B8, #FFB8DE, #C9B8FF); }
    .t { font-size: 15px; }
    .s { grid-column: 2; font-size: 13px; color: #5E5A6B; }
    @media (max-width: 820px) { .panel { position: fixed; left: 16px; right: 16px; top: 88px; width: auto; } }
  `,
})
export class SoukSound {
  protected readonly sound = inject(Sound);
  protected readonly open = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const close = (e: Event) => {
        if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
      };
      document.addEventListener('pointerdown', close);
      destroy.onDestroy(() => document.removeEventListener('pointerdown', close));
    });
  }

  protected toggle() {
    this.open.update((v) => !v);
    if (this.open()) void this.sound.loadPlaylist();
  }
}
