import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Product } from '../core/catalog.model';
import { drawScreen, screenTexture } from './screen-texture';
import { fontsReady, Stage } from './stage';

const INK = '#0F2830';
const AQUA = '#43E0D0';
const TEAL = '#047A7F';
const FONT = '"Montserrat Variable", Montserrat, system-ui, sans-serif';
const W = 1.7;
const H = 2.3;
const D = 0.6;

function luminance(hex: string) {
  const c = new THREE.Color(hex);
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

/** White or ink, whichever reads better on the product colour. */
function onAccent(hex: string) {
  const l = luminance(hex);
  return (1.05 / (l + 0.05)) >= ((l + 0.05) / (luminance(INK) + 0.05)) ? '#FFFFFF' : INK;
}

function tex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function wrap(c: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (c.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** The Selys mark: four bars, the third raised. */
function mark(c: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, raised: string) {
  const bw = 9 * s;
  const gap = 4 * s;
  for (let i = 0; i < 4; i++) {
    c.fillStyle = i === 2 ? raised : color;
    const top = i === 2 ? y - 8 * s : y;
    c.beginPath();
    c.roundRect(x + i * (bw + gap), top, bw, (i === 2 ? 30 : 30) * s, 2 * s);
    c.fill();
  }
}

/** Loads the product's real screenshot for the cover window; null falls back to the generated screen. */
function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function coverArt(p: Product, real: HTMLImageElement | null) {
  const fg = onAccent(p.accent);
  return tex(850, 1150, (c) => {
    c.fillStyle = p.accent;
    c.fillRect(0, 0, 850, 1150);
    // Product window: the real (or provisional) screen, framed.
    const shot: CanvasImageSource = real ?? drawScreen(p, false);
    c.save();
    c.translate(425, 600);
    c.rotate(-0.05);
    c.fillStyle = 'rgba(15,40,48,.28)';
    c.beginPath();
    c.roundRect(-330 + 14, -210 + 22, 660, 420, 22);
    c.fill();
    c.fillStyle = INK;
    c.beginPath();
    c.roundRect(-330, -210, 660, 420, 22);
    c.fill();
    c.drawImage(shot, -316, -196, 632, 392);
    c.restore();
    mark(c, 60, 80, 1.6, fg, fg === '#FFFFFF' ? INK : '#FFFFFF');
    c.fillStyle = fg;
    c.font = `600 30px ${FONT}`;
    c.fillText('Selys Africa', 160, 118);
    c.font = `900 64px ${FONT}`;
    const lines = wrap(c, p.metier, 730);
    lines.slice(0, 2).forEach((l, i) => c.fillText(l, 60, 230 + i * 70));
    let size = 120;
    c.font = `900 ${size}px ${FONT}`;
    while (c.measureText(p.name).width > 730 && size > 60) {
      size -= 6;
      c.font = `900 ${size}px ${FONT}`;
    }
    c.fillText(p.name, 60, 1060);
    c.font = `600 30px ${FONT}`;
    c.globalAlpha = 0.9;
    wrap(c, p.tagline, 730).slice(0, 1).forEach((l) => c.fillText(l, 60, 930));
    c.globalAlpha = 1;
  });
}

function insideCover(p: Product) {
  return tex(850, 1150, (c) => {
    c.fillStyle = '#FFFFFF';
    c.fillRect(0, 0, 850, 1150);
    c.fillStyle = p.accent;
    c.fillRect(0, 0, 850, 18);
    c.fillStyle = INK;
    c.font = `900 72px ${FONT}`;
    c.fillText(p.name, 60, 150);
    c.font = `500 32px ${FONT}`;
    c.fillStyle = '#2F4A4E';
    const lines = wrap(c, p.description, 730).slice(0, 8);
    lines.forEach((l, i) => c.fillText(l, 60, 230 + i * 46));
    let y = 230 + lines.length * 46 + 70;
    c.font = `700 34px ${FONT}`;
    for (const f of p.features.slice(0, 5)) {
      c.strokeStyle = p.accent;
      c.lineWidth = 7;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(64, y - 12);
      c.lineTo(78, y + 2);
      c.lineTo(104, y - 26);
      c.stroke();
      c.fillStyle = INK;
      c.fillText(f, 130, y);
      y += 64;
    }
    c.font = `700 32px ${FONT}`;
    c.fillStyle = TEAL;
    c.fillText(p.price ?? 'Tarif sur demande', 60, 1080);
  });
}

function spine(p: Product, text: string) {
  const fg = onAccent(p.accent);
  return tex(300, 1150, (c) => {
    c.fillStyle = p.accent;
    c.fillRect(0, 0, 300, 1150);
    c.fillStyle = 'rgba(15,40,48,.12)';
    c.fillRect(0, 0, 300, 1150);
    c.save();
    c.translate(190, 1090);
    c.rotate(-Math.PI / 2);
    c.fillStyle = fg;
    let size = 110;
    c.font = `900 ${size}px ${FONT}`;
    while (c.measureText(text).width > 1000 && size > 40) {
      size -= 6;
      c.font = `900 ${size}px ${FONT}`;
    }
    c.fillText(text, 0, 0);
    c.restore();
  });
}

function plain(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
}

interface Box {
  group: THREE.Group;
  cover: THREE.Group;
  screen: THREE.Mesh;
}

export class CoffretsScene extends Stage {
  private readonly boxes = new Map<number, Box>();
  private readonly holder = new THREE.Group();
  private turntable!: THREE.Group;
  private current: Box | null = null;
  private active = -1;
  private openAmount = 0;
  private isOpen = false;
  private spin = 0;
  private spinVelocity = 0;
  private dragging = false;
  private lastX = 0;
  private idleSince = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly products: Product[],
    private readonly onSelect: (index: number) => void,
  ) {
    super(canvas, 30);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  async build(initial: number) {
    await fontsReady();
    this.scene.add(new THREE.HemisphereLight('#FFFFFF', '#BFE3E0', 1.9));
    const key = new THREE.DirectionalLight('#FFFFFF', 2.4);
    key.position.set(-3.5, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -4;
    key.shadow.camera.right = key.shadow.camera.top = 4;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0006;
    const rim = new THREE.DirectionalLight(AQUA, 1.6);
    rim.position.set(4, 3, -4);
    this.scene.add(key, rim);

    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.16 }));
    catcher.rotation.x = -Math.PI / 2;
    catcher.receiveShadow = true;
    this.scene.add(catcher);

    // Turntable: a white plinth ringed in turquoise.
    this.turntable = new THREE.Group();
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.22, 72), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.35 }));
    plinth.position.y = 0.11;
    plinth.castShadow = plinth.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.025, 8, 96), new THREE.MeshStandardMaterial({ color: AQUA, emissive: AQUA, emissiveIntensity: 0.4 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    this.turntable.add(plinth, ring);
    this.scene.add(this.turntable);
    this.holder.position.y = 0.22;
    this.scene.add(this.holder);

    this.bindPointer();
    await this.show(initial, true);
    this.start();
  }

  private async makeBox(p: Product): Promise<Box> {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.03), [
      new THREE.MeshStandardMaterial({ map: spine(p, p.name), roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: spine(p, p.metier), roughness: 0.5 }),
      plain(p.accent),
      plain(p.accent),
      plain('#1A3238'),
      new THREE.MeshStandardMaterial({ map: insideCover(p), roughness: 0.6 }),
    ]);
    body.position.y = H / 2;
    body.castShadow = true;
    group.add(body);

    // Inside the box: the product screen, glowing in its tray.
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 0.86, W * 0.86 / 1.6),
      new THREE.MeshBasicMaterial({ map: await screenTexture(p), toneMapped: false }),
    );
    screen.position.set(0, H * 0.55, D / 2 + 0.002);
    screen.scale.setScalar(0.001);
    group.add(screen);

    // Gatefold front cover, hinged on the left edge.
    const cover = new THREE.Group();
    cover.position.set(-W / 2, 0, D / 2 + 0.012);
    const board = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.02), [
      plain(p.accent),
      plain(p.accent),
      plain(p.accent),
      plain(p.accent),
      new THREE.MeshStandardMaterial({ map: coverArt(p, await loadImage(p.imageUrl)), roughness: 0.45 }),
      new THREE.MeshStandardMaterial({ map: insideCover(p), roughness: 0.6 }),
    ]);
    board.position.set(W / 2, H / 2, 0);
    board.castShadow = true;
    cover.add(board);
    group.add(cover);
    return { group, cover, screen };
  }

  async show(i: number, instant = false) {
    if (!this.products.length) return;
    const n = this.products.length;
    i = ((i % n) + n) % n;
    if (i === this.active) return;
    const dir = this.active === -1 || i > this.active ? 1 : -1;
    this.active = i;
    const p = this.products[i];
    let box = this.boxes.get(p.id);
    if (!box) {
      box = await this.makeBox(p);
      this.boxes.set(p.id, box);
    }
    if (this.active !== i) return;
    const outgoing = this.current;
    this.current = box;
    this.isOpen = false;
    this.openAmount = 0;
    box.cover.rotation.y = 0;
    box.screen.scale.setScalar(0.001);
    this.spin = 0;
    this.spinVelocity = 0;
    this.holder.add(box.group);
    if (instant || this.reduced) {
      if (outgoing && outgoing !== box) this.holder.remove(outgoing.group);
      box.group.position.set(0, 0, 0);
      box.group.rotation.set(0, 0, 0);
      return;
    }
    if (outgoing && outgoing !== box) {
      const og = outgoing.group;
      const sx = og.position.x;
      this.tween(0, 1, 700, (k) => {
        og.position.x = sx - dir * k * 5;
        og.position.y = Math.sin(k * Math.PI) * 0.4;
        og.rotation.y = -dir * k * 1.2;
      }, () => this.holder.remove(og));
    }
    const g = box.group;
    g.position.set(dir * 5, 0, 0);
    this.tween(0, 1, 1300, (k) => {
      g.position.x = dir * 5 * (1 - k);
      g.position.y = Math.sin(k * Math.PI) * 0.6;
      g.rotation.y = dir * (1 - k) * Math.PI * 1.5;
    });
    this.idleSince = this.clock.getElapsed();
  }

  toggleOpen(): boolean {
    this.isOpen = !this.isOpen;
    this.spin = Math.atan2(Math.sin(this.spin), Math.cos(this.spin));
    this.spinVelocity = 0;
    this.idleSince = this.clock.getElapsed();
    return this.isOpen;
  }

  private bindPointer() {
    const el = this.canvas;
    el.addEventListener('pointerdown', (e) => {
      // Touch: the swipe changes product (handled by the page); rotation is a mouse gesture.
      if (e.pointerType !== 'mouse') return;
      this.dragging = true;
      this.lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      this.spin += dx * 0.012;
      this.spinVelocity = dx * 0.012 * 60;
    });
    const end = () => {
      this.dragging = false;
      this.idleSince = this.clock.getElapsed();
      el.style.cursor = 'grab';
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.style.cursor = 'grab';
  }

  protected override onResize() {
    // Phones show the box alone in a band above the text: centred, framed whole.
    if (this.isSmall()) {
      this.camera.position.set(0, 2.3, 8.4);
      this.camera.lookAt(0, 1.15, 0);
      this.scene.position.x = 0;
      return;
    }
    const portrait = this.aspect < 0.9;
    const dist = portrait ? 13 : 8.6;
    this.camera.position.set(0, portrait ? 2.2 : 2.6, dist);
    this.camera.lookAt(portrait ? 0 : -0.15, portrait ? -0.45 : 1.25, 0);
    // Short wide screens (phone held sideways): push the box further right, clear of the text.
    const short = this.height < 520;
    this.scene.position.x = portrait ? 0 : short ? Math.min(2.4, this.aspect * 0.95) : Math.min(1.6, this.aspect * 0.55);
  }

  protected update(dt: number, time: number) {
    const box = this.current;
    if (!box) return;
    // Spin: drag inertia, then settle back to a gentle sway that keeps the cover readable.
    if (!this.dragging) {
      this.spin += this.spinVelocity * dt;
      this.spinVelocity *= Math.pow(0.04, dt);
      const idle = time - this.idleSince > 2.5 && Math.abs(this.spinVelocity) < 0.05;
      if (idle || this.isOpen) {
        const nearest = Math.round(this.spin / (Math.PI * 2)) * Math.PI * 2;
        const sway = this.reduced || this.isOpen ? 0 : Math.sin(time * 0.5) * 0.38;
        this.spin += (nearest + sway - this.spin) * (1 - Math.pow(0.15, dt));
      }
    }
    this.holder.rotation.y = this.spin;
    this.turntable.rotation.y = this.spin;

    const target = this.isOpen ? 1 : 0;
    this.openAmount += (target - this.openAmount) * (this.reduced ? 1 : 1 - Math.pow(0.02, dt));
    box.cover.rotation.y = -this.openAmount * 2.25;
    box.screen.scale.setScalar(Math.max(0.001, this.openAmount));
    box.screen.position.z = D / 2 + 0.002 + this.openAmount * 0.35;
  }
}
