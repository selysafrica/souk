import * as THREE from 'three';

export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Exponential ease-out: fast start, long settle. */
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export interface Tween {
  from: number;
  to: number;
  start: number;
  duration: number;
  apply: (v: number) => void;
  done?: () => void;
}

/**
 * Owns the renderer, the resize handling and the frame loop.
 * The loop sleeps when the canvas is off screen or the tab is hidden.
 */
export abstract class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  protected readonly reduced = prefersReducedMotion();
  protected readonly clock = new THREE.Timer();
  protected tweens: Tween[] = [];
  protected width = 1;
  protected height = 1;
  private frame = 0;
  private visible = true;
  private readonly ro: ResizeObserver;
  private readonly io: IntersectionObserver;
  private readonly onVisibility = () => this.syncLoop();

  constructor(protected readonly canvas: HTMLCanvasElement, fov = 35) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isSmall() ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.syncLoop();
    });
    this.io.observe(canvas);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  protected isSmall() {
    return window.innerWidth < 760;
  }

  get aspect() {
    return this.width / this.height;
  }

  start() {
    this.resize();
    this.syncLoop();
  }

  private syncLoop() {
    const shouldRun = this.visible && document.visibilityState === 'visible';
    if (shouldRun && !this.frame) {
      this.clock.reset();
      const loop = (ts: number) => {
        this.frame = requestAnimationFrame(loop);
        this.clock.update(ts);
        this.tick();
      };
      this.frame = requestAnimationFrame(loop);
    } else if (!shouldRun && this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  private tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsed();
    const now = performance.now();
    if (this.tweens.length) {
      const live: Tween[] = [];
      for (const t of this.tweens) {
        const k = this.reduced ? 1 : Math.min(1, (now - t.start) / t.duration);
        t.apply(t.from + (t.to - t.from) * easeOutExpo(k));
        if (k < 1) live.push(t);
        else t.done?.();
      }
      this.tweens = live;
    }
    this.update(dt, elapsed);
    this.renderer.render(this.scene, this.camera);
  }

  protected tween(from: number, to: number, duration: number, apply: (v: number) => void, done?: () => void) {
    this.tweens.push({ from, to, start: performance.now(), duration, apply, done });
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.onResize();
  }

  protected onResize() {}

  protected abstract update(dt: number, time: number): void;

  dispose() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.clock.dispose();
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const m of mats) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
    });
    this.renderer.dispose();
  }
}

/** Waits for the brand face so canvas-drawn lettering uses it. */
export async function fontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all([
    document.fonts.load('900 64px "Montserrat Variable"'),
    document.fonts.load('600 32px "Montserrat Variable"'),
  ]).catch(() => undefined);
}

export function mix(hexA: string, hexB: string, t: number) {
  return new THREE.Color(hexA).lerp(new THREE.Color(hexB), t);
}
