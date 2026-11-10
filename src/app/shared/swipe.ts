import { Directive, ElementRef, inject, NgZone, OnDestroy, OnInit, output } from '@angular/core';

/**
 * Horizontal swipe on touch screens (and pens). Vertical movement is left to the page,
 * so the scene never traps scrolling. Mouse drags are ignored: on desktop the scenes keep
 * their own pointer interactions.
 */
@Directive({ selector: '[appSwipe]' })
export class Swipe implements OnInit, OnDestroy {
  readonly swipeLeft = output<void>();
  readonly swipeRight = output<void>();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private start: { x: number; y: number; t: number; id: number } | null = null;

  private readonly down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || (e.target as HTMLElement).closest('button, a')) return;
    this.start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  };

  private readonly up = (e: PointerEvent) => {
    const s = this.start;
    this.start = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3 || performance.now() - s.t > 800) return;
    navigator.vibrate?.(8);
    this.zone.run(() => (dx < 0 ? this.swipeLeft.emit() : this.swipeRight.emit()));
  };

  private readonly cancel = () => (this.start = null);

  ngOnInit() {
    this.zone.runOutsideAngular(() => {
      this.el.addEventListener('pointerdown', this.down, { passive: true });
      this.el.addEventListener('pointerup', this.up, { passive: true });
      this.el.addEventListener('pointercancel', this.cancel, { passive: true });
    });
  }

  ngOnDestroy() {
    this.el.removeEventListener('pointerdown', this.down);
    this.el.removeEventListener('pointerup', this.up);
    this.el.removeEventListener('pointercancel', this.cancel);
  }
}
