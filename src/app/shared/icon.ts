import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName = 'arrow-left' | 'arrow-right' | 'check' | 'chat' | 'rotate' | 'open' | 'send' | 'logout' | 'plus' | 'trash' | 'up' | 'down' | 'eye' | 'eye-off';

/** One authored icon set: 24px grid, 2px round strokes. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  styles: `:host { display: inline-flex; flex: none; width: var(--icon, 1.2em); height: var(--icon, 1.2em); } svg { width: 100%; height: 100%; }`,
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      @switch (name()) {
        @case ('arrow-left') { <path d="M19 12H5M11 6l-6 6 6 6" /> }
        @case ('arrow-right') { <path d="M5 12h14M13 6l6 6-6 6" /> }
        @case ('check') { <path d="M5 12.5l4.5 4.5L19 7.5" /> }
        @case ('chat') { <path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /> }
        @case ('rotate') { <path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v4.5h-4.5" /> }
        @case ('open') { <path d="M4 9l8-5 8 5" /><path d="M4 9v10h16V9" /><path d="M9 14h6" /> }
        @case ('send') { <path d="M4 12l16-8-6 16-2.5-6.5z" /><path d="M11.5 13.5L20 4" /> }
        @case ('logout') { <path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /> }
        @case ('plus') { <path d="M12 5v14M5 12h14" /> }
        @case ('trash') { <path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /> }
        @case ('up') { <path d="M12 19V5M6 11l6-6 6 6" /> }
        @case ('down') { <path d="M12 5v14M6 13l6 6 6-6" /> }
        @case ('eye') { <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /> }
        @case ('eye-off') { <path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.2 6.2C3.6 8 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.4-1" /> }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
}
