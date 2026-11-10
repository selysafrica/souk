import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product } from '../core/catalog.model';
import { screenTexture } from './screen-texture';
import { fontsReady, Stage } from './stage';

const NIGHT = '#02292B';
const AQUA = '#43E0D0';
/** Lid angle at rest (leaning back) and when dipped shut during a change. */
const LID_OPEN = -0.24;
const LID_DIP = 1.3;

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export class AppareilsScene extends Stage {
  private readonly rig = new THREE.Group();
  private lid!: THREE.Group;
  private laptopScreen!: THREE.MeshBasicMaterial;
  private phone!: THREE.Group;
  private phoneScreen!: THREE.MeshBasicMaterial;
  private glow!: THREE.MeshBasicMaterial;
  private accentLight!: THREE.PointLight;
  private readonly pointer = new THREE.Vector2();
  private readonly tilt = new THREE.Vector2();
  private active = -1;
  private phoneSpin = 0;
  private request = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly products: Product[],
  ) {
    super(canvas, 32);
    this.scene.background = new THREE.Color(NIGHT);
    this.renderer.toneMappingExposure = 1.15;
  }

  async build(initial: number) {
    await fontsReady();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environmentIntensity = 0.55;

    const key = new THREE.DirectionalLight('#FFFFFF', 1.6);
    key.position.set(-4, 6, 6);
    const rim = new THREE.DirectionalLight(AQUA, 3.2);
    rim.position.set(5, 2.5, -5);
    this.accentLight = new THREE.PointLight('#FFFFFF', 18, 9, 1.6);
    this.accentLight.position.set(0.4, 0.6, 1.8);
    this.scene.add(key, rim, this.accentLight);

    // A pool of the product colour under the devices.
    this.glow = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, opacity: 0.4, blending: THREE.AdditiveBlending });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), this.glow);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -0.01;
    this.rig.add(pool);

    const alu = new THREE.MeshStandardMaterial({ color: '#C7D2D5', metalness: 0.9, roughness: 0.32 });
    const dark = new THREE.MeshStandardMaterial({ color: '#13262B', metalness: 0.5, roughness: 0.4 });
    const black = new THREE.MeshStandardMaterial({ color: '#05090A', roughness: 0.25, metalness: 0.2 });

    // Laptop.
    const laptop = new THREE.Group();
    const base = new THREE.Mesh(new RoundedBoxGeometry(3.3, 0.12, 2.25, 4, 0.05), alu);
    base.position.y = 0.06;
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.0), dark);
    deck.rotation.x = -Math.PI / 2;
    deck.position.set(0, 0.121, -0.32);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.62), new THREE.MeshStandardMaterial({ color: '#B4C0C3', metalness: 0.8, roughness: 0.45 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.121, 0.62);
    laptop.add(base, deck, pad);
    this.lid = new THREE.Group();
    this.lid.position.set(0, 0.12, -1.1);
    const shell = new THREE.Mesh(new RoundedBoxGeometry(3.3, 2.15, 0.07, 4, 0.03), alu);
    shell.position.set(0, 1.075, 0);
    const bezel = new THREE.Mesh(new THREE.PlaneGeometry(3.22, 2.07), black);
    bezel.position.set(0, 1.075, 0.036);
    this.laptopScreen = new THREE.MeshBasicMaterial({ toneMapped: false });
    const display = new THREE.Mesh(new THREE.PlaneGeometry(3.04, 1.9), this.laptopScreen);
    display.position.set(0, 1.09, 0.037);
    this.lid.add(shell, bezel, display);
    laptop.add(this.lid);
    laptop.position.set(-0.55, 0, 0);
    laptop.rotation.y = 0.32;
    this.rig.add(laptop);

    // Phone, standing slightly in front.
    this.phone = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.98, 2.0, 0.09, 6, 0.13), dark);
    const glass = new THREE.Mesh(new RoundedBoxGeometry(0.92, 1.94, 0.01, 4, 0.11), black);
    glass.position.z = 0.046;
    this.phoneScreen = new THREE.MeshBasicMaterial({ toneMapped: false });
    const pdisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.79), this.phoneScreen);
    pdisplay.position.z = 0.053;
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), alu);
    back.position.set(-0.24, 0.72, -0.047);
    back.rotation.y = Math.PI;
    this.phone.add(body, glass, pdisplay, back);
    this.phone.position.set(1.85, 1.08, 0.75);
    this.phone.rotation.set(-0.06, -0.38, 0.04);
    this.rig.add(this.phone);

    this.scene.add(this.rig);
    this.canvas.addEventListener('pointermove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    });
    this.canvas.addEventListener('pointerleave', () => this.pointer.set(0, 0));
    await this.show(initial, true);
    this.start();
  }

  async show(i: number, instant = false) {
    const n = this.products.length;
    if (!n) return;
    i = ((i % n) + n) % n;
    if (i === this.active) return;
    this.active = i;
    const req = ++this.request;
    const p = this.products[i];
    const [desk, mobile] = await Promise.all([screenTexture(p), screenTexture(p, true)]);
    if (req !== this.request) return;
    const accent = new THREE.Color(p.accent);
    const swap = () => {
      this.laptopScreen.map = desk;
      this.laptopScreen.needsUpdate = true;
    };
    const swapPhone = () => {
      this.phoneScreen.map = mobile;
      this.phoneScreen.needsUpdate = true;
    };
    if (instant || this.reduced || !this.laptopScreen.map) {
      swap();
      swapPhone();
      this.glow.color.copy(accent);
      this.accentLight.color.copy(accent);
      this.lid.rotation.x = LID_OPEN;
      return;
    }
    // Lid dips shut, screen changes, lid opens again.
    const from = this.lid.rotation.x;
    this.tween(0, 1, 420, (k) => (this.lid.rotation.x = from + (LID_DIP - from) * k), () => {
      swap();
      this.tween(0, 1, 900, (k) => (this.lid.rotation.x = LID_DIP + (LID_OPEN - LID_DIP) * k));
    });
    // Phone turns over once, changing face when its back is to us.
    const start = this.phoneSpin;
    let swapped = false;
    this.tween(0, 1, 1100, (k) => {
      this.phoneSpin = start + k * Math.PI * 2;
      if (!swapped && k > 0.3) {
        swapped = true;
        swapPhone();
      }
    }, () => (this.phoneSpin = 0));
    const g0 = this.glow.color.clone();
    this.tween(0, 1, 900, (k) => {
      this.glow.color.copy(g0).lerp(accent, k);
      this.accentLight.color.copy(this.glow.color);
    });
  }

  protected override onResize() {
    const portrait = this.aspect < 0.9 || this.isSmall();
    if (portrait) {
      this.camera.position.set(0, 3.2, 10.4);
      this.camera.lookAt(0.25, 0.7, 0);
      this.rig.position.set(0.15, 0, 0);
      this.rig.scale.setScalar(0.74);
      this.phone?.position.set(1.15, 1.08, 1.35);
    } else {
      // Short wide screens (phone held sideways): step back so laptop and phone both fit.
      const short = this.height < 520;
      this.camera.position.set(0, short ? 3.8 : 3.4, short ? 12.5 : 10);
      this.camera.lookAt(-0.9, 0.85, 0);
      this.rig.position.set(short ? 1.6 : 0.9, 0, 0);
      this.rig.scale.setScalar(1);
      this.phone?.position.set(1.85, 1.08, 0.75);
    }
  }

  protected update(dt: number, time: number) {
    const k = 1 - Math.pow(0.004, dt);
    this.tilt.lerp(this.reduced ? new THREE.Vector2() : this.pointer, k);
    this.rig.rotation.y = this.tilt.x * 0.18;
    this.rig.rotation.x = this.tilt.y * 0.05;
    const float = this.reduced ? 0 : Math.sin(time * 1.1) * 0.05;
    this.phone.position.y = 1.08 + float;
    this.phone.rotation.y = -0.38 + this.phoneSpin;
  }
}
