import type { Product, ScreenLayout } from '../core/catalog.model';

/**
 * Generated paintings: one canvas per solution, painted stroke by stroke.
 * The motif tells the trade (a questionnaire, a thread, tables seen from above…),
 * the palette comes from the product accent stored in the database, plus the brand colours.
 */

export const ART_W = 1024;
export const ART_H = 1280;

type Ctx = CanvasRenderingContext2D;
type Rand = () => number;

const IVORY = '#F1E8D6';
const INK = '#0F2830';
const TEAL = '#047A7F';
const DEEP = '#035C60';
const AQUA = '#43E0D0';
const OCHRE = '#C98B2B';
const CLAY = '#B4532A';

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded generator, so a product always gets the same painting. */
function mulberry(seed: number): Rand {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: [number, number, number]) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mixHex(a: string, b: string, t: number) {
  const A = rgb(a);
  const B = rgb(b);
  return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** A slightly different shade of the same paint, as on a real loaded brush. */
function vary(color: string, r: Rand, amount = 0.07) {
  const k = (r() - 0.5) * 2 * amount;
  return k > 0 ? mixHex(color, '#FFFFFF', k) : mixHex(color, '#000000', -k);
}

function luminance(color: string) {
  const [r, g, b] = rgb(color);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

class Brush {
  constructor(
    readonly c: Ctx,
    readonly r: Rand,
  ) {}

  /** One brush stroke: a loaded core and a few bristle marks along it. */
  stroke(x1: number, y1: number, x2: number, y2: number, w: number, color: string, alpha = 0.8) {
    const { c, r } = this;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const bend = (r() - 0.5) * w * 0.9;
    const mx = (x1 + x2) / 2 + nx * bend;
    const my = (y1 + y2) / 2 + ny * bend;
    c.lineCap = 'round';
    c.globalAlpha = alpha;
    c.strokeStyle = color;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x1, y1);
    c.quadraticCurveTo(mx, my, x2, y2);
    c.stroke();
    const bristles = Math.min(5, 2 + Math.floor(w / 10));
    for (let k = 0; k < bristles; k++) {
      const off = (r() - 0.5) * w * 0.85;
      c.globalAlpha = 0.18 + r() * 0.3;
      c.strokeStyle = vary(color, r, 0.16);
      c.lineWidth = Math.max(1, w * (0.06 + r() * 0.1));
      c.beginPath();
      c.moveTo(x1 + nx * off + dx * 0.04 * r(), y1 + ny * off + dy * 0.04 * r());
      c.quadraticCurveTo(mx + nx * off, my + ny * off, x2 + nx * off - dx * 0.05 * r(), y2 + ny * off - dy * 0.05 * r());
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  /** Fills a polygon with a ragged edge, as paint pushed by hand. */
  private raggedFill(points: [number, number][], color: string, rag: number) {
    const { c, r } = this;
    c.fillStyle = color;
    c.globalAlpha = 1;
    c.beginPath();
    points.forEach(([x, y], i) => {
      const jx = x + (r() - 0.5) * rag;
      const jy = y + (r() - 0.5) * rag;
      if (i === 0) c.moveTo(jx, jy);
      else c.lineTo(jx, jy);
    });
    c.closePath();
    c.fill();
  }

  /** A rectangle of colour, laid down in overlapping strokes. */
  rect(x: number, y: number, w: number, h: number, color: string, o: { dir?: 'h' | 'v'; rag?: number; density?: number; stroke?: number } = {}) {
    const { r } = this;
    const rag = o.rag ?? 8;
    const dir = o.dir ?? (w >= h ? 'h' : 'v');
    const pts: [number, number][] = [];
    const step = 36;
    for (let t = 0; t < w; t += step) pts.push([x + t, y]);
    for (let t = 0; t < h; t += step) pts.push([x + w, y + t]);
    for (let t = w; t > 0; t -= step) pts.push([x + t, y + h]);
    for (let t = h; t > 0; t -= step) pts.push([x, y + t]);
    this.raggedFill(pts, color, rag);
    const sw = o.stroke ?? Math.max(6, Math.min(22, Math.min(w, h) / 5));
    const along = dir === 'h' ? w : h;
    const across = dir === 'h' ? h : w;
    const count = Math.ceil(((w * h) / (sw * Math.min(along, 170))) * (o.density ?? 1.1));
    for (let i = 0; i < count; i++) {
      const len = Math.min(along, 50 + r() * 150);
      const a0 = r() * Math.max(1, along - len) - rag * 0.3;
      const b = r() * across;
      const tilt = (r() - 0.5) * sw * 0.8;
      const col = vary(color, r);
      if (dir === 'h') this.stroke(x + a0, y + b, x + a0 + len, y + b + tilt, sw * (0.6 + r() * 0.6), col, 0.45 + r() * 0.4);
      else this.stroke(x + b, y + a0, x + b + tilt, y + a0 + len, sw * (0.6 + r() * 0.6), col, 0.45 + r() * 0.4);
    }
  }

  /** A disc painted with curved strokes that follow its edge. */
  disc(cx: number, cy: number, rad: number, color: string, density = 1) {
    const { c, r } = this;
    const pts: [number, number][] = [];
    const n = Math.max(24, Math.round(rad / 6));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    this.raggedFill(pts, color, Math.min(10, rad * 0.08));
    const count = Math.ceil(((rad * rad) / 260) * density) + 6;
    c.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const rr = rad * Math.sqrt(r()) * 0.94;
      const a0 = r() * Math.PI * 2;
      const span = 0.25 + r() * 0.7;
      c.globalAlpha = 0.4 + r() * 0.4;
      c.strokeStyle = vary(color, r);
      c.lineWidth = Math.max(3, Math.min(16, rad / 6)) * (0.6 + r() * 0.6);
      c.beginPath();
      c.arc(cx, cy, rr, a0, a0 + span);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  ring(cx: number, cy: number, rad: number, width: number, color: string) {
    const { c, r } = this;
    const steps = 3 + Math.floor(r() * 2);
    for (let k = 0; k < steps; k++) {
      c.globalAlpha = 0.55 + r() * 0.35;
      c.strokeStyle = vary(color, r);
      c.lineWidth = width * (0.7 + r() * 0.4);
      c.lineCap = 'round';
      const a0 = r() * Math.PI * 2;
      c.beginPath();
      c.arc(cx + (r() - 0.5) * 3, cy + (r() - 0.5) * 3, rad, a0, a0 + Math.PI * 2 - r() * 0.3);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  /** A long, hand-drawn line (the lead of a grid, a thread). */
  line(points: [number, number][], width: number, color: string, passes = 3) {
    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < points.length - 1; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];
        const j = width * 0.25;
        this.stroke(x1 + (this.r() - 0.5) * j, y1 + (this.r() - 0.5) * j, x2 + (this.r() - 0.5) * j, y2 + (this.r() - 0.5) * j, width * (0.8 + this.r() * 0.3), vary(color, this.r, 0.05), 0.75);
      }
    }
  }

  poly(points: [number, number][], color: string, density = 1) {
    const { r } = this;
    this.raggedFill(points, color, 7);
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const w = Math.max(...xs) - x0;
    const h = Math.max(...ys) - y0;
    this.c.save();
    this.c.beginPath();
    points.forEach(([x, y], i) => (i ? this.c.lineTo(x, y) : this.c.moveTo(x, y)));
    this.c.closePath();
    this.c.clip();
    const count = Math.ceil(((w * h) / 2400) * density);
    for (let i = 0; i < count; i++) {
      const x = x0 + r() * w;
      const y = y0 + r() * h;
      const len = 40 + r() * 120;
      const a = (r() - 0.5) * 0.5 + (w > h ? 0 : Math.PI / 2);
      this.stroke(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 8 + r() * 10, vary(color, r), 0.5 + r() * 0.3);
    }
    this.c.restore();
  }
}

interface Palette {
  a: string;
  light: string;
  dark: string;
  deep: string;
}

function palette(accent: string): Palette {
  return {
    a: accent,
    light: mixHex(accent, IVORY, 0.5),
    dark: mixHex(accent, INK, 0.42),
    deep: mixHex(accent, INK, 0.7),
  };
}

const COMPOSITIONS: Record<ScreenLayout, (b: Brush, p: Palette) => string> = {
  /** Questionnaire: stacked answer bands, one option chosen in turquoise. */
  form(b, p) {
    const { r } = b;
    const ground = mixHex(IVORY, p.a, 0.08);
    b.rect(0, 0, ART_W, ART_H, ground, { density: 1.3, rag: 0 });
    b.disc(760 + r() * 60, 250, 230, p.light, 0.9);
    b.disc(760, 250, 120, mixHex(p.a, IVORY, 0.25), 0.8);
    const colors = [p.a, p.dark, TEAL, OCHRE, p.light];
    const chosen = 1 + Math.floor(r() * 3);
    for (let i = 0; i < 5; i++) {
      const y = 470 + i * 140;
      const w = 520 + r() * 280;
      b.rect(110, y, w, 92, colors[i % colors.length], { dir: 'h', rag: 10 });
      b.disc(170, y + 46, 30, i === chosen ? AQUA : IVORY, 1.2);
      if (i !== chosen) b.ring(170, y + 46, 30, 6, INK);
    }
    b.line([[110, 1190], [520, 1186], [900, 1192]], 7, INK, 2);
    return ground;
  },

  /** Couture: draped cloth, a bogolan border and a thread drawn across. */
  people(b, p) {
    const { r } = b;
    const ground = p.dark;
    b.rect(0, 0, ART_W, ART_H, ground, { density: 1.3, rag: 0, dir: 'v' });
    b.poly([[-20, 120], [700, 40], [1044, 380], [1044, 640], [380, 520], [-20, 700]], p.a, 1);
    b.poly([[-20, 640], [420, 560], [1044, 700], [1044, 900], [300, 860], [-20, 940]], p.light, 1);
    b.poly([[160, 300], [520, 250], [640, 480], [240, 560]], IVORY, 0.8);
    // Bogolan border: dots, crosses and zigzags on a dark band.
    const y0 = 980;
    b.rect(0, y0, ART_W, 300, INK, { dir: 'h', rag: 6 });
    for (let x = 40; x < ART_W; x += 110) {
      b.disc(x + 15, y0 + 60, 14, IVORY, 1);
      b.line([[x - 10, y0 + 140], [x + 25, y0 + 110], [x + 60, y0 + 140], [x + 95, y0 + 110]], 9, IVORY, 1);
      b.line([[x + 5, y0 + 200], [x + 45, y0 + 240]], 8, OCHRE, 1);
      b.line([[x + 45, y0 + 200], [x + 5, y0 + 240]], 8, OCHRE, 1);
    }
    // The thread and its needle.
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push([60 + t * 860, 860 - Math.sin(t * Math.PI * 1.4) * 520 + (r() - 0.5) * 8]);
    }
    b.line(pts, 6, AQUA, 2);
    const [nx, ny] = pts[pts.length - 1];
    b.stroke(nx - 10, ny + 40, nx + 70, ny - 150, 12, '#D9D4C7', 0.95);
    return ground;
  },

  /** Restaurant: tables seen from above, one set for tonight. */
  floorplan(b, p) {
    const { r } = b;
    const ground = mixHex(p.a, INK, 0.3);
    b.rect(0, 0, ART_W, ART_H, ground, { density: 1.3, rag: 0 });
    b.rect(60, 60, ART_W - 120, ART_H - 120, mixHex(p.a, INK, 0.12), { rag: 14, density: 0.9 });
    const cols = 3;
    const rows = 4;
    const chosen = Math.floor(r() * cols * rows);
    for (let row = 0; row < rows; row++)
      for (let k = 0; k < cols; k++) {
        const cx = 230 + k * 280 + (r() - 0.5) * 24;
        const cy = 230 + row * 270 + (r() - 0.5) * 24;
        const idx = row * cols + k;
        const cloth = idx === chosen ? AQUA : (row + k) % 3 === 0 ? p.light : IVORY;
        for (let s = 0; s < 4; s++) {
          const a = (s / 4) * Math.PI * 2 + Math.PI / 4;
          b.rect(cx + Math.cos(a) * 118 - 26, cy + Math.sin(a) * 118 - 26, 52, 52, p.dark, { rag: 5 });
        }
        if ((row + k) % 2 === 0) b.disc(cx, cy, 92, cloth, 1);
        else b.rect(cx - 88, cy - 88, 176, 176, cloth, { rag: 8 });
        b.ring(cx - 32, cy - 10, 22, 5, mixHex(cloth, INK, 0.25));
        b.ring(cx + 34, cy + 16, 22, 5, mixHex(cloth, INK, 0.25));
      }
    return ground;
  },

  /** Events: a calendar grid, leaded like a stained-glass window. */
  agenda(b, p) {
    const { r } = b;
    const ground = IVORY;
    b.rect(0, 0, ART_W, ART_H, ground, { density: 1.2, rag: 0 });
    const xs = [0, 260 + r() * 80, 560 + r() * 80, 820 + r() * 40, ART_W];
    const ys = [0, 230 + r() * 60, 470 + r() * 60, 760 + r() * 60, 1030 + r() * 40, ART_H];
    const fills = [p.a, p.light, TEAL, OCHRE, INK, p.dark];
    let star = false;
    for (let i = 0; i < xs.length - 1; i++)
      for (let j = 0; j < ys.length - 1; j++) {
        const roll = r();
        if (roll < 0.42) continue;
        const color = !star && roll > 0.9 ? AQUA : fills[Math.floor(r() * fills.length)];
        if (color === AQUA) star = true;
        b.rect(xs[i] + 10, ys[j] + 10, xs[i + 1] - xs[i] - 20, ys[j + 1] - ys[j] - 20, color, { rag: 6 });
      }
    if (!star) b.rect(xs[1] + 10, ys[2] + 10, xs[2] - xs[1] - 20, ys[3] - ys[2] - 20, AQUA, { rag: 6 });
    for (const x of xs.slice(1, -1)) b.line([[x, -10], [x + (r() - 0.5) * 10, ART_H / 2], [x, ART_H + 10]], 22, INK, 2);
    for (const y of ys.slice(1, -1)) b.line([[-10, y], [ART_W / 2, y + (r() - 0.5) * 10], [ART_W + 10, y]], 22, INK, 2);
    return ground;
  },

  /** Mail: a large envelope, others piled behind, a chevron band. */
  orders(b, p) {
    const { r } = b;
    const ground = mixHex(p.a, IVORY, 0.72);
    b.rect(0, 0, ART_W, ART_H, ground, { density: 1.3, rag: 0 });
    for (let x = -40; x < ART_W + 60; x += 120) {
      b.poly([[x, 80], [x + 60, 180], [x + 120, 80], [x + 120, 140], [x + 60, 240], [x, 140]], (x / 120) % 2 ? p.dark : p.a, 0.8);
    }
    const env = (cx: number, cy: number, w: number, h: number, body: string, flap: string, rot: number) => {
      b.c.save();
      b.c.translate(cx, cy);
      b.c.rotate(rot);
      b.rect(-w / 2, -h / 2, w, h, body, { rag: 8 });
      b.poly([[-w / 2, -h / 2], [0, h * 0.08], [w / 2, -h / 2]], flap, 0.9);
      b.line([[-w / 2, h / 2], [0, -h * 0.02], [w / 2, h / 2]], 8, mixHex(body, INK, 0.3), 1);
      b.c.restore();
    };
    env(380, 640, 520, 340, p.light, mixHex(p.light, INK, 0.12), -0.18 + r() * 0.05);
    env(640, 760, 560, 360, TEAL, DEEP, 0.12);
    env(500, 920, 700, 440, p.a, p.dark, -0.04);
    b.disc(760, 880, 46, AQUA, 1.2);
    return ground;
  },

  /** Archives: binders and boxes standing on a shelf. */
  documents(b, p) {
    const { r } = b;
    const ground = mixHex(p.a, INK, 0.62);
    b.rect(0, 0, ART_W, ART_H, ground, { density: 1.3, rag: 0, dir: 'v' });
    const shelves = [520, 1040];
    for (const sy of shelves) {
      let x = 70;
      let aqua = false;
      while (x < ART_W - 110) {
        const w = 60 + r() * 70;
        const h = 240 + r() * 170;
        const colors = [p.a, p.light, IVORY, OCHRE, TEAL, CLAY];
        const color = !aqua && r() > 0.85 ? AQUA : colors[Math.floor(r() * colors.length)];
        if (color === AQUA) aqua = true;
        const lean = r() > 0.82 ? (r() - 0.5) * 0.25 : 0;
        b.c.save();
        b.c.translate(x + w / 2, sy);
        b.c.rotate(lean);
        b.rect(-w / 2, -h, w, h, color, { dir: 'v', rag: 5 });
        b.rect(-w / 2 + 12, -h + 40, w - 24, 46, mixHex(color, IVORY, 0.65), { rag: 3 });
        b.c.restore();
        x += w + 8 + r() * 16;
      }
      b.rect(30, sy, ART_W - 60, 30, mixHex(OCHRE, INK, 0.35), { dir: 'h', rag: 4 });
    }
    return ground;
  },

  /** Growth: a skyline of rising bars under the sun. */
  dashboard(b, p) {
    const { r } = b;
    const ground = mixHex(TEAL, INK, 0.35);
    b.rect(0, 0, ART_W, ART_H, ground, { density: 1.3, rag: 0, dir: 'v' });
    b.disc(330, 360, 210, p.a, 1);
    b.disc(330, 360, 120, mixHex(p.a, IVORY, 0.35), 0.8);
    const n = 9;
    const tallest = 5 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const w = 82;
      const x = 70 + i * 100;
      const h = i === tallest ? 760 : 200 + (i / n) * 380 + r() * 160;
      const color = i === tallest ? AQUA : [p.light, IVORY, p.a, DEEP][i % 4];
      b.rect(x, 1150 - h, w, h, color, { dir: 'v', rag: 6 });
    }
    b.line([[30, 1150], [ART_W / 2, 1146], [ART_W - 30, 1152]], 14, INK, 2);
    return ground;
  },
};

/** Fine linen weave, varnish speckle and a soft vignette over the paint. */
function finish(c: Ctx, r: Rand) {
  c.globalAlpha = 1;
  for (let y = 0; y < ART_H; y += 3) {
    c.fillStyle = `rgba(0,0,0,${0.025 + (y % 6 ? 0 : 0.015)})`;
    c.fillRect(0, y, ART_W, 1);
  }
  for (let x = 0; x < ART_W; x += 3) {
    c.fillStyle = 'rgba(255,255,255,0.03)';
    c.fillRect(x, 0, 1, ART_H);
  }
  for (let i = 0; i < 5000; i++) {
    c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)';
    c.fillRect(r() * ART_W, r() * ART_H, 1 + r() * 2, 1 + r() * 2);
  }
  const g = c.createRadialGradient(ART_W / 2, ART_H / 2, ART_H * 0.35, ART_W / 2, ART_H / 2, ART_H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.22)');
  c.fillStyle = g;
  c.fillRect(0, 0, ART_W, ART_H);
}

