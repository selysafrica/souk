import * as THREE from 'three';
import type { Product } from '../core/catalog.model';

type Ctx = CanvasRenderingContext2D;
const FONT = '"Montserrat Variable", Montserrat, system-ui, sans-serif';
const INK = '#0F2830';
const MUTED = '#9DB3B5';
const LINE = '#E2EBEC';

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
}

function text(c: Ctx, s: string, x: number, y: number, size: number, weight: number, color: string, align: CanvasTextAlign = 'left') {
  c.font = `${weight} ${size}px ${FONT}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = 'alphabetic';
  c.fillText(s, x, y);
}

function bar(c: Ctx, x: number, y: number, w: number, h = 10, color = LINE) {
  rr(c, x, y, w, h, h / 2, color);
}

function tint(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Draws the product's working surface. Synthetic: real screenshots replace it via imageUrl. */
function drawContent(c: Ctx, p: Product, x: number, y: number, w: number, h: number, mobile: boolean) {
  const a = p.accent;
  const s = mobile ? 0.9 : 1;
  switch (p.layout) {
    case 'form': {
      const cw = Math.min(w - 40, 560);
      const cx = x + (w - cw) / 2;
      rr(c, cx, y + 20, cw, h - 40, 18, '#FFFFFF');
      text(c, 'Question 2 sur 5', cx + 32, y + 66, 16 * s, 600, MUTED);
      text(c, 'Quel service vous intéresse ?', cx + 32, y + 108, 28 * s, 800, INK);
      const opts = ['Création de site', 'Application mobile', 'Formation', 'Autre'];
      opts.forEach((o, i) => {
        const oy = y + 140 + i * 66 * s;
        const on = i === 1;
        rr(c, cx + 32, oy, cw - 64, 50 * s, 12, on ? tint(a, 0.14) : '#F3F7F7');
        c.strokeStyle = on ? a : LINE;
        c.lineWidth = 2;
        c.beginPath();
        c.roundRect(cx + 32, oy, cw - 64, 50 * s, 12);
        c.stroke();
        text(c, o, cx + 56, oy + 32 * s, 18 * s, on ? 700 : 500, INK);
      });
      rr(c, cx + 32, y + h - 100, 170, 52, 26, a);
      text(c, 'Suivant', cx + 117, y + h - 67, 18, 700, '#FFFFFF', 'center');
      break;
    }
    case 'people': {
      text(c, 'Mes clients', x + 24, y + 44, 26 * s, 800, INK);
      const names = ['Awa K.', 'Koffi B.', 'Mariam T.', 'Yao A.', 'Fatou D.', 'Serge N.', 'Inès O.'];
      const rows = mobile ? 6 : 7;
      for (let i = 0; i < rows; i++) {
        const ry = y + 70 + i * 74 * s;
        rr(c, x + 20, ry, w - 40, 62 * s, 14, '#FFFFFF');
        c.beginPath();
        c.arc(x + 56, ry + 31 * s, 20 * s, 0, Math.PI * 2);
        c.fillStyle = i % 3 === 0 ? a : tint(a, 0.25 + (i % 3) * 0.2);
        c.fill();
        text(c, names[i], x + 92, ry + 28 * s, 18 * s, 700, INK);
        bar(c, x + 92, ry + 40 * s, 120 * s, 8);
        const status = ['Coupe', 'Essayage', 'Prête', 'Couture'][i % 4];
        rr(c, x + w - 150 * s, ry + 16 * s, 110 * s, 30 * s, 15 * s, i % 4 === 2 ? a : '#EEF4F4');
        text(c, status, x + w - 95 * s, ry + 36 * s, 14 * s, 700, i % 4 === 2 ? '#FFFFFF' : INK, 'center');
      }
      break;
    }
    case 'floorplan': {
      text(c, 'Salle principale · ce soir', x + 24, y + 44, 24 * s, 800, INK);
      rr(c, x + 20, y + 64, w - 40, h - 84, 18, '#FFFFFF');
      const cols = mobile ? 3 : 5;
      const rows = mobile ? 5 : 3;
      const gw = (w - 80) / cols;
      const gh = (h - 124) / rows;
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < cols; k++) {
          const tx = x + 40 + k * gw + gw / 2;
          const ty = y + 94 + r * gh + gh / 2;
          const taken = (r * cols + k) % 3 === 0;
          const chosen = r === 1 && k === 1;
          const fill = chosen ? a : taken ? '#D5E1E2' : tint(a, 0.12);
          if ((r + k) % 2 === 0) {
            c.beginPath();
            c.arc(tx, ty, Math.min(gw, gh) * 0.3, 0, Math.PI * 2);
            c.fillStyle = fill;
            c.fill();
          } else rr(c, tx - gw * 0.3, ty - gh * 0.22, gw * 0.6, gh * 0.44, 10, fill);
          text(c, String(r * cols + k + 1), tx, ty + 6, 16 * s, 800, chosen ? '#FFFFFF' : INK, 'center');
        }
      break;
    }
    case 'agenda': {
      text(c, 'Programme · Jour 1', x + 24, y + 44, 24 * s, 800, INK);
      const slots = ['08:30', '09:30', '11:00', '13:00', '14:30', '16:00'];
      slots.forEach((t, i) => {
        const ry = y + 70 + i * 72 * s;
        text(c, t, x + 24, ry + 36 * s, 16 * s, 700, MUTED);
        const bw = (w - 140) * (0.55 + ((i * 37) % 40) / 100);
        rr(c, x + 110, ry + 6, bw, 56 * s, 12, i === 2 ? a : i % 2 ? tint(a, 0.18) : '#FFFFFF');
        bar(c, x + 130, ry + 26 * s, Math.min(220, bw - 40), 10, i === 2 ? 'rgba(255,255,255,.8)' : '#C8D8DA');
        bar(c, x + 130, ry + 44 * s, Math.min(140, bw - 60), 8, i === 2 ? 'rgba(255,255,255,.55)' : LINE);
      });
      break;
    }
    case 'orders': {
      text(c, 'Courrier entrant', x + 24, y + 44, 24 * s, 800, INK);
      rr(c, x + 20, y + 64, w - 40, h - 84, 18, '#FFFFFF');
      const st = ['Reçu', 'Orienté', 'En cours', 'Traité'];
      const rows = mobile ? 8 : 7;
      for (let i = 0; i < rows; i++) {
        const ry = y + 84 + i * ((h - 120) / rows);
        if (i) bar(c, x + 40, ry - 8, w - 80, 2, LINE);
        text(c, `N° 2026-${String(318 - i).padStart(4, '0')}`, x + 40, ry + 24, 15 * s, 700, INK);
        if (!mobile) bar(c, x + 220, ry + 14, (w - 460) * (0.5 + (i % 3) * 0.2), 10, '#DCE7E8');
        const k = i % 4;
        rr(c, x + w - 170 * s, ry + 4, 120 * s, 30 * s, 15 * s, k === 3 ? a : tint(a, 0.14));
        text(c, st[k], x + w - 110 * s, ry + 25 * s, 14 * s, 700, k === 3 ? '#FFFFFF' : INK, 'center');
      }
      break;
    }
    case 'documents': {
      text(c, 'Archives · Ressources humaines', x + 24, y + 44, 22 * s, 800, INK);
      const cols = mobile ? 2 : 4;
      const gw = (w - 40 - (cols - 1) * 16) / cols;
      for (let i = 0; i < cols * 2; i++) {
        const gx = x + 20 + (i % cols) * (gw + 16);
        const gy = y + 70 + Math.floor(i / cols) * (mobile ? 250 : 230);
        rr(c, gx, gy, gw, mobile ? 230 : 210, 14, '#FFFFFF');
        rr(c, gx + 16, gy + 16, gw - 32, mobile ? 130 : 110, 10, i === 0 ? a : tint(a, 0.1 + (i % 3) * 0.08));
        for (let l = 0; l < 4; l++) bar(c, gx + 30, gy + 34 + l * 20, (gw - 80) * (l === 3 ? 0.5 : 1), 6, i === 0 ? 'rgba(255,255,255,.7)' : 'rgba(15,40,48,.12)');
        bar(c, gx + 16, gy + (mobile ? 166 : 146), gw * 0.6, 10, '#C8D8DA');
        bar(c, gx + 16, gy + (mobile ? 186 : 166), gw * 0.35, 8, LINE);
      }
      break;
    }
    default: {
      text(c, 'Vue d’ensemble', x + 24, y + 44, 24 * s, 800, INK);
      const kc = mobile ? 2 : 3;
      const kw = (w - 40 - (kc - 1) * 16) / kc;
      for (let i = 0; i < kc; i++) {
        rr(c, x + 20 + i * (kw + 16), y + 64, kw, 110, 14, i === 0 ? a : '#FFFFFF');
        bar(c, x + 40 + i * (kw + 16), y + 92, kw * 0.4, 10, i === 0 ? 'rgba(255,255,255,.7)' : '#C8D8DA');
        bar(c, x + 40 + i * (kw + 16), y + 120, kw * 0.6, 26, i === 0 ? '#FFFFFF' : tint(a, 0.35));
      }
      rr(c, x + 20, y + 192, w - 40, h - 212, 14, '#FFFFFF');
      const n = mobile ? 7 : 12;
      const bw = (w - 100) / n;
      for (let i = 0; i < n; i++) {
        const bh = (h - 300) * (0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + 0.6)));
        rr(c, x + 50 + i * bw, y + h - 50 - bh, bw * 0.6, bh, 6, i === n - 3 ? a : tint(a, 0.3));
      }
    }
  }
}

function drawScreen(p: Product, mobile: boolean): HTMLCanvasElement {
  const W = mobile ? 540 : 1280;
  const H = mobile ? 1120 : 800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#F3F7F7';
  c.fillRect(0, 0, W, H);
  const top = mobile ? 96 : 72;
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, W, top);
  bar(c, 0, top - 2, W, 2, LINE);
  rr(c, 24, top / 2 - 16, 32, 32, 9, p.accent);
  text(c, p.name, 70, top / 2 + 9, mobile ? 26 : 24, 800, INK);
  let x = 0;
  if (!mobile) {
    c.fillStyle = INK;
    c.fillRect(0, top, 220, H - top);
    for (let i = 0; i < 7; i++) {
      const on = i === 1;
      if (on) rr(c, 14, top + 24 + i * 52, 192, 40, 10, 'rgba(255,255,255,.08)');
      rr(c, 30, top + 36 + i * 52, 16, 16, 5, on ? p.accent : '#3C5C63');
      bar(c, 58, top + 39 + i * 52, 90 + ((i * 29) % 50), 10, on ? '#FFFFFF' : '#3C5C63');
    }
    x = 220;
  } else {
    c.beginPath();
    c.arc(W - 48, top / 2, 18, 0, Math.PI * 2);
    c.fillStyle = '#E2EBEC';
    c.fill();
  }
  drawContent(c, p, x + 16, top + 8, W - x - 32, H - top - (mobile ? 40 : 24), mobile);
  // Provisional label, kept until the team uploads real screenshots.
  c.font = `600 ${mobile ? 18 : 15}px ${FONT}`;
  const label = 'Visuel provisoire';
  const lw = c.measureText(label).width + 24;
  rr(c, W - lw - 16, H - (mobile ? 50 : 42), lw, mobile ? 34 : 28, 14, 'rgba(15,40,48,.78)');
  text(c, label, W - lw / 2 - 16, H - (mobile ? 27 : 23), mobile ? 18 : 15, 600, '#FFFFFF', 'center');
  return canvas;
}

const cache = new Map<string, Promise<THREE.Texture>>();

/** Product screen texture: the uploaded visual when there is one, otherwise a generated, labelled screen. */
export function screenTexture(p: Product, mobile = false): Promise<THREE.Texture> {
  const url = mobile ? p.mobileImageUrl : p.imageUrl;
  const key = `${p.id}:${p.accent}:${p.layout}:${url}:${mobile}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      if (url) {
        try {
          const loader = new THREE.TextureLoader();
          loader.setCrossOrigin('anonymous');
          const t = await loader.loadAsync(url);
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 4;
          return t;
        } catch {
          /* fall back to the generated screen */
        }
      }
      const t = new THREE.CanvasTexture(drawScreen(p, mobile));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    })();
    cache.set(key, hit);
  }
  return hit;
}

export { drawScreen, rr, text as drawText, tint };
