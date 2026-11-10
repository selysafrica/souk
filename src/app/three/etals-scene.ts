import * as THREE from 'three';
import type { Product } from '../core/catalog.model';
import { screenTexture, tint } from './screen-texture';
import { fontsReady, Stage } from './stage';

const TEAL = '#047A7F';
const DEEP = '#035C60';
const INK = '#0F2830';
const WOOD = '#E3BC8A';
const SUN = '#FFE6BF';
const SPACING = 7.5;
const FONT = '"Montserrat Variable", Montserrat, system-ui, sans-serif';

interface Stall {
  group: THREE.Group;
  sign: THREE.Group;
  swingFrom: number;
}

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Striped awning canvas: product colour and white, like market tarpaulins. */
function awningTexture(accent: string) {
  return canvasTexture(512, 256, (c) => {
    const n = 8;
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? '#FFFFFF' : accent;
      c.fillRect((i * 512) / n, 0, 512 / n, 256);
    }
    c.fillStyle = 'rgba(0,0,0,.06)';
    for (let y = 0; y < 256; y += 6) c.fillRect(0, y, 512, 2);
  });
}

/** Scalloped valance edge with transparency. */
function valanceTexture(accent: string) {
  return canvasTexture(512, 64, (c) => {
    const n = 8;
    const w = 512 / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? '#FFFFFF' : accent;
      c.beginPath();
      c.moveTo(i * w, 0);
      c.lineTo(i * w + w, 0);
      c.lineTo(i * w + w, 26);
      c.quadraticCurveTo(i * w + w / 2, 72, i * w, 26);
      c.closePath();
      c.fill();
    }
  });
}