const FONT = '"Montserrat Variable", Montserrat, system-ui, sans-serif';

/** Rounded-rectangle path. */
function roundRect(c: Ctx, x: number, y: number, w: number, h: number, rad: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, rad);
}

/**
 * The product's logo, set into the painting on an ivory mount, so each canvas says whose it is.
 * Without a logo, its name is lettered on a tile in the product colour.
 */
function paintEmblem(c: Ctx, b: Brush, p: Product, pal: Palette, logo?: HTMLImageElement) {
  const size = 400;
  const mount = 70;
  const cx = ART_W / 2;
  const cy = 600;
  const x = cx - size / 2;
  const y = cy - size / 2;
  // The mount casts a soft shadow on the paint beneath.
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.38)';
  c.shadowBlur = 50;
  c.shadowOffsetY = 18;
  c.fillStyle = IVORY;
  roundRect(c, x - mount, y - mount, size + mount * 2, size + mount * 2, 18);
  c.fill();
  c.restore();
  // Brushed over, so the mount is paint and not a sticker.
  b.rect(x - mount + 6, y - mount + 6, size + mount * 2 - 12, size + mount * 2 - 12, IVORY, { rag: 4, density: 0.7 });
  b.ring(cx, cy, size * 0.5 + mount * 0.62, 3, mixHex(pal.a, IVORY, 0.45));

  if (logo && logo.naturalWidth) {
    const ratio = logo.naturalWidth / logo.naturalHeight || 1;
    const w = ratio >= 1 ? size : size * ratio;
    const h = ratio >= 1 ? size / ratio : size;
    c.save();
    roundRect(c, cx - w / 2, cy - h / 2, w, h, size * 0.2);
    c.clip();
    c.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
    c.restore();
    return;
  }
  c.fillStyle = pal.dark;
  roundRect(c, x, y, size, size, size * 0.2);
  c.fill();
  b.disc(cx + size * 0.28, cy - size * 0.28, size * 0.12, pal.a, 1.2);
  const name = p.name.trim();
  const words = name.split(/\s+/);
  const lines = words.length > 1 && name.length > 9 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [name];
  c.fillStyle = IVORY;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let fs = 120;
  c.font = `900 ${fs}px ${FONT}`;
  const widest = Math.max(...lines.map((l) => c.measureText(l).width));
  fs = Math.min(fs, Math.floor((fs * (size - 70)) / widest));
  c.font = `900 ${fs}px ${FONT}`;
  lines.forEach((l, k) => c.fillText(l, cx, cy + (k - (lines.length - 1) / 2) * fs * 1.05));
  c.textBaseline = 'alphabetic';
}

/** Paints the solution's canvas. Same product, same painting. */
export function paintArtwork(p: Product, logo?: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ART_W;
  canvas.height = ART_H;
  const c = canvas.getContext('2d')!;
  const r = mulberry(hashString(`${p.slug}:${p.accent}:${p.layout}`));
  const b = new Brush(c, r);
  const compose = COMPOSITIONS[p.layout] ?? COMPOSITIONS.dashboard;
  const pal = palette(p.accent);
  const ground = compose(b, pal);
  paintEmblem(c, b, p, pal, logo);
  finish(c, r);
  // The house signature, bottom right, as a painter signs.
  c.globalAlpha = 0.72;
  c.font = `italic 700 30px ${FONT}`;
  c.textAlign = 'right';
  c.fillStyle = luminance(ground) > 0.55 ? INK : IVORY;
  c.fillText('Selys', ART_W - 46, ART_H - 40);
  c.globalAlpha = 1;
  return canvas;
}
