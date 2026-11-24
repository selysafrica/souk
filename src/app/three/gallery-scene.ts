import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Product } from '../core/catalog.model';
import { ART_H, ART_W, paintArtwork } from './artwork';
import { fontsReady, Stage } from './stage';

const TEAL = '#047A7F';
const DEEP = '#035C60';
const NIGHT = '#02292B';
const AQUA = '#43E0D0';
const INK = '#0F2830';
const IVORY = '#F1E8D6';
const FONT = '"Montserrat Variable", Montserrat, system-ui, sans-serif';

/** Ceiling of the ring corridor, and of the central salon. */
const H = 3.6;
const H_SALON = 5.2;
const HALF = 2.2;
const WALL_T = 0.32;
const DOOR_W = 2.8;
const DOOR_H = 2.75;
const EYE = 1.62;
/** Hung paintings, in metres (4:5 canvas). */
const ART_WIDTH = 1.5;
const ART_HEIGHT = (ART_WIDTH * ART_H) / ART_W;
const ART_Y = 1.62;
const FRAME = 0.09;
const LIGHTS = 4;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Advances a critically damped spring towards `target`: no overshoot, and its speed never jumps,
 * so the camera eases into each move however jerky the scroll that drives it.
 * Split into small steps, so a slow frame keeps the same timing and stays stable.
 */
function spring(x: number, v: number, target: number, k: number, dt: number): [number, number] {
  const steps = Math.max(1, Math.ceil(dt * 120));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    v += (k * k * (target - x) - 2 * k * v) * h;
    x += v * h;
  }
  return [x, v];
}

interface Intro {
  t: number;
  /** Progress per second: raised when the visitor is impatient, so the move ends quickly instead of cutting. */
  speed: number;
  /** Where the camera starts: back down the corridor, a little higher, with a wide lens. */
  from: { pos: THREE.Vector3; look: THREE.Vector3 };
  onDone: () => void;
}

interface Painting {
  group: THREE.Group;
  center: THREE.Vector3;
  theta: number;
  fixture: THREE.Vector3;
}

/** How a member of the team looks: figurines in the Selys spirit, not portraits. */
interface Look {
  /** Top of the head, in metres. */
  height: number;
  skin: string;
  hair: string;
  jacket: string;
  shirt: string;
  /** Trousers, or a skirt in the jacket's colour. */
  skirt: boolean;
  /** Hair gathered in a bun, with small gold earrings. */
  bun: boolean;
  /** The arm that waves: 1 on the visitor's right, -1 on their left. */
  waveSide: 1 | -1;
  /** What they say when the visitor walks into the salon. */
  hello: string;
  along: number;
  across: number;
  turn: number;
}

/** An arm, jointed at the shoulder and the elbow. */
interface Arm {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  side: 1 | -1;
}

/** A member of the team behind the counter: turns to the visitor, breathes, blinks, waves and talks. */
interface Hostess {
  group: THREE.Group;
  /** Everything that turns towards the visitor. */
  body: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  eyes: THREE.Mesh[];
  mouth: THREE.Mesh;
  arms: Arm[];
  look: Look;
  /** When they last answered the visitor (scene clock). */
  nodAt: number;
  /** When they wave to the visitor (scene clock). */
  waveAt: number;
  phase: number;
  bubble: SpeechBubble;
}

/** A speech bubble over a person's head, drawn on a canvas: a line of text, or "…" while typing. */
interface SpeechBubble {
  sprite: THREE.Sprite;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  text: string | null;
  from: number;
  until: number;
  /** Last drawn state, so the canvas is only redrawn when it changes. */
  drawn: string;
}

/** The team at the counter. The counter (1.02 m) hides them below the waist. */
const STAFF: Look[] = [
  { height: 1.78, skin: '#6B4330', hair: '#17110D', jacket: '#1F2B4D', shirt: '#F4F1EA', skirt: false, bun: false, waveSide: 1, hello: 'Bienvenue au salon !', along: -2.05, across: 0.62, turn: 0.12 },
  { height: 1.68, skin: '#7A4A32', hair: '#1B1310', jacket: '#C2372E', shirt: '#E2CDB8', skirt: true, bun: true, waveSide: -1, hello: 'Bonjour, installez-vous.', along: -2.15, across: -0.66, turn: -0.1 },
];

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = false) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function noise(c: CanvasRenderingContext2D, w: number, h: number, n: number, alpha: number, size = 3) {
  for (let i = 0; i < n; i++) {
    c.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    const s = 1 + Math.random() * size;
    c.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}

/** Lime plaster: soft mottling, darker at the floor and ceiling (baked contact shading). */
function plasterTexture() {
  return canvasTexture(1024, 512, (c) => {
    c.fillStyle = '#FFFFFF';
    c.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = 20 + Math.random() * 80;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const a = Math.random() * 0.05;
      g.addColorStop(0, Math.random() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    noise(c, 1024, 512, 9000, 0.035, 2);
    const v = c.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0, 'rgba(0,0,0,0.22)');
    v.addColorStop(0.07, 'rgba(0,0,0,0)');
    v.addColorStop(0.88, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.38)');
    c.fillStyle = v;
    c.fillRect(0, 0, 1024, 512);
  }, true);
}

/** Oak boards, laid along the corridor. One tile is 2.4 m square. */
function parquetTexture() {
  return canvasTexture(1024, 1024, (c) => {
    const rows = 15;
    const rh = 1024 / rows;
    for (let row = 0; row < rows; row++) {
      let x = -Math.random() * 300;
      while (x < 1024) {
        const len = 260 + Math.random() * 420;
        const l = 44 + Math.random() * 12;
        c.fillStyle = `hsl(${28 + Math.random() * 6}, ${36 + Math.random() * 10}%, ${l}%)`;
        c.fillRect(x, row * rh, len, rh);
        for (let g = 0; g < 14; g++) {
          c.strokeStyle = `rgba(60,35,15,${0.05 + Math.random() * 0.1})`;
          c.lineWidth = 1 + Math.random() * 1.5;
          const gy = row * rh + Math.random() * rh;
          c.beginPath();
          c.moveTo(x, gy);
          c.bezierCurveTo(x + len * 0.3, gy + (Math.random() - 0.5) * 8, x + len * 0.7, gy + (Math.random() - 0.5) * 8, x + len, gy);
          c.stroke();
        }
        c.fillStyle = 'rgba(40,22,10,.55)';
        c.fillRect(x, row * rh, 2, rh);
        x += len;
      }
      c.fillStyle = 'rgba(40,22,10,.5)';
      c.fillRect(0, row * rh, 1024, 2);
    }
    noise(c, 1024, 1024, 12000, 0.03, 2);
  }, true);
}

/** Polished limestone slabs for the salon. */
function stoneTexture() {
  return canvasTexture(1024, 1024, (c) => {
    const n = 4;
    const s = 1024 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        c.fillStyle = `hsl(36, ${14 + Math.random() * 6}%, ${80 + Math.random() * 5}%)`;
        c.fillRect(i * s, j * s, s, s);
        for (let v = 0; v < 3; v++) {
          c.strokeStyle = `rgba(120,100,80,${0.06 + Math.random() * 0.06})`;
          c.lineWidth = 1 + Math.random() * 2;
          c.beginPath();
          c.moveTo(i * s + Math.random() * s, j * s);
          c.bezierCurveTo(i * s + Math.random() * s, j * s + s * 0.3, i * s + Math.random() * s, j * s + s * 0.7, i * s + Math.random() * s, j * s + s);
          c.stroke();
        }
        c.fillStyle = 'rgba(90,75,60,.35)';
        c.fillRect(i * s, j * s, s, 2);
        c.fillRect(i * s, j * s, 2, s);
      }
    noise(c, 1024, 1024, 9000, 0.025, 2);
  }, true);
}