/** Table cloth with a simple printed repeat in the product colour. */
function clothTexture(accent: string) {
  return canvasTexture(512, 192, (c) => {
    c.fillStyle = accent;
    c.fillRect(0, 0, 512, 192);
    c.fillStyle = 'rgba(255,255,255,.9)';
    for (let x = 0; x < 512; x += 64)
      for (let y = 0; y < 192; y += 64) {
        const ox = (y / 64) % 2 ? 32 : 0;
        c.beginPath();
        c.arc(x + ox + 32, y + 32, 13, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = accent;
        c.beginPath();
        c.arc(x + ox + 32, y + 32, 6, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.9)';
      }
    c.fillStyle = 'rgba(15,40,48,.25)';
    c.fillRect(0, 180, 512, 12);
  });
}

/** The painted shop sign: metier above, product name large. */
function signTexture(p: Product) {
  return canvasTexture(1024, 288, (c) => {
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.roundRect(0, 0, 1024, 288, 28);
    c.fill();
    c.strokeStyle = p.accent;
    c.lineWidth = 16;
    c.beginPath();
    c.roundRect(14, 14, 996, 260, 20);
    c.stroke();
    c.textAlign = 'center';
    c.fillStyle = `#${new THREE.Color(p.accent).lerp(new THREE.Color(INK), 0.3).getHexString()}`;
    c.font = `800 44px ${FONT}`;
    c.fillText(p.metier.toUpperCase(), 512, 92, 900);
    c.fillStyle = INK;
    let size = 130;
    c.font = `900 ${size}px ${FONT}`;
    while (c.measureText(p.name).width > 900 && size > 60) {
      size -= 6;
      c.font = `900 ${size}px ${FONT}`;
    }
    c.fillText(p.name, 512, 222);
  });
}

function floorTexture() {
  const t = canvasTexture(512, 512, (c) => {
    c.fillStyle = DEEP;
    c.fillRect(0, 0, 512, 512);
    c.strokeStyle = 'rgba(255,255,255,.07)';
    c.lineWidth = 3;
    for (let i = 0; i <= 512; i += 128) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, 512);
      c.moveTo(0, i);
      c.lineTo(512, i);
      c.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class EtalsScene extends Stage {
  private stalls: Stall[] = [];
  private readonly time = { value: 0 };
  private readonly target = new THREE.Vector3();
  private readonly camPos = new THREE.Vector3();
  private readonly pointer = new THREE.Vector2();
  private readonly pointerSmooth = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private spot!: THREE.SpotLight;
  private sun!: THREE.DirectionalLight;
  private bulbs!: THREE.InstancedMesh;
  private active = 0;
  private lift = 0;
  /** Sideways step into the alley during a move, so the camera goes round the stalls. */
  private arc = 0;
  private downAt: { x: number; y: number; t: number } | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly products: Product[],
    private readonly onSelect: (index: number) => void,
  ) {
    super(canvas, 38);
    this.scene.background = new THREE.Color(TEAL);
    this.scene.fog = new THREE.Fog(TEAL, 13, 42);
    // Neutral tone mapping keeps the product colours true (ACES pushes yellow towards khaki).
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = !this.isSmall();
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  async build(initial: number) {
    await fontsReady();
    this.buildHall();
    for (let i = 0; i < this.products.length; i++) this.stalls.push(await this.buildStall(this.products[i], i));
    this.bindPointer();
    this.goTo(initial, true);
    this.start();
  }

  private flutter(mat: THREE.MeshStandardMaterial, amount: number) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms['uTime'] = this.time;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float edge = 1.0 - uv.y;
         transformed.z += sin(position.x * 2.4 + uTime * 2.1) * ${amount.toFixed(3)} * edge
                        + sin(position.x * 5.0 - uTime * 3.3) * ${(amount * 0.35).toFixed(3)} * edge;`,
      );
    };
  }

  private buildHall() {
    const length = Math.max(1, this.products.length) * SPACING + 30;
    const hemi = new THREE.HemisphereLight('#F3F6EE', '#0A4A4C', 1.2);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(SUN, 2.6);
    sun.position.set(-8, 10, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun, sun.target);
    this.sun = sun;

    this.spot = new THREE.SpotLight('#FFF3DC', 14, 14, 0.55, 0.6, 1.4);
    this.scene.add(this.spot, this.spot.target);

    const floorTex = floorTexture();
    floorTex.repeat.set(6, length / 4);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, length),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -length / 2 + 12);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Covered market: beams across the alley, pillars on both sides, closed shutters opposite.
    const beamMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.7 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#0B4549', roughness: 0.8 });
    const shutterMat = new THREE.MeshStandardMaterial({ color: '#06696D', roughness: 0.6, metalness: 0.2 });
    const beamGeo = new THREE.BoxGeometry(12, 0.22, 0.22);
    const pillarGeo = new THREE.BoxGeometry(0.28, 5, 0.28);
    const shutterGeo = new THREE.BoxGeometry(0.1, 2.8, 3.2);
    const bulbsPerBeam = 9;
    const beams = Math.ceil(length / (SPACING / 2));
    this.bulbs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#FFC86A' }),
      beams * bulbsPerBeam,
    );
    const m = new THREE.Matrix4();
    let b = 0;
    for (let k = 0; k < beams; k++) {
      const z = 1.5 - k * (SPACING / 2);
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 4.8, z);
      this.scene.add(beam);
      for (const x of [-4.6, 5.9]) {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(x, 2.5, z);
        pillar.castShadow = true;
        this.scene.add(pillar);
      }
      if (k % 2 === 0) {
        const shutter = new THREE.Mesh(shutterGeo, shutterMat);
        shutter.position.set(-4.6, 1.4, z - SPACING / 4);
        this.scene.add(shutter);
      }
      // A sagging string of bulbs under each beam.
      for (let j = 0; j < bulbsPerBeam; j++) {
        const u = j / (bulbsPerBeam - 1);
        const x = -4.2 + u * 9.8;
        const y = 4.55 - Math.sin(u * Math.PI) * 0.55;
        m.makeTranslation(x, y, z + 0.4);
        this.bulbs.setMatrixAt(b++, m);
      }
      const curve = new THREE.CatmullRomCurve3(
        Array.from({ length: 9 }, (_, j) => {
          const u = j / 8;
          return new THREE.Vector3(-4.2 + u * 9.8, 4.6 - Math.sin(u * Math.PI) * 0.55, z + 0.4);
        }),
      );
      const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.008, 4), beamMat);
      this.scene.add(wire);
    }
    this.scene.add(this.bulbs);
  }

  private async buildStall(p: Product, i: number): Promise<Stall> {
    const group = new THREE.Group();
    group.position.set(2.2, 0, -i * SPACING);
    group.rotation.y = -0.42;
    group.userData['index'] = i;

    const wood = new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.75 });
    const iron = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.6, metalness: 0.3 });

    // Table and printed cloth.
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 1.36), wood);
    top.position.set(0, 0.93, 0.04);
    top.castShadow = top.receiveShadow = true;
    group.add(top);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.7),
      (() => {
        // The cloth hangs in the tabletop's shadow: a little self-light keeps its true colour.
        const map = clothTexture(p.accent);
        return new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#FFFFFF', emissiveIntensity: 0.1, roughness: 0.9 });
      })(),
    );
    cloth.position.set(0, 0.5, 0.61);
    group.add(cloth);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.76, 0.86, 1.16), new THREE.MeshStandardMaterial({ color: '#7A532D' }));
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    // Posts.
    const postGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.9, 8);
    for (const [x, z] of [[-1.45, -0.62], [1.45, -0.62], [-1.45, 0.95], [1.45, 0.95]]) {
      const post = new THREE.Mesh(postGeo, iron);
      post.position.set(x, 1.45 - (z > 0 ? 0.2 : 0), z);
      post.scale.y = z > 0 ? 0.86 : 1;
      post.castShadow = true;
      group.add(post);
    }

    // Awning with fluttering free edge, and a scalloped valance.
    const awningMat = new THREE.MeshStandardMaterial({ map: awningTexture(p.accent), side: THREE.DoubleSide, roughness: 0.85 });
    this.flutter(awningMat, 0.03);
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.9, 24, 10), awningMat);
    awning.position.set(0, 2.68, 0.2);
    awning.rotation.x = -Math.PI / 2 + 0.28;
    awning.castShadow = true;
    group.add(awning);
    const valMat = new THREE.MeshStandardMaterial({ map: valanceTexture(p.accent), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
    this.flutter(valMat, 0.04);
    const valance = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.36, 24, 2), valMat);
    valance.position.set(0, 2.24, 1.12);
    group.add(valance);

    // Hanging painted sign, hinged at the top so it can swing.
    const sign = new THREE.Group();
    sign.position.set(0, 3.95, 0.35);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.65, 0.05),
      [iron, iron, iron, iron, new THREE.MeshStandardMaterial({ map: signTexture(p), roughness: 0.5 }), iron],
    );
    board.position.y = -0.62;
    board.castShadow = true;
    sign.add(board);
    for (const x of [-0.9, 0.9]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), iron);
      chain.position.set(x, -0.15, 0);
      sign.add(chain);
    }
    group.add(sign);

    // The product itself: a screen on the table.
    const screen = new THREE.Group();
    screen.position.set(-0.1, 0.96, -0.05);
    const tex = await screenTexture(p);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.04, 0.06), new THREE.MeshStandardMaterial({ color: '#13262B', roughness: 0.4, metalness: 0.4 }));
    frame.position.y = 0.72;
    frame.castShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 0.95), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    face.position.set(0, 0.72, 0.031);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), iron);
    stand.position.y = 0.12;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.32), iron);
    screen.add(frame, face, stand, foot);
    screen.rotation.x = -0.12;
    group.add(screen);

    // A few goods on the table, in the product colour.
    const goodsMat = new THREE.MeshStandardMaterial({ color: p.accent, roughness: 0.6 });
    const pale = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.accent).lerp(new THREE.Color('#FFFFFF'), 0.6) });
    const boxA = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.26), goodsMat);
    boxA.position.set(1.08, 1.08, 0.18);
    boxA.rotation.y = 0.3;
    const boxB = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.2), pale);
    boxB.position.set(1.06, 1.29, 0.16);
    boxB.rotation.y = -0.2;
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.2, 16, 1, true), wood);
    basket.position.set(-1.05, 1.06, 0.25);
    for (const g of [boxA, boxB, basket]) {
      g.castShadow = true;
      group.add(g);
    }
    // Crates on the ground.
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.45), wood);
    crate.position.set(1.75, 0.225, 0.3);
    crate.rotation.y = 0.25;
    crate.castShadow = true;
    group.add(crate);

    this.scene.add(group);
    return { group, sign, swingFrom: -10 };
  }

  private view(i: number) {
    const s = this.stalls[i]?.group.position ?? new THREE.Vector3(2.2, 0, -i * SPACING);
    // Phones: stand in the alley, in front of and beside the stall. Stalls are SPACING apart,
    // so the camera must stay closer than that in depth or the previous stall fills the lens.
    if (this.portrait()) {
      return {
        pos: new THREE.Vector3(s.x - 5.6, 2.55, s.z + 4.4),
        target: new THREE.Vector3(s.x - 0.35, 1.55, s.z - 0.1),
      };
    }
    return {
      pos: new THREE.Vector3(s.x - 4.4, 2.15, s.z + 7.6),
      target: new THREE.Vector3(s.x - 2.1, 1.75, s.z - 0.4),
    };
  }

  goTo(i: number, instant = false) {
    if (!this.stalls.length) return;
    this.active = Math.max(0, Math.min(this.stalls.length - 1, i));
    const to = this.view(this.active);
    const fromPos = this.camPos.clone();
    const fromTarget = this.target.clone();
    const stall = this.stalls[this.active];
    this.spot.position.copy(stall.group.position).add(new THREE.Vector3(-2.4, 5.2, 3.2));
    this.spot.target.position.copy(stall.group.position).add(new THREE.Vector3(0, 1.2, 0));
    // Keep the shadow frustum around the stall in view.
    this.sun.target.position.copy(stall.group.position);
    this.sun.position.copy(stall.group.position).add(new THREE.Vector3(-8, 10, 6));
    if (instant || this.reduced) {
      this.camPos.copy(to.pos);
      this.target.copy(to.target);
      stall.swingFrom = this.clock.getElapsed();
      return;
    }
    const distance = fromPos.distanceTo(to.pos);
    const duration = Math.min(2200, 900 + distance * 90);
    this.tween(0, 1, duration, (k) => {
      this.camPos.lerpVectors(fromPos, to.pos, k);
      this.target.lerpVectors(fromTarget, to.target, k);
      this.lift = Math.sin(k * Math.PI) * Math.min(0.5, distance * 0.03);
      this.arc = Math.sin(k * Math.PI) * Math.min(1.4, distance * 0.09);
    }, () => {
      stall.swingFrom = this.clock.getElapsed();
    });
  }

  private portrait() {
    return this.aspect < 0.9 || this.isSmall();
  }

  protected override onResize() {
    // A wider lens on phones, so the whole stall (sign, awning, table) fits the narrow band.
    const fov = this.portrait() ? 50 : 38;
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    if (this.stalls.length) {
      const v = this.view(this.active);
      this.camPos.copy(v.pos);
      this.target.copy(v.target);
    }
  }

  private bindPointer() {
    const el = this.canvas;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      el.style.cursor = this.hit(this.pointer) !== null ? 'pointer' : 'grab';
    });
    el.addEventListener('pointerdown', (e) => {
      this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    el.addEventListener('pointerup', (e) => {
      if (!this.downAt) return;
      const dx = e.clientX - this.downAt.x;
      const dy = e.clientY - this.downAt.y;
      this.downAt = null;
      if (Math.hypot(dx, dy) < 6) {
        const r = el.getBoundingClientRect();
        const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        const idx = this.hit(p);
        if (idx !== null) this.onSelect(idx);
      }
    });
    el.addEventListener('pointerleave', () => this.pointer.set(0, 0));
  }

  private hit(p: THREE.Vector2): number | null {
    this.raycaster.setFromCamera(p, this.camera);
    const hits = this.raycaster.intersectObjects(this.stalls.map((s) => s.group), true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && o.userData['index'] === undefined) o = o.parent;
      if (o) return o.userData['index'] as number;
    }
    return null;
  }

  protected update(dt: number, time: number) {
    this.time.value = this.reduced ? 0 : time;
    const ease = 1 - Math.pow(0.002, dt);
    this.pointerSmooth.lerp(this.reduced ? new THREE.Vector2() : this.pointer, ease);
    const breathe = this.reduced ? 0 : Math.sin(time * 0.6) * 0.04;
    this.camera.position.set(
      this.camPos.x - this.arc + this.pointerSmooth.x * 0.35,
      this.camPos.y + this.lift + breathe + this.pointerSmooth.y * 0.15,
      this.camPos.z,
    );
    this.camera.lookAt(this.target);
    for (const s of this.stalls) {
      // A stall that has passed behind the camera is hidden, so nothing ever sits against the lens.
      s.group.visible = s.group.position.z < this.camera.position.z + 1.2;
      const t = time - s.swingFrom;
      s.sign.rotation.x = t >= 0 && t < 6 && !this.reduced ? Math.sin(t * 4.2) * 0.16 * Math.exp(-t * 0.9) : 0;
    }
  }
}
