/**
 * The gala opening of the souk, drawn on a full-screen 2D canvas in the Selys colours:
 * stars streak towards the viewer (a jump through space), a flash bursts from the centre with two shockwaves
 * and a spray of sparks, then gold and turquoise glitter drifts down while the veil lifts onto the souk behind.
 */

const AQUA = [67, 224, 208];
const TEAL = [4, 122, 127];
const NIGHT = [2, 41, 43];
const SUN = [242, 169, 0];
const WHITE = [255, 255, 255];
const MINT = [201, 243, 238];

/** Moments of the opening, in seconds. */
const BOOM = 0.85;
export const GALA_SECONDS = 3.6;

type Rgb = number[];
const rgba = (c: Rgb, a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.max(0, Math.min(1, a))})`;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

interface Star {
  a: number;
  d: number;
  z: number;
  c: Rgb;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  c: Rgb;
  w: number;
}
interface Glitter {
  x: number;
  y: number;
  vy: number;
  sway: number;
  phase: number;
  size: number;
  c: Rgb;
  from: number;
}

export interface GalaRun {
  /** Resolves when the opening is over. */
  done: Promise<void>;
  /** Hurries the opening to its end (the visitor is impatient). */
  hurry(): void;
  /** Stops at once, leaving the canvas empty. */
  cancel(): void;
}

export function playGala(canvas: HTMLCanvasElement, onBoom: () => void): GalaRun {
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  const size = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

  const stars: Star[] = Array.from({ length: 260 }, () => ({
    a: rand(0, Math.PI * 2),
    d: rand(0.02, 1),
    z: rand(0.2, 1),
    c: pick([WHITE, WHITE, AQUA, MINT, SUN]),
  }));
  let sparks: Spark[] = [];
  const glitter: Glitter[] = [];

  let t = 0;
  let speed = 1;
  let last = performance.now();
  let boomed = false;
  let frame = 0;
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  let over = false;

  const boom = () => {
    boomed = true;
    onBoom();
    const cx = w / 2;
    const cy = h / 2;
    const reach = Math.hypot(w, h);
    sparks = Array.from({ length: 320 }, () => {
      const a = rand(0, Math.PI * 2);
      const v = rand(0.18, 1.1) * reach;
      return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1.2, 2.4), c: pick([AQUA, AQUA, WHITE, SUN, MINT, TEAL]), w: rand(1, 3.2) };
    });
    for (let i = 0; i < 150; i++) {
      glitter.push({
        x: rand(0, w),
        y: rand(-h * 0.6, h * 0.2),
        vy: rand(40, 130),
        sway: rand(10, 36),
        phase: rand(0, Math.PI * 2),
        size: rand(2, 5.5),
        c: pick([SUN, SUN, AQUA, WHITE, MINT]),
        from: BOOM + rand(0.1, 0.9),
      });
    }
  };

  const draw = (dt: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const reach = Math.hypot(w, h) / 2;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // The night of space closes over the film, then lifts onto the souk after the boom.
    const veil = smooth(0, 0.45, t) * (1 - smooth(BOOM + 0.25, BOOM + 1.6, t));
    if (veil > 0) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
      g.addColorStop(0, rgba(TEAL, veil * 0.85));
      g.addColorStop(0.55, rgba(NIGHT, veil * 0.95));
      g.addColorStop(1, rgba([1, 20, 22], veil));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.globalCompositeOperation = 'lighter';

    // The jump: stars streak outwards, faster and faster, until the boom.
    const warp = smooth(0.05, BOOM, t) * (1 - smooth(BOOM, BOOM + 0.35, t));
    if (warp > 0) {
      for (const s of stars) {
        s.d += dt * (0.25 + 3.2 * warp * warp) * s.z;
        if (s.d > 1.1) s.d = rand(0.02, 0.15);
        const r1 = s.d * reach;
        const r0 = Math.max(0, r1 - reach * (0.02 + 0.32 * warp * warp) * s.z);
        ctx.strokeStyle = rgba(s.c, warp * (0.35 + 0.65 * s.z));
        ctx.lineWidth = 0.6 + 1.8 * s.z * s.d;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0);
        ctx.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1);
        ctx.stroke();
      }
      // The light gathering at the centre before it bursts.
      const core = smooth(0.3, BOOM, t) * (1 - smooth(BOOM, BOOM + 0.1, t));
      if (core > 0) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 + 90 * core);
        g.addColorStop(0, rgba(WHITE, core));
        g.addColorStop(0.4, rgba(AQUA, core * 0.8));
        g.addColorStop(1, rgba(AQUA, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    }

    if (boomed) {
      const k = t - BOOM;
      // The flash: white at the heart, turquoise around, filling the screen for an instant.
      const flash = Math.exp(-k * 4.2) * smooth(0, 0.05, k);
      if (flash > 0.01) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach * (0.4 + 1.4 * smooth(0, 0.3, k)));
        g.addColorStop(0, rgba(WHITE, flash));
        g.addColorStop(0.35, rgba(MINT, flash * 0.9));
        g.addColorStop(0.7, rgba(AQUA, flash * 0.55));
        g.addColorStop(1, rgba(TEAL, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      // Two shockwaves, turquoise then gold.
      for (const [delay, c] of [
        [0, AQUA],
        [0.14, SUN],
      ] as [number, Rgb][]) {
        const q = k - delay;
        if (q <= 0 || q > 1.3) continue;
        const r = reach * 1.25 * (1 - Math.pow(1 - q / 1.3, 3));
        ctx.strokeStyle = rgba(c, (1 - q / 1.3) * 0.9);
        ctx.lineWidth = 2 + 26 * (1 - q / 1.3);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Sparks fly out, slowed by the air, with a short trail.
      for (const p of sparks) {
        if (p.life <= 0) continue;
        const x0 = p.x;
        const y0 = p.y;
        const drag = Math.exp(-dt * 2.4);
        p.vx *= drag;
        p.vy = p.vy * drag + 60 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        const a = clamp01(p.life / 1.2);
        ctx.strokeStyle = rgba(p.c, a);
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(x0 - (p.x - x0) * 2, y0 - (p.y - y0) * 2);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      // Gala glitter: gold and turquoise flakes drifting down, catching the light.
      ctx.globalCompositeOperation = 'source-over';
      for (const g of glitter) {
        if (t < g.from) continue;
        g.y += g.vy * dt;
        const life = smooth(g.from, g.from + 0.2, t) * (1 - smooth(GALA_SECONDS - 0.9, GALA_SECONDS, t));
        const twinkle = 0.55 + 0.45 * Math.sin(t * 9 + g.phase);
        const x = g.x + Math.sin(t * 2.2 + g.phase) * g.sway;
        ctx.save();
        ctx.translate(x, g.y);
        ctx.rotate(t * 3 + g.phase);
        ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(t * 5 + g.phase)));
        ctx.fillStyle = rgba(g.c, life * twinkle);
        ctx.fillRect(-g.size / 2, -g.size / 2, g.size, g.size);
        ctx.restore();
      }
    }
  };

  const finish = () => {
    if (over) return;
    over = true;
    cancelAnimationFrame(frame);
    removeEventListener('resize', size);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resolve();
  };

  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000) * speed;
    last = now;
    t += dt;
    if (!boomed && t >= BOOM) boom();
    draw(dt);
    if (t >= GALA_SECONDS) finish();
    else frame = requestAnimationFrame(loop);
  };
  addEventListener('resize', size);
  frame = requestAnimationFrame(loop);

  return {
    done,
    hurry: () => {
      speed = 2.6;
    },
    cancel: finish,
  };
}