function rugTexture() {
  return canvasTexture(1024, 1024, (c) => {
    c.fillStyle = DEEP;
    c.fillRect(0, 0, 1024, 1024);
    const rings: [number, string][] = [[500, TEAL], [470, DEEP], [440, AQUA], [430, DEEP], [300, TEAL], [290, IVORY], [282, TEAL]];
    for (const [r, col] of rings) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(512, 512, r, 0, Math.PI * 2);
      c.fill();
    }
    noise(c, 1024, 1024, 30000, 0.05, 2);
  });
}

/** Woven basket. */
function weaveTexture() {
  return canvasTexture(256, 128, (c) => {
    c.fillStyle = '#B8874B';
    c.fillRect(0, 0, 256, 128);
    for (let y = 0; y < 128; y += 16)
      for (let x = 0; x < 256; x += 16) {
        c.fillStyle = (x / 16 + y / 16) % 2 ? '#9A6B35' : '#D2A465';
        c.fillRect(x + 1, y + 1, 14, 14);
      }
  }, true);
}

/** A curved wall label (cylinder segment), lettered on canvas. */
function wallTextTexture(lines: { text: string; size: number; weight: number; color: string; gap?: number }[], w: number, h: number, logo?: HTMLImageElement) {
  return canvasTexture(w, h, (c) => {
    c.clearRect(0, 0, w, h);
    let y = 0;
    if (logo) {
      const lh = h * 0.24;
      const lw = (logo.width / logo.height) * lh;
      c.drawImage(logo, 0, 0, lw, lh);
      y = lh + h * 0.12;
    }
    c.textBaseline = 'top';
    for (const l of lines) {
      c.font = `${l.weight} ${l.size}px ${FONT}`;
      c.fillStyle = l.color;
      c.fillText(l.text, 0, y);
      y += l.size * 1.12 + (l.gap ?? 0);
    }
  });
}

function loadImage(url: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    // A logo hosted elsewhere must allow CORS, or it would taint the WebGL texture; without it, the fallback is used.
    if (/^https?:/.test(url)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(undefined);
    img.src = url;
  });
}

/** The visitor's path is driven by scroll: the page tells the scene where the visitor is. */
export class GalleryScene extends Stage {
  readonly n: number;
  readonly rMid: number;
  readonly rIn: number;
  readonly rOut: number;
  /** Angle between two paintings. */
  readonly phi: number;
  readonly thetaDoor: number;
  private paintings: Painting[] = [];
  private spots: { light: THREE.SpotLight; index: number }[] = [];
  private hostesses: Hostess[] = [];
  private basketItems = new THREE.Group();
  private salonGroup = new THREE.Group();
  private exitPos!: THREE.CatmullRomCurve3;
  private exitLook!: THREE.CatmullRomCurve3;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly pointerSmooth = new THREE.Vector2();
  private envTexture: THREE.Texture | null = null;
  /** Where the visitor stands: -1 entrance, i in front of painting i, n in the salon. */
  private c = -1;
  /** Walking speed along the corridor, for the spring that follows the scroll. */
  private cV = 0;
  private cTarget = -1;
  /** When the scroll last moved the visitor (scene clock). */
  private movedAt = -10;
  /** 0 walking, 1 standing in front of painting `dwellAt`. */
  private dwell = 0;
  /** Speed of `dwell`: the step towards a painting is a damped spring, so it starts, turns and stops without a jolt. */
  private dwellV = 0;
  private dwellAt = -1;
  /** The visitor chose to stand at `dwellAt`, at scroll position `anchor`. */
  private standing = false;
  private anchor = 0;
  /** The opening flight, while it plays. */
  private intro: Intro | null = null;
  /** The team has greeted the visitor on this visit to the salon. */
  private greeted = false;
  private greetedAt = -100;
  /** Last standing state reported to the page, so it is only told about changes. */
  private reported = { at: -2, amount: -1 };
  private stride = 0;
  private readonly lastPos = new THREE.Vector3();
  private shiftX = 0;
  private shiftY = 0;
  private rStop = 0;
  private downAt: { x: number; y: number } | null = null;
  /** Walls stop clicks from reaching what lies behind them. */
  private readonly occluders: THREE.Object3D[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    private readonly products: Product[],
    private readonly onPainting: (index: number) => void,
    private readonly onSalon: () => void,
    /** The visitor stands in front of painting `index`: 0 walking by, 1 facing it. */
    private readonly onStand: (index: number, amount: number) => void = () => {},
  ) {
    super(canvas, 50);
    this.n = products.length;
    this.rMid = Math.max(10.5, ((this.n + 2.4) * 6.6) / (Math.PI * 2));
    this.rIn = this.rMid - HALF;
    this.rOut = this.rMid + HALF;
    this.phi = (Math.PI * 2) / (this.n + 2.4);
    this.thetaDoor = (this.n + 0.85) * this.phi;
    this.rStop = this.rIn + 0.8;
    this.scene.background = new THREE.Color(NIGHT);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = !this.isSmall();
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  /** Point on the ring: angle θ, distance r from the centre, height y. */
  private at(theta: number, r: number, y: number) {
    return new THREE.Vector3(r * Math.sin(theta), y, r * Math.cos(theta));
  }

  private tangent(theta: number) {
    return new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
  }

  async build(initialProgress: number) {
    await fontsReady();
    const logo = await loadImage('/brand/selys-logo-white.png');
    const logos = await Promise.all(this.products.map((p) => (p.logoUrl ? loadImage(p.logoUrl) : Promise.resolve(undefined))));
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 0.32;

    this.buildCorridor(logo);
    for (let i = 0; i < this.n; i++) {
      this.paintings.push(this.buildPainting(this.products[i], i, logos[i]));
      // Paint one canvas per frame budget, so the page never freezes.
      if (i % 2 === 1) await new Promise((r) => setTimeout(r));
    }
    this.buildLights();
    this.buildSalon(logo);
    this.buildExit();
    this.bindPointer();
    this.setProgress(initialProgress, true);
    this.start();
  }

  // ---------------------------------------------------------------- corridor

  private buildCorridor(logo?: HTMLImageElement) {
    const { rIn, rOut, rMid } = this;
    const gap = DOOR_W / rIn;
    const tex = plasterTexture();
    const wallMat = (repeat: number, side: THREE.Side) => {
      const map = tex.clone();
      map.repeat.set(repeat, 1);
      map.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ color: TEAL, map, bumpMap: map, bumpScale: 0.6, roughness: 0.92, side });
    };

    const outer = new THREE.Mesh(new THREE.CylinderGeometry(rOut, rOut, H, 320, 1, true), wallMat((Math.PI * 2 * rOut) / 4, THREE.BackSide));
    outer.position.y = H / 2;
    outer.receiveShadow = true;
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(rIn, rIn, H, 240, 1, true, this.thetaDoor + gap / 2, Math.PI * 2 - gap),
      wallMat((Math.PI * 2 * rIn) / 4, THREE.FrontSide),
    );
    inner.position.y = H / 2;
    inner.receiveShadow = true;
    const lintel = new THREE.Mesh(
      new THREE.CylinderGeometry(rIn, rIn, H - DOOR_H, 16, 1, true, this.thetaDoor - gap / 2, gap),
      new THREE.MeshStandardMaterial({ color: TEAL, roughness: 0.9 }),
    );
    lintel.position.y = DOOR_H + (H - DOOR_H) / 2;
    this.scene.add(outer, inner, lintel);
    this.occluders.push(outer, inner, lintel);

    // Door reveals and soffit, the thickness of the wall.
    const reveal = new THREE.MeshStandardMaterial({ color: IVORY, roughness: 0.8, side: THREE.DoubleSide });
    for (const e of [-1, 1]) {
      const th = this.thetaDoor + (e * gap) / 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(WALL_T, DOOR_H), reveal);
      m.position.copy(this.at(th, rIn - WALL_T / 2, DOOR_H / 2));
      m.rotation.y = th - Math.PI / 2;
      this.scene.add(m);
    }
    const soffit = new THREE.Mesh(new THREE.RingGeometry(rIn - WALL_T, rIn, 8, 1, Math.PI / 2 - (this.thetaDoor + gap / 2), gap), reveal);
    soffit.rotation.x = Math.PI / 2;
    soffit.position.y = DOOR_H;
    this.scene.add(soffit);

    // Oak floor, boards following the curve.
    const floorGeo = new THREE.RingGeometry(rIn - WALL_T, rOut, 320, 4);
    this.ringUv(floorGeo, 320, 2.4);
    const floorMap = parquetTexture();
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.42, metalness: 0, bumpMap: floorMap, bumpScale: 0.3 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // A dark ceiling that recedes, as in an exhibition hall, with a fine line of light along the corridor.
    const ceiling = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 240, 1), new THREE.MeshStandardMaterial({ color: '#1A2426', roughness: 0.9 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = H;
    const diffuser = new THREE.Mesh(new THREE.RingGeometry(rMid - 0.32, rMid - 0.22, 240, 1), new THREE.MeshBasicMaterial({ color: '#FFF6E8' }));
    diffuser.rotation.x = Math.PI / 2;
    diffuser.position.y = H - 0.01;
    this.scene.add(ceiling, diffuser);

    // Lighting track near the outer wall.
    const black = new THREE.MeshStandardMaterial({ color: '#111517', roughness: 0.4, metalness: 0.6 });
    const track = new THREE.Mesh(new THREE.TorusGeometry(rOut - 0.95, 0.022, 6, 360), black);
    track.rotation.x = Math.PI / 2;
    track.position.y = H - 0.1;
    this.scene.add(track);

    // Skirting with a turquoise line of light: the raised bar of the logo, run along the floor.
    const skirting = new THREE.Mesh(new THREE.CylinderGeometry(rOut - 0.015, rOut - 0.015, 0.12, 320, 1, true), new THREE.MeshStandardMaterial({ color: INK, roughness: 0.5, side: THREE.BackSide }));
    skirting.position.y = 0.06;
    const led = new THREE.Mesh(new THREE.TorusGeometry(rOut - 0.03, 0.006, 4, 360), new THREE.MeshBasicMaterial({ color: AQUA }));
    led.rotation.x = Math.PI / 2;
    led.position.y = 0.125;
    const innerSkirting = new THREE.Mesh(
      new THREE.CylinderGeometry(rIn + 0.015, rIn + 0.015, 0.12, 240, 1, true, this.thetaDoor + gap / 2, Math.PI * 2 - gap),
      new THREE.MeshStandardMaterial({ color: INK, roughness: 0.5 }),
    );
    innerSkirting.position.y = 0.06;
    this.scene.add(skirting, led, innerSkirting);

    // Benches against the inner wall, between paintings.
    const oak = new THREE.MeshStandardMaterial({ color: '#A57A4F', roughness: 0.55 });
    for (let i = 0; i < this.n - 1; i += 2) {
      const th = (i + 1.5) * this.phi;
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.07, 0.46, 2, 0.02), oak);
      seat.position.y = 0.44;
      seat.castShadow = seat.receiveShadow = true;
      bench.add(seat);
      for (const x of [-0.7, 0.7]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.4), black);
        leg.position.set(x, 0.21, 0);
        leg.castShadow = true;
        bench.add(leg);
      }
      bench.position.copy(this.at(th, rIn + 0.5, 0));
      bench.rotation.y = th;
      this.scene.add(bench);
    }

    // Entrance lettering on the outer wall.
    const lettering = wallTextTexture(
      [
        { text: 'Le souk', size: 118, weight: 900, color: '#FFFFFF' },
        { text: 'Le marché des produits', size: 72, weight: 600, color: '#C9F3EE', gap: 0 },
      ],
      1600,
      620,
      logo,
    );
    this.curvedLabel(lettering, rOut - 0.02, 0.42 * this.phi, 3.4, (3.4 * 620) / 1600, 1.85, true);

    // Over the salon door.
    const doorSign = wallTextTexture([{ text: 'Le salon Selys', size: 120, weight: 900, color: '#FFFFFF' }], 1100, 160);
    this.curvedLabel(doorSign, rIn + 0.02, this.thetaDoor, 2.2, 0.32, DOOR_H + 0.42, false);
  }

  /** UVs that follow a ring: u along the arc, v across, in tiles of `tile` metres. */
  private ringUv(geo: THREE.RingGeometry, segments: number, tile: number) {
    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    const uv = geo.attributes['uv'] as THREE.BufferAttribute;
    for (let k = 0; k < pos.count; k++) {
      const i = k % (segments + 1);
      const a = (i / segments) * Math.PI * 2;
      const r = Math.hypot(pos.getX(k), pos.getY(k));
      uv.setXY(k, (a * this.rMid) / tile, r / tile);
    }
    uv.needsUpdate = true;
  }

  /** Lettering that follows the curve of a wall. Seen from inside the ring, the outer wall's texture is mirrored back. */
  private curvedLabel(map: THREE.Texture, radius: number, centerTheta: number, width: number, height: number, y: number, insideFacing: boolean) {
    const span = width / radius;
    if (insideFacing) {
      map.wrapS = THREE.RepeatWrapping;
      map.repeat.x = -1;
      map.offset.x = 1;
    }
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 48, 1, true, centerTheta - span / 2, span),
      new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.6, side: insideFacing ? THREE.BackSide : THREE.FrontSide, depthWrite: false }),
    );
    mesh.position.y = y;
    this.scene.add(mesh);
  }

  // ---------------------------------------------------------------- paintings

  private frameMaterial(i: number) {
    switch (i % 3) {
      case 0:
        return new THREE.MeshStandardMaterial({ color: '#C9A24E', metalness: 1, roughness: 0.32 });
      case 1:
        return new THREE.MeshPhysicalMaterial({ color: '#141819', metalness: 0.1, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2 });
      default:
        return new THREE.MeshStandardMaterial({ color: '#9C7148', roughness: 0.55 });
    }
  }

  private buildPainting(p: Product, i: number, logo?: HTMLImageElement): Painting {
    const theta = (i + 1) * this.phi;
    const group = new THREE.Group();
    group.position.copy(this.at(theta, this.rOut - 0.05, ART_Y));
    group.rotation.y = theta + Math.PI;
    group.userData['painting'] = i;

    const w = ART_WIDTH;
    const h = ART_HEIGHT;
    const outer = new THREE.Shape();
    outer.moveTo(-w / 2 - FRAME, -h / 2 - FRAME);
    outer.lineTo(w / 2 + FRAME, -h / 2 - FRAME);
    outer.lineTo(w / 2 + FRAME, h / 2 + FRAME);
    outer.lineTo(-w / 2 - FRAME, h / 2 + FRAME);
    outer.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-w / 2, -h / 2);
    hole.lineTo(-w / 2, h / 2);
    hole.lineTo(w / 2, h / 2);
    hole.lineTo(w / 2, -h / 2);
    hole.closePath();
    outer.holes.push(hole);
    const frameGeo = new THREE.ExtrudeGeometry(outer, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 3 });
    const frame = new THREE.Mesh(frameGeo, this.frameMaterial(i));
    frame.castShadow = true;
    group.add(frame);

    const art = new THREE.CanvasTexture(paintArtwork(p, logo));
    art.colorSpace = THREE.SRGBColorSpace;
    art.anisotropy = 8;
    const canvasMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: art, bumpMap: art, bumpScale: 1.2, roughness: 0.62 }),
    );
    canvasMesh.position.z = 0.03;
    canvasMesh.receiveShadow = true;
    group.add(canvasMesh);

    // The small wall label beside the painting.
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.17, 0.012),
      [
        new THREE.MeshStandardMaterial({ color: '#F4F1EA' }),
        new THREE.MeshStandardMaterial({ color: '#F4F1EA' }),
        new THREE.MeshStandardMaterial({ color: '#F4F1EA' }),
        new THREE.MeshStandardMaterial({ color: '#F4F1EA' }),
        new THREE.MeshStandardMaterial({ map: this.plaqueTexture(p, i), roughness: 0.6 }),
        new THREE.MeshStandardMaterial({ color: '#F4F1EA' }),
      ],
    );
    plaque.position.set(w / 2 + FRAME + 0.4, -0.32, 0.022);
    plaque.castShadow = true;
    group.add(plaque);
    this.scene.add(group);

    const fixture = this.at(theta - 0.12 / this.rOut, this.rOut - 0.95, H - 0.16);
    const center = this.at(theta, this.rOut - 0.05, ART_Y);
    // Track spotlight housing, aimed at the painting.
    const housing = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#111517', roughness: 0.4, metalness: 0.6 }));
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), new THREE.MeshBasicMaterial({ color: '#FFF1D6' }));
    lens.position.z = 0.101;
    housing.add(body, lens);
    housing.position.copy(fixture);
    housing.lookAt(center);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08), new THREE.MeshStandardMaterial({ color: '#111517' }));
    stem.position.copy(fixture).setY(H - 0.08);
    this.scene.add(housing, stem);
    return { group, center, theta, fixture };
  }

  private plaqueTexture(p: Product, i: number) {
    return canvasTexture(600, 340, (c) => {
      c.fillStyle = '#F4F1EA';
      c.fillRect(0, 0, 600, 340);
      c.fillStyle = p.accent;
      c.fillRect(36, 40, 14, 74);
      c.fillStyle = INK;
      c.font = `900 60px ${FONT}`;
      c.fillText(p.name, 70, 98, 500);
      c.fillStyle = '#2F4A4E';
      c.font = `600 32px ${FONT}`;
      c.fillText(p.metier, 36, 170, 530);
      c.font = `500 26px ${FONT}`;
      c.fillText(`Tableau ${i + 1} · Selys Africa`, 36, 290, 530);
    });
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight('#FFF4E4', '#3A2A1C', 0.5));
    for (let k = 0; k < LIGHTS; k++) {
      const light = new THREE.SpotLight('#FFE9CC', 0, 7.5, 0.5, 0.75, 1.3);
      light.castShadow = !this.isSmall() && k < 2;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.bias = -0.0004;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 7;
      this.scene.add(light, light.target);
      this.spots.push({ light, index: -1 });
    }
  }

  // ---------------------------------------------------------------- salon

  private buildSalon(logo: HTMLImageElement | undefined) {
    const { rIn, thetaDoor } = this;
    const g = this.salonGroup;
    const rWall = rIn - WALL_T;
    const gap = DOOR_W / rIn;

    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(rWall, rWall, H_SALON, 200, 1, true, thetaDoor + gap / 2, Math.PI * 2 - gap),
      new THREE.MeshStandardMaterial({ color: '#EDE7DC', roughness: 0.9, side: THREE.BackSide }),
    );
    wall.position.y = H_SALON / 2;
    wall.receiveShadow = true;
    const lintel = new THREE.Mesh(
      new THREE.CylinderGeometry(rWall, rWall, H_SALON - DOOR_H, 16, 1, true, thetaDoor - gap / 2, gap),
      new THREE.MeshStandardMaterial({ color: '#EDE7DC', roughness: 0.9, side: THREE.BackSide }),
    );
    lintel.position.y = DOOR_H + (H_SALON - DOOR_H) / 2;
    const stone = stoneTexture();
    stone.repeat.set(rWall / 1.6, rWall / 1.6);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(rWall, 128), new THREE.MeshStandardMaterial({ map: stone, roughness: 0.25 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.002;
    floor.receiveShadow = true;
    const ceiling = new THREE.Mesh(new THREE.CircleGeometry(rWall, 96), new THREE.MeshStandardMaterial({ color: '#E9E6DF', roughness: 0.95, side: THREE.BackSide }));
    ceiling.rotation.x = -Math.PI / 2;
    ceiling.position.y = H_SALON;
    const skylight = new THREE.Mesh(new THREE.CircleGeometry(2.6, 96), new THREE.MeshBasicMaterial({ color: '#FFF8EC', side: THREE.BackSide }));
    skylight.rotation.x = -Math.PI / 2;
    skylight.position.y = H_SALON - 0.01;
    const skyRing = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.04, 8, 128), new THREE.MeshBasicMaterial({ color: AQUA }));
    skyRing.rotation.x = Math.PI / 2;
    skyRing.position.y = H_SALON - 0.03;
    g.add(wall, lintel, floor, ceiling, skylight, skyRing);

    // Everything in the salon is placed facing the door: u points to the door, v across.
    const u = new THREE.Vector3(Math.sin(thetaDoor), 0, Math.cos(thetaDoor));
    const v = this.tangent(thetaDoor);
    const place = (obj: THREE.Object3D, along: number, across: number, y = 0, turn = 0) => {
      obj.position.copy(u.clone().multiplyScalar(along).add(v.clone().multiplyScalar(across))).setY(y);
      obj.rotation.y = thetaDoor + turn;
      g.add(obj);
      return obj;
    };

    // Rug.
    const rug = new THREE.Mesh(new THREE.CircleGeometry(3.3, 96), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }));
    rug.rotation.x = -Math.PI / 2;
    rug.receiveShadow = true;
    place(rug, 0.6, 0, 0.006);
    rug.rotation.set(-Math.PI / 2, 0, 0);

    // Brand wall behind the desk.
    const brandWall = new THREE.Group();
    const panel = new THREE.Mesh(new RoundedBoxGeometry(5.6, 3.4, 0.24, 3, 0.05), new THREE.MeshStandardMaterial({ color: TEAL, roughness: 0.7 }));
    panel.position.y = 1.7;
    panel.receiveShadow = true;
    brandWall.add(panel);
    if (logo) {
      const tex = new THREE.Texture(logo);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const lw = 3.4;
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(lw, (lw * logo.height) / logo.width), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      mark.position.set(0, 2.45, 0.125);
      brandWall.add(mark);
    }
    const glow = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: AQUA }));
    glow.position.set(0, 0.03, 0.13);
    brandWall.add(glow);
    place(brandWall, -3.7, 0);

    // Reception desk: a curved counter in teal lacquer with a stone top.
    const desk = new THREE.Group();
    const sector = (r0: number, r1: number, a: number) => {
      const s = new THREE.Shape();
      const steps = 40;
      for (let k = 0; k <= steps; k++) {
        const t = -a + (2 * a * k) / steps;
        const x = r1 * Math.sin(t);
        const y = -r1 * Math.cos(t);
        if (k === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      }
      for (let k = steps; k >= 0; k--) {
        const t = -a + (2 * a * k) / steps;
        s.lineTo(r0 * Math.sin(t), -r0 * Math.cos(t));
      }
      s.closePath();
      return s;
    };
    const bodyGeo = new THREE.ExtrudeGeometry(sector(1.45, 1.9, 0.62), { depth: 1.02, bevelEnabled: false, curveSegments: 1 });
    bodyGeo.rotateX(-Math.PI / 2);
    const lacquer = new THREE.MeshPhysicalMaterial({ color: TEAL, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.15 });
    const body = new THREE.Mesh(bodyGeo, lacquer);
    body.castShadow = body.receiveShadow = true;
    const topGeo = new THREE.ExtrudeGeometry(sector(1.4, 1.97, 0.65), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 1 });
    topGeo.rotateX(-Math.PI / 2);
    const top = new THREE.Mesh(topGeo, new THREE.MeshPhysicalMaterial({ color: '#F2EEE6', roughness: 0.2, clearcoat: 0.5 }));
    top.position.y = 1.02;
    top.castShadow = top.receiveShadow = true;
    const strip = new THREE.Mesh(new THREE.TorusGeometry(1.91, 0.008, 4, 64, 1.24), new THREE.MeshBasicMaterial({ color: AQUA }));
    strip.rotation.set(Math.PI / 2, 0, Math.PI / 2 - 0.62);
    strip.position.y = 0.06;
    desk.add(body, top, strip);
    if (logo) {
      const tex = new THREE.Texture(logo);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const lw = 1.0;
      const span = lw / 1.91;
      const mark = new THREE.Mesh(
        new THREE.CylinderGeometry(1.905, 1.905, (lw * logo.height) / logo.width, 24, 1, true, Math.PI - span / 2, span),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
      );
      // The front of the arc faces the visitor (+z of the desk group); cylinder θ = π is −z, hence the turn.
      mark.rotation.y = Math.PI;
      mark.position.y = 0.68;
      desk.add(mark);
    }
    // The visitor's basket sits on the counter; it fills as they pick solutions.
    const basket = new THREE.Group();
    const weave = weaveTexture();
    weave.repeat.set(4, 1);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.18, 32, 1, true), new THREE.MeshStandardMaterial({ map: weave, roughness: 0.85, side: THREE.DoubleSide }));
    shell.position.y = 0.09;
    shell.castShadow = true;
    const floorB = new THREE.Mesh(new THREE.CircleGeometry(0.18, 32), new THREE.MeshStandardMaterial({ color: '#8C5E2E' }));
    floorB.rotation.x = -Math.PI / 2;
    floorB.position.y = 0.005;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 32, Math.PI), new THREE.MeshStandardMaterial({ color: '#9A6B35' }));
    handle.position.y = 0.18;
    basket.add(shell, floorB, handle, this.basketItems);
    basket.position.set(-0.95, 1.08, 1.45 * Math.cos(0.5) + 0.12);
    basket.rotation.y = 0.4;
    basket.userData['salon'] = true;
    desk.add(basket);
    desk.userData['salon'] = true;
    // The desk group sits at the centre of the counter's curve.
    place(desk, -3.0, 0);

    // The Selys team behind the counter.
    STAFF.forEach((look, k) => {
      const h = this.buildHostess(look, k * 2.1);
      place(h.group, look.along, look.across, 0, look.turn);
      this.hostesses.push(h);
    });

    // Lounge: two velvet sofas, a low table, plants.
    const velvet = new THREE.MeshPhysicalMaterial({ color: '#0A5E62', roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(AQUA), sheenRoughness: 0.5 });
    const brass = new THREE.MeshStandardMaterial({ color: '#C9A24E', metalness: 1, roughness: 0.3 });
    const sofa = () => {
      const s = new THREE.Group();
      const seat = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.4, 0.92, 4, 0.1), velvet);
      seat.position.y = 0.36;
      const back = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.62, 0.24, 4, 0.1), velvet);
      back.position.set(0, 0.72, -0.36);
      for (const x of [-1.08, 1.08]) {
        const arm = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.56, 0.92, 4, 0.08), velvet);
        arm.position.set(x, 0.5, 0);
        arm.castShadow = true;
        s.add(arm);
      }
      for (const [x, z] of [[-1, -0.38], [1, -0.38], [-1, 0.38], [1, 0.38]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.16, 10), brass);
        leg.position.set(x, 0.08, z);
        s.add(leg);
      }
      seat.castShadow = back.castShadow = true;
      s.add(seat, back);
      return s;
    };
    place(sofa(), 0.9, 3.3, 0, -Math.PI / 2);
    place(sofa(), 0.9, -3.3, 0, Math.PI / 2);
    // Low tables beside the sofas, out of the visitor's line of sight to the counter.
    for (const side of [-1, 1]) {
      const table = new THREE.Group();
      const tTop = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 48), new THREE.MeshPhysicalMaterial({ color: '#F2EEE6', roughness: 0.2, clearcoat: 0.6 }));
      tTop.position.y = 0.42;
      tTop.castShadow = true;
      const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 0.4, 32), brass);
      tBase.position.y = 0.2;
      table.add(tTop, tBase);
      place(table, 0.9, side * 2.1);
    }
    const plant = () => {
      const p = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.6, 32), new THREE.MeshStandardMaterial({ color: INK, roughness: 0.6 }));
      pot.position.y = 0.3;
      pot.castShadow = true;
      p.add(pot);
      const leafMat = new THREE.MeshStandardMaterial({ color: '#2E5E3A', roughness: 0.7, side: THREE.DoubleSide });
      for (let k = 0; k < 16; k++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), leafMat);
        leaf.scale.set(1, 0.18, 0.55);
        const a = k * 2.4;
        const y = 0.9 + (k / 16) * 1.3;
        leaf.position.set(Math.cos(a) * 0.22, y, Math.sin(a) * 0.22);
        leaf.rotation.set(0.4, -a, 0.5);
        leaf.castShadow = true;
        p.add(leaf);
      }
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.6), new THREE.MeshStandardMaterial({ color: '#5B4630' }));
      stem.position.y = 1.4;
      p.add(stem);
      return p;
    };
    place(plant(), -3.4, 3.4);
    place(plant(), -3.4, -3.4);

    // Pendant lights over the counter.
    const glass = new THREE.MeshBasicMaterial({ color: '#FFF8EE' });
    for (const [a, b, h] of [[-2.3, -0.9, 3.1], [-2.5, 0, 2.9], [-2.3, 0.9, 3.2]]) {
      const pendant = new THREE.Group();
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), glass);
      bulb.position.y = h;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, H_SALON - h), new THREE.MeshBasicMaterial({ color: '#111517' }));
      cord.position.y = h + (H_SALON - h) / 2;
      pendant.add(bulb, cord);
      place(pendant, a, b);
    }

    // Salon lighting.
    const key = new THREE.SpotLight('#FFE9CC', 60, 14, 0.75, 0.7, 1.2);
    key.position.copy(u.clone().multiplyScalar(0.5)).setY(H_SALON - 0.2);
    key.target.position.copy(u.clone().multiplyScalar(-2.4)).setY(0.9);
    key.castShadow = !this.isSmall();
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    const wash = new THREE.SpotLight('#FFF1DC', 40, 10, 0.6, 0.8, 1.2);
    wash.position.copy(u.clone().multiplyScalar(0.8)).setY(H_SALON - 0.4);
    wash.target.position.copy(u.clone().multiplyScalar(-3.7)).setY(2.2);
    const fill = new THREE.PointLight('#FFF4E4', 14, 16, 1.2);
    fill.position.set(0, H_SALON - 0.8, 0);
    g.add(key, key.target, wash, wash.target, fill);
    this.scene.add(g);
  }

  /**
   * A figurine of rounded volumes, drawn for a man of 1.78 m and scaled to `look.height`.
   * It faces +z; the visitor's right is +x.
   */
  private buildHostess(look: Look, phase: number): Hostess {
    const mat = (color: string, roughness = 0.62) => new THREE.MeshStandardMaterial({ color, roughness });
    const skin = mat(look.skin, 0.5);
    const jacket = mat(look.jacket, 0.7);
    const dark = mat('#1E2128', 0.6);
    const mesh = (geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      return o;
    };
    const body = new THREE.Group();

    // Legs and shoes, seen only from the side of the counter.
    if (look.skirt) {
      body.add(mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.42, 28), jacket, 0, 0.7));
      for (const x of [-0.075, 0.075]) body.add(mesh(new THREE.CapsuleGeometry(0.045, 0.42, 6, 12), skin, x, 0.3));
    } else {
      for (const x of [-0.09, 0.09]) body.add(mesh(new THREE.CapsuleGeometry(0.075, 0.68, 6, 14), dark, x, 0.45));
    }
    for (const x of [-0.085, 0.085]) body.add(mesh(new RoundedBoxGeometry(0.1, 0.07, 0.22, 2, 0.03), mat('#14161A', 0.4), x, 0.035, 0.04));

    // Torso: a soft capsule, flattened front to back; a shirt at the collar and the Selys badge.
    const torso = mesh(new THREE.CapsuleGeometry(0.2, 0.3, 8, 24), jacket, 0, 1.18);
    torso.scale.z = 0.62;
    body.add(torso);
    // The shirt shows in a narrow opening of the jacket, under the chin.
    const shirt = mesh(new THREE.SphereGeometry(0.1, 20, 14), mat(look.shirt, 0.8), 0, 1.41, 0.096);
    shirt.scale.set(0.46, 1.15, 0.32);
    body.add(shirt);
    const badge = mesh(new RoundedBoxGeometry(0.05, 0.022, 0.012, 1, 0.004), new THREE.MeshStandardMaterial({ color: AQUA, emissive: AQUA, emissiveIntensity: 0.35, roughness: 0.4 }), 0.1, 1.33, 0.112);
    body.add(badge);
    body.add(mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.12, 16), skin, 0, 1.53));

    // Head, pivoting at the top of the neck.
    const head = new THREE.Group();
    head.position.y = 1.575;
    const skull = mesh(new THREE.SphereGeometry(0.105, 32, 24), skin, 0, 0.1);
    skull.scale.set(0.95, 1.12, 1);
    head.add(skull);
    const hair = mesh(new THREE.SphereGeometry(0.111, 32, 16, 0, Math.PI * 2, 0, Math.PI * (look.bun ? 0.47 : 0.4)), mat(look.hair, 0.9), 0, 0.105, -0.004);
    hair.scale.set(0.96, 1.12, 1.02);
    hair.rotation.x = -0.32;
    head.add(hair);
    if (look.bun) {
      head.add(mesh(new THREE.SphereGeometry(0.052, 20, 14), mat(look.hair, 0.9), 0, 0.2, -0.07));
      const gold = new THREE.MeshStandardMaterial({ color: '#D8B25A', metalness: 1, roughness: 0.25 });
      for (const x of [-0.1, 0.1]) head.add(mesh(new THREE.SphereGeometry(0.011, 10, 8), gold, x, 0.06, 0.005));
    }
    for (const x of [-0.1, 0.1]) head.add(mesh(new THREE.SphereGeometry(0.02, 12, 10), skin, x, 0.1, 0));
    const eyeMat = mat('#16110F', 0.3);
    const eyes = [-0.036, 0.036].map((x) => {
      const e = mesh(new THREE.SphereGeometry(0.0135, 12, 10), eyeMat, x, 0.118, 0.092);
      e.scale.z = 0.6;
      head.add(e);
      return e;
    });
    const mouth = mesh(new THREE.SphereGeometry(0.02, 16, 10), mat('#3B1E1A', 0.5), 0, 0.052, 0.098);
    mouth.scale.set(1.35, 0.3, 0.5);
    head.add(mouth);
    body.add(head);

    // Arms, hanging a little away from the body.
    const arms: Arm[] = ([1, -1] as const).map((side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.21, 1.44, 0);
      shoulder.add(mesh(new THREE.CapsuleGeometry(0.052, 0.2, 6, 14), jacket, 0, -0.13));
      const elbow = new THREE.Group();
      elbow.position.y = -0.27;
      elbow.add(mesh(new THREE.CapsuleGeometry(0.047, 0.18, 6, 14), jacket, 0, -0.12));
      elbow.add(mesh(new THREE.SphereGeometry(0.048, 16, 12), skin, 0, -0.265));
      shoulder.add(elbow);
      shoulder.rotation.z = side * 0.12;
      body.add(shoulder);
      return { shoulder, elbow, side };
    });

    const bubble = this.speechBubble();
    bubble.sprite.position.set(0.06, 1.84, 0.05);
    body.add(bubble.sprite);
    body.scale.setScalar(look.height / 1.78);
    const group = new THREE.Group();
    group.userData['salon'] = true;
    group.add(body);
    return { group, body, torso, head, eyes, mouth, arms, look, nodAt: -10, waveAt: -10, phase, bubble };
  }

  private speechBubble(): SpeechBubble {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 220;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Always readable: drawn over the scene, never hidden by a lamp.
    // A constant size on screen, so the line can be read from across the salon.
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, opacity: 0, sizeAttenuation: false }));
    sprite.renderOrder = 10;
    sprite.scale.set(0.64, 0.22, 1);
    // Anchored at the tip of the tail, just over the speaker's head.
    sprite.center.set(0.1, 0.03);
    sprite.visible = false;
    return { sprite, ctx, texture, text: null, from: -10, until: -10, drawn: '' };
  }

  /** Shows a line (or "…" while they answer in the chat) over a person's head. */
  private say(h: Hostess, text: string | null, from: number, duration: number) {
    Object.assign(h.bubble, { text, from, until: from + duration });
  }

  private drawBubble(b: SpeechBubble, time: number) {
    const dots = b.text === null ? Math.floor(time * 4) % 4 : -1;
    const key = b.text ?? `dots${dots}`;
    if (key === b.drawn) return;
    b.drawn = key;
    const c = b.ctx;
    const { width: W, height: H } = c.canvas;
    c.clearRect(0, 0, W, H);
    c.font = `700 40px ${FONT}`;
    const textW = b.text ? c.measureText(b.text).width : 120;
    const w = Math.min(W - 16, textW + 64);
    const x = 8;
    const h = 92;
    const y = 16;
    c.shadowColor = 'rgba(0,0,0,0.28)';
    c.shadowBlur = 14;
    c.shadowOffsetY = 4;
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.roundRect(x, y, w, h, 46);
    c.fill();
    // The tail points down to the speaker.
    c.beginPath();
    c.moveTo(x + 70, y + h - 2);
    c.lineTo(x + 60, H - 8);
    c.lineTo(x + 112, y + h - 2);
    c.fill();
    c.shadowColor = 'transparent';
    if (b.text) {
      c.fillStyle = INK;
      c.textBaseline = 'middle';
      c.fillText(b.text, x + 32, y + h / 2 + 2, w - 64);
    } else {
      for (let k = 0; k < 3; k++) {
        c.fillStyle = k < dots ? TEAL : '#B9CFCF';
        c.beginPath();
        c.arc(x + 40 + k * 28, y + h / 2, 9, 0, Math.PI * 2);
        c.fill();
      }
    }
    b.texture.needsUpdate = true;
  }

  /**
   * Keeps a figurine alive: breathing, a slow look around, blinking. Greeting, they wave;
   * answering in the chat, they nod, talk and gesture with the other hand.
   */
  private animateHostess(h: Hostess, time: number) {
    const t = time + h.phase;
    const since = time - h.nodAt;
    const talking = since >= 0 && since < 2.4 ? 1 - smooth(1.8, 2.4, since) : 0;
    const w = time - h.waveAt;
    const wave = w >= 0 && w < 2.7 ? smooth(0, 0.45, w) * (1 - smooth(2.2, 2.7, w)) : 0;
    const b = h.bubble;
    const speaking = time >= b.from && time < b.until ? 1 : 0;

    const breath = Math.sin(t * 1.4);
    h.torso.scale.set(1 + breath * 0.008, 1 + breath * 0.012, 0.62 * (1 + breath * 0.02));
    h.body.rotation.z = 0.012 * Math.sin(t * 0.37);

    const busy = Math.max(talking, wave);
    h.head.rotation.y = 0.2 * Math.sin(t * 0.23) * (1 - busy);
    h.head.rotation.x = 0.04 * Math.sin(t * 0.5) + talking * 0.1 * Math.abs(Math.sin(since * 5.5)) - wave * 0.06;
    h.head.rotation.z = 0.05 * Math.sin(t * 0.31) + wave * 0.1 * h.look.waveSide;

    const period = 3.1 + (h.phase % 1.7);
    const blink = t % period < 0.12 ? 0.12 : 1;
    for (const e of h.eyes) e.scale.y = blink;
    h.mouth.scale.y = 0.3 + speaking * 0.75 * Math.abs(Math.sin(time * 11 + h.phase));

    for (const arm of h.arms) {
      const idle = 0.04 * Math.sin(t * 0.9 + arm.side);
      if (arm.side === h.look.waveSide) {
        // Raised high to the side, the forearm swinging.
        arm.shoulder.rotation.set(-wave * 0.25 + idle, 0, arm.side * (0.12 + wave * 2.45));
        arm.elbow.rotation.set(0, 0, arm.side * wave * (0.25 + 0.42 * Math.sin(w * 9)));
      } else {
        // The other hand comes up as they explain.
        const lift = talking * (0.62 + 0.12 * Math.sin(since * 4));
        arm.shoulder.rotation.set(-lift + idle, 0, arm.side * (0.12 + talking * 0.1));
        arm.elbow.rotation.set(-talking * (1.0 + 0.15 * Math.sin(since * 6)), 0, 0);
      }
    }
  }

  /** The visitor's basket, as small boxes in the product colours. */
  setBasket(items: Product[]) {
    for (const child of [...this.basketItems.children]) {
      this.basketItems.remove(child);
      const m = child as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    items.slice(0, 9).forEach((p, k) => {
      const box = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.09, 0.1, 2, 0.012), new THREE.MeshStandardMaterial({ color: p.accent, roughness: 0.5 }));
      const layer = Math.floor(k / 4);
      const a = (k % 4) * (Math.PI / 2) + layer * 0.7;
      // They peek over the rim, so the basket reads as filled from the visitor's side.
      box.position.set(Math.cos(a) * 0.07 * (layer ? 0.5 : 1), 0.13 + layer * 0.085, Math.sin(a) * 0.07 * (layer ? 0.5 : 1));
      box.rotation.y = a + 0.3;
      box.castShadow = true;
      this.basketItems.add(box);
    });
  }

  /** A member of the team stirs, as they answer the visitor. */
  talk(which = 0) {
    const h = this.hostesses[which % Math.max(1, this.hostesses.length)];
    if (!h) return;
    const now = this.clock.getElapsed();
    h.nodAt = now;
    this.say(h, null, now, 2.2);
  }

  // ---------------------------------------------------------------- path

  private buildExit() {
    const { n, phi, thetaDoor, rIn, rMid } = this;
    const last = Math.max(0, n - 1);
    const u = new THREE.Vector3(Math.sin(thetaDoor), 0, Math.cos(thetaDoor));
    const desk = u.clone().multiplyScalar(-2.3).setY(1.3);
    // The exit starts where the walk leaves the last painting, so the two join without a jump.
    const start = this.walkPose(last);
    this.exitPos = new THREE.CatmullRomCurve3(
      [
        start.pos,
        this.at((n + 0.45) * phi, rMid - 0.1, EYE),
        this.at(thetaDoor - 0.06, rMid - 0.7, EYE),
        this.at(thetaDoor, rIn - 1.0, EYE),
        // Close enough to the counter for the team to be seen clearly.
        u.clone().multiplyScalar(this.portrait() ? 2.6 : 2.1).setY(EYE),
      ],
      false,
      'centripetal',
    );
    this.exitLook = new THREE.CatmullRomCurve3(
      [
        start.look,
        this.at((n + 0.45) * phi + 5 / rMid, rMid - 0.6, 1.5),
        this.at(thetaDoor, rIn - 0.5, 1.6),
        desk.clone().setY(1.45),
        // On a phone, aimed higher so the team sits low in the frame, clear of the salon's title.
        this.portrait() ? desk.clone().setY(1.75) : desk,
      ],
      false,
      'centripetal',
    );
  }

  private paintingLook(i: number) {
    const p = this.paintings[i];
    if (!p) return this.at((i + 1) * this.phi, this.rOut, ART_Y);
    return p.center.clone().add(this.tangent(p.theta).multiplyScalar(this.shiftX)).add(new THREE.Vector3(0, this.shiftY, 0));
  }

  /**
   * `s` is the visitor's position in the page: s = i when painting i's stop is centred on screen.
   * The walk follows the scroll without pausing; the visitor stops when they stop scrolling.
   */
  setProgress(s: number, instant = false) {
    const n = this.n;
    let c: number;
    if (!n) c = -1;
    else if (s <= n - 1) c = Math.max(-1, s);
    else c = n - 1 + Math.min(1, (s - (n - 1)) / 0.85);
    if (Math.abs(c - this.cTarget) > 1e-4) {
      this.movedAt = this.clock.getElapsed();
      // Scrolling during the opening flight means the visitor wants to walk in.
      if (!instant) this.skipIntro();
    }
    this.cTarget = c;
    if (instant || this.reduced) {
      this.c = c;
      this.cV = 0;
    }
  }

  private portrait() {
    return this.aspect < 0.9 || this.isSmall();
  }

  protected override onResize() {
    const portrait = this.portrait();
    const fov = this.baseFov();
    if (this.camera.fov !== fov && !this.intro) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    // Stand further back on a phone, so the whole painting fits the narrow screen.
    this.rStop = portrait ? this.rIn + 0.4 : this.rIn + 0.8;
    const d = this.rOut - 0.05 - this.rStop;
    const halfH = d * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const halfW = halfH * this.aspect;
    // Landscape: the label sits on the left, so the painting moves right of centre.
    // Portrait: the label sits at the bottom, so the painting moves up.
    this.shiftX = portrait ? 0 : Math.min(1.3, halfW * 0.3);
    this.shiftY = portrait ? -halfH * 0.36 : -halfH * 0.04;
    if (this.paintings.length) this.buildExit();
  }

  /**
   * The gala opening: as the burst fills the screen, the camera rushes up the corridor
   * from a few metres back, with a wide lens that settles, and stops at the entrance where the visit starts.
   */
  playIntro(onDone: () => void, seconds = 2.8) {
    if (this.reduced || !this.n || this.c > -0.5) {
      onDone();
      return;
    }
    const land = this.walkPose(-1);
    const from = {
      pos: this.at(-0.7, this.rMid - 0.1, EYE + 0.5),
      look: land.look.clone().add(new THREE.Vector3(0, 0.5, 0)),
    };
    this.intro = { t: 0, speed: 1 / seconds, from, onDone };
  }

  /** Ends the opening move within about half a second. */
  skipIntro() {
    const i = this.intro;
    if (i) i.speed = Math.max(i.speed, (1 - i.t) / 0.5);
  }

  private baseFov() {
    return this.portrait() ? 64 : 50;
  }

  private introPose(dt: number) {
    const i = this.intro!;
    i.t = Math.min(1, i.t + dt * i.speed);
    // Fast at first, like the blast carrying the visitor in, then a soft stop.
    const e = 1 - Math.pow(1 - i.t, 3);
    const to = this.pose(this.c);
    const p = { pos: i.from.pos.clone().lerp(to.pos, e), look: i.from.look.clone().lerp(to.look, e) };
    const fov = this.baseFov() + 30 * (1 - e);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    if (i.t >= 1) {
      this.intro = null;
      i.onDone();
    }
    return p;
  }

  /** Walking down the middle of the corridor, glancing at each painting as it goes by. */
  private walkPose(c: number) {
    const { n } = this;
    const theta = (c + 1) * this.phi;
    const j = Math.round(c);
    const w = j >= 0 && j < n ? 1 - smooth(0, 0.5, Math.abs(c - j)) : 0;
    const pos = this.at(theta, this.rMid - 0.1, EYE);
    const ahead = this.at(theta + 5.2 / this.rMid, this.rMid + 0.8, 1.5);
    const look = w > 0 ? ahead.lerp(this.paintingLook(j), smoother(w) * 0.3) : ahead;
    return { pos, look };
  }

  private pose(c: number) {
    const { n } = this;
    let p: { pos: THREE.Vector3; look: THREE.Vector3 };
    if (n && c > n - 1) {
      const k = Math.max(0, Math.min(1, c - (n - 1)));
      // distance 0 means "use u" (three treats it as unset).
      const t = this.exitPos.getUtoTmapping(k, 0);
      p = { pos: this.exitPos.getPoint(t), look: this.exitLook.getPoint(t) };
    } else p = this.walkPose(c);
    // The visitor has stopped by a painting: they step up to it and face it.
    const d = this.dwell;
    if (d > 0 && this.dwellAt >= 0 && this.dwellAt < n) {
      p.pos.lerp(this.at((this.dwellAt + 1) * this.phi, this.rStop, EYE), d);
      p.look.lerp(this.paintingLook(this.dwellAt), d);
    }
    return p;
  }

  /** Stopping is the visitor's choice: once the scroll rests near a painting, they step up to it. */
  private updateDwell(dt: number, time: number) {
    const j = Math.round(this.cTarget);
    const idle = time - this.movedAt > 0.35;
    // Only a stop close to a painting counts: stopping halfway between two keeps the visitor in the corridor.
    const near = j >= 0 && j < this.n && Math.abs(this.cTarget - j) < 0.4 && Math.abs(this.c - j) < 0.4;
    if (this.standing) {
      // A nudge of the wheel or the end of a trackpad's glide does not pull the visitor away from the painting:
      // they walk on once the scroll has clearly moved on.
      if (Math.abs(this.cTarget - this.anchor) > 0.15 || Math.abs(this.cTarget - this.dwellAt) > 0.45) this.standing = false;
      else if (idle) this.anchor = this.cTarget;
    } else if (near && idle && (this.dwell < 0.01 || j === this.dwellAt) && !this.intro) {
      // Before turning to another painting, the visitor first steps back into the corridor.
      this.dwellAt = j;
      this.standing = true;
      this.anchor = this.cTarget;
    }
    const want = this.standing ? 1 : 0;
    if (this.reduced) {
      this.dwell = want;
      this.dwellV = 0;
    } else {
      // About 1.6 s to step up and face the painting, 0.7 s to step back once the visitor walks on.
      [this.dwell, this.dwellV] = spring(this.dwell, this.dwellV, want, want ? 3.4 : 7.5, dt);
      if (this.dwell <= 0 || this.dwell >= 1) {
        this.dwell = Math.max(0, Math.min(1, this.dwell));
        this.dwellV = 0;
      }
    }
    if (this.dwell < 1e-3 && !want) this.dwell = this.dwellV = 0;
    const at = this.dwell > 0 ? this.dwellAt : -1;
    const amount = at >= 0 ? this.dwell : 0;
    if (at !== this.reported.at || Math.abs(amount - this.reported.amount) > 0.004 || (amount === 0 && this.reported.amount !== 0)) {
      this.reported = { at, amount };
      this.onStand(at, amount);
    }
  }

  // ---------------------------------------------------------------- frame

  protected update(dt: number, time: number) {
    if (!this.paintings.length && this.n) return;
    if (this.reduced) this.c = this.cTarget;
    else {
      // The walk follows the scroll through a spring: each notch of the wheel becomes a smooth step.
      [this.c, this.cV] = spring(this.c, this.cV, this.cTarget, 6.5, dt);
      if (Math.abs(this.cTarget - this.c) < 1e-4 && Math.abs(this.cV) < 1e-3) {
        this.c = this.cTarget;
        this.cV = 0;
      }
    }
    this.updateDwell(dt, time);
    const { pos, look } = this.intro ? this.introPose(dt) : this.pose(this.c);

    // A light step while walking.
    const moved = pos.distanceTo(this.lastPos);
    this.lastPos.copy(pos);
    const speed = dt > 0 ? moved / dt : 0;
    if (!this.reduced && moved < 2) this.stride += moved * ((Math.PI * 2) / 1.5);
    const bob = this.reduced || this.intro ? 0 : Math.sin(this.stride) * 0.018 * Math.min(1, speed / 1.2);

    // The view follows the mouse a little in the corridor, hardly at all when reading a painting, not during the flight.
    const follow = this.reduced || this.portrait() || this.intro ? 0 : 1 - 0.8 * this.dwell;
    this.pointerSmooth.lerp(this.pointer.clone().multiplyScalar(follow), 1 - Math.pow(0.004, dt));
    this.camera.position.set(pos.x, pos.y + bob, pos.z);
    const dir = look.clone().sub(pos);
    const right = new THREE.Vector3().crossVectors(dir, this.camera.up).normalize();
    look.addScaledVector(right, this.pointerSmooth.x * 0.25).add(new THREE.Vector3(0, this.pointerSmooth.y * 0.12, 0));
    this.camera.lookAt(look);

    this.updateSpots();

    this.updateHostesses(time);
  }

  /** The team greets the visitor as they walk in, then lives quietly while the visitor reads. */
  private updateHostesses(time: number) {
    if (!this.hostesses.length) return;
    // Only animated when the salon can be seen.
    const near = this.c > this.n - 1.2 || this.intro !== null;
    // Greeted once the visitor has actually arrived, not while still crossing the door.
    const inside = this.c > this.n - 0.03;
    if (inside && !this.greeted && time - this.greetedAt > 25) {
      this.greeted = true;
      this.greetedAt = time;
      this.hostesses.forEach((h, k) => {
        h.waveAt = time + 0.4 + k * 0.9;
        this.say(h, h.look.hello, time + 0.5 + k * 1.1, 2.8);
      });
    }
    if (this.c < this.n - 0.7) this.greeted = false;
    for (const h of this.hostesses) {
      // They turn towards the visitor, without turning their back on the salon.
      const toCam = this.camera.position.clone().sub(h.group.getWorldPosition(new THREE.Vector3()));
      const yaw = Math.atan2(toCam.x, toCam.z) - h.group.rotation.y;
      h.body.rotation.y = THREE.MathUtils.clamp(Math.atan2(Math.sin(yaw), Math.cos(yaw)), -0.9, 0.9);
      if (near && !this.reduced) this.animateHostess(h, time);
      // The speech bubble pops in and fades out.
      const b = h.bubble;
      const on = near && time >= b.from && time < b.until;
      const k = on ? Math.min(1, (time - b.from) / 0.18) * Math.min(1, (b.until - time) / 0.3) : 0;
      b.sprite.visible = k > 0;
      if (k > 0) {
        this.drawBubble(b, time);
        (b.sprite.material as THREE.SpriteMaterial).opacity = k;
        const pop = this.reduced ? 1 : 0.85 + 0.15 * Math.min(1, (time - b.from) / 0.18);
        // Fraction of the screen height (the sprite ignores distance).
        const scale = (this.portrait() ? 0.34 : 0.3) * pop;
        b.sprite.scale.set(scale, (scale * 220) / 640, 1);
      }
    }
  }

  /** Four picture lights follow the visitor; each fades in long before its painting comes into view. */
  private updateSpots() {
    const weights = this.paintings.map((_, j) => Math.max(0, 1 - Math.abs(this.c - j) / 2.6));
    const wanted = weights
      .map((w, j) => ({ w, j }))
      .filter((x) => x.w > 0)
      .sort((a, b) => b.w - a.w)
      .slice(0, LIGHTS)
      .map((x) => x.j);
    for (const s of this.spots) if (!wanted.includes(s.index)) s.index = -1;
    for (const j of wanted) {
      if (this.spots.some((s) => s.index === j)) continue;
      const free = this.spots.find((s) => s.index === -1);
      if (!free) break;
      free.index = j;
      const p = this.paintings[j];
      free.light.position.copy(p.fixture);
      free.light.target.position.copy(p.center);
      free.light.target.updateMatrixWorld();
    }
    for (const s of this.spots) s.light.intensity = s.index >= 0 ? 42 * smooth(0, 0.4, weights[s.index]) : 0;
  }

  private bindPointer() {
    const el = this.canvas;
    const ndc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    el.addEventListener('pointermove', (e) => {
      this.pointer.copy(ndc(e));
      el.style.cursor = this.hit(this.pointer) ? 'pointer' : 'default';
    });
    el.addEventListener('pointerleave', () => this.pointer.set(0, 0));
    el.addEventListener('pointerdown', (e) => (this.downAt = { x: e.clientX, y: e.clientY }));
    el.addEventListener('pointerup', (e) => {
      if (!this.downAt || Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 6) return;
      this.downAt = null;
      if (this.intro) {
        this.skipIntro();
        return;
      }
      const h = this.hit(ndc(e));
      if (h === 'salon') this.onSalon();
      else if (typeof h === 'number') this.onPainting(h);
    });
  }

  private hit(p: THREE.Vector2): number | 'salon' | null {
    this.raycaster.setFromCamera(p, this.camera);
    const targets = [...this.paintings.map((x) => x.group), this.salonGroup, ...this.occluders];
    for (const h of this.raycaster.intersectObjects(targets, true)) {
      if (h.distance > 9) return null;
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (o.userData['painting'] !== undefined) return o.userData['painting'] as number;
        if (o.userData['salon']) return 'salon';
        o = o.parent;
      }
      return null;
    }
    return null;
  }

  override dispose() {
    this.envTexture?.dispose();
    super.dispose();
  }
}

