// Adapted from StoryComet src/props.js; book props only. See THIRD_PARTY.md.
/* Shared 3D vocabulary for the pop-up dioramas: felt and paper materials, Otto, the balloon,
   clouds, the moon, stars, houses, trees, the owl, the cat, the bedroom furniture and a few
   particle helpers. Everything is procedural so it can react to the reader. */
import * as THREE from "./vendor/three/build/three.module.js";
import { RoundedBoxGeometry } from "./vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js";


export const PALETTE = {
  fur: 0xc8823f,
  furLight: 0xf1d3a2,
  nose: 0x3a2418,
  scarf: 0xd9382c,
  balloon: 0xe0352b,
  cloud: 0xf4f0ff,
  cloudShade: 0xc9c4ea,
  moon: 0xfff0b8,
  gold: 0xffd166,
  navy: 0x1d2650,
  wood: 0xb8823f,
  woodDark: 0x7a4f26,
  cream: 0xf8efd8,
  leaf: 0x3f7a4b,
  leafDark: 0x2f5c3a,
  owl: 0x8a5a36,
  owlBelly: 0xe9cfa4,
  cat: 0x3b3550,
  blanket: 0x7fa7d9,
  pillow: 0xfbf4e3,
};

/* ---------- materials ---------- */

export function felt(color, options = {}) {
  const c = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: 0.92,
    metalness: 0,
    sheen: 0.9,
    sheenRoughness: 0.55,
    sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.35),
    ...options,
  });
}

export function paper(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0, ...options });
}

export function glossy(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.22,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    ...options,
  });
}

export function glow(color, intensity = 1.2, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.6,
    ...options,
  });
}

export function wood(dark = false) {
  return new THREE.MeshStandardMaterial({ color: dark ? PALETTE.woodDark : PALETTE.wood, roughness: 0.62, metalness: 0.05 });
}

/* ---------- helpers ---------- */

export function sphere(radius, material, segments = 28) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.round(segments * 0.75)), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function capsule(radius, length, material) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 14), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function box(w, h, d, material, radius = 0.01) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function radialSprite(inner, outer, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, "0.55)"));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let glowTexture = null;
/** Same look as glowSprite but as a flat quad in its parent's plane (for glows on painted cards). */
export function glowPlane(color = 0xfff0b8, size = 1, opacity = 0.7) {
  if (!glowTexture) glowTexture = radialSprite("rgba(255,255,255,1)", "rgba(255,255,255,0)");
  const material = new THREE.MeshBasicMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.scale.setScalar(size);
  mesh.renderOrder = 5;
  // glows are light, not things: never a hit target (a hotspot halo 1.4x its rect was answering
  // taps on the whole owl as "eyes")
  mesh.raycast = () => {};
  return mesh;
}

export function glowSprite(color = 0xfff0b8, scale = 1, opacity = 0.7) {
  if (!glowTexture) glowTexture = radialSprite("rgba(255,255,255,1)", "rgba(255,255,255,0)");
  const material = new THREE.SpriteMaterial({
    map: glowTexture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(scale);
  sprite.renderOrder = 5;
  return sprite;
}

export function starShape(outer, inner, points = 5) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export function easeOutBack(t) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- Otto ---------- */


export function makeBalloon(color = PALETTE.balloon) {
  const group = new THREE.Group();
  const skin = glossy(color, { transmission: 0, thickness: 0.2, ior: 1.3, roughness: 0.15 });
  const bulb = sphere(0.16, skin, 40);
  bulb.scale.set(1, 1.18, 1);
  bulb.position.y = 0.19;
  group.add(bulb);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 12), glossy(color));
  knot.position.y = -0.005;
  knot.rotation.x = Math.PI;
  group.add(knot);
  const highlight = sphere(0.035, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }), 12);
  highlight.scale.set(1, 1.6, 0.4);
  highlight.position.set(-0.06, 0.29, 0.13);
  group.add(highlight);
  const stringMat = new THREE.MeshStandardMaterial({ color: 0xf0e2c3, roughness: 0.9 });
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 1, 6), stringMat);
  string.castShadow = false;
  const state = { vel: new THREE.Vector3(), offset: new THREE.Vector3(), rest: new THREE.Vector3(), drag: null, seed: Math.random() * 10 };
  const api = {
    group,
    string,
    state,
    poke(dir) {
      state.vel.add(dir);
    },
    /** attach the string between the balloon knot and a world point (Otto's paw) */
    tether(anchor, parent) {
      if (!string.parent) parent.add(string);
      // fresh world matrices: while a page pops in, its scale changes every frame, and a knot read
      // from last frame's matrix against a paw read from this one stretched the string across the scene
      group.updateWorldMatrix(true, false);
      parent.updateWorldMatrix(true, false);
      const knotWorld = group.localToWorld(new THREE.Vector3(0, -0.03, 0));
      const a = parent.worldToLocal(knotWorld.clone());
      const b = parent.worldToLocal(anchor.clone());
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const len = a.distanceTo(b);
      string.position.copy(mid);
      string.scale.y = Math.max(0.01, len);
      string.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    },
    update(dt, t) {
      // spring back toward the rest position, with a gentle breeze
      const s = state;
      const wind = new THREE.Vector3(Math.sin(t * 0.7 + s.seed) * 0.012, Math.sin(t * 1.1 + s.seed) * 0.008, Math.cos(t * 0.5 + s.seed) * 0.008);
      const target = s.drag || wind;
      const force = target.clone().sub(s.offset).multiplyScalar(s.drag ? 18 : 3.2);
      s.vel.add(force.multiplyScalar(dt));
      s.vel.multiplyScalar(Math.max(0, 1 - dt * (s.drag ? 6 : 1.4)));
      s.offset.add(s.vel.clone().multiplyScalar(dt));
      group.position.copy(s.rest).add(s.offset);
      group.rotation.z = -s.offset.x * 1.6 + Math.sin(t * 0.9) * 0.03;
      group.rotation.x = s.offset.z * 1.6;
    },
  };
  return api;
}

/* ---------- clouds ---------- */


export function makeStar(size = 0.05, options = {}) {
  const geometry = new THREE.ExtrudeGeometry(starShape(size, size * 0.45), { depth: size * 0.35, bevelEnabled: true, bevelThickness: size * 0.08, bevelSize: size * 0.06, bevelSegments: 2 });
  geometry.center();
  const mat = new THREE.MeshStandardMaterial({ color: PALETTE.gold, emissive: 0xffc94a, emissiveIntensity: options.lit === false ? 0.12 : 0.45, roughness: 0.5 });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  const halo = glowSprite(0xffe9a8, size * 5, options.lit === false ? 0.15 : 0.5);
  group.add(halo);
  const state = { twinkle: Math.random() * 6, lit: options.lit !== false, burst: 0 };
  const api = {
    group,
    mesh,
    state,
    setLit(lit) { state.lit = lit; },
    twinkle() { state.burst = 1; },
    update(dt, t) {
      const s = state;
      if (s.burst > 0) s.burst = Math.max(0, s.burst - dt * 1.8);
      const burst = Math.sin(s.burst * Math.PI);
      const tw = 0.5 + Math.sin(t * 2.4 + s.twinkle) * 0.5;
      const base = s.lit ? 0.32 + tw * 0.32 : 0.1;
      mat.emissiveIntensity = base + burst * 1.2;
      halo.material.opacity = (s.lit ? 0.18 + tw * 0.2 : 0.08) + burst * 0.4;
      const sc = 1 + burst * 0.6 + (s.lit ? tw * 0.08 : 0);
      mesh.scale.setScalar(sc);
      mesh.rotation.z += dt * (0.3 + burst * 4);
    },
  };
  return api;
}

/* ---------- houses (3D) ---------- */


export function skyTexture(top = "#0d1230", mid = "#1c2454", bottom = "#3b3f7a", stars = 140) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  let seed = 7;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < stars; i++) {
    const x = rand() * 512, y = rand() * 400, r = 0.5 + rand() * 1.6;
    ctx.fillStyle = `rgba(255,${230 + Math.floor(rand() * 25)},${180 + Math.floor(rand() * 70)},${0.4 + rand() * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A curved pop-up backdrop card standing along the far edge of the page. */
export function makeBackdrop(width = 1.1, height = 0.9, texture = null) {
  // A gently curved card: chord width = 1.62 R, depth = 0.41 R, so R = width / 1.62.
  const radius = width / 1.62;
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 40, 1, true, Math.PI * 0.7, Math.PI * 0.6);
  const material = new THREE.MeshStandardMaterial({ map: texture || skyTexture(), roughness: 1, side: THREE.BackSide, emissive: 0x1a1f45, emissiveIntensity: 0.45 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = height / 2;
  mesh.receiveShadow = false;
  const group = new THREE.Group();
  group.add(mesh);
  return { group, mesh, material, radius };
}

export function makePaperStrip(texture, width = 1.2) {
  const aspect = texture.image ? texture.image.height / texture.image.width : 0.3;
  const height = width * aspect;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.2, roughness: 0.95, side: THREE.DoubleSide }));
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.hitTest=texture.userData.hitTest;
  const group = new THREE.Group();
  group.add(mesh);
  return { group, mesh, height };
}

/* ---------- particles ---------- */

export class Burst {
  constructor(parent, count = 60, color = 0xffe9a8, size = 0.03) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    if (!Burst.texture) Burst.texture = radialSprite("rgba(255,255,255,1)", "rgba(255,255,255,0)", 64);
    Burst.texture.userData.shared=true;
    const material = new THREE.PointsMaterial({ color, size, map: Burst.texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    this.next = 0;
    parent.add(this.points);
    for (let i = 0; i < count; i++) this.positions[i * 3 + 1] = -100;
  }
  emit(origin, n = 8, speed = 0.4, spread = 1) {
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.count;
      this.positions[i * 3] = origin.x;
      this.positions[i * 3 + 1] = origin.y;
      this.positions[i * 3 + 2] = origin.z;
      const a = Math.random() * Math.PI * 2;
      const b = (Math.random() - 0.3) * Math.PI;
      this.velocities[i * 3] = Math.cos(a) * Math.cos(b) * speed * spread;
      this.velocities[i * 3 + 1] = Math.sin(b) * speed + speed * 0.4;
      this.velocities[i * 3 + 2] = Math.sin(a) * Math.cos(b) * speed * spread;
      this.life[i] = 0.7 + Math.random() * 0.6;
    }
  }
  update(dt) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.velocities[i * 3 + 1] -= dt * 0.35;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      if (this.life[i] <= 0) this.positions[i * 3 + 1] = -100;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

/* ---------- illustrated pop-up cards ---------- */

/** A flat illustrated card (painted back card or paper-cut figure) standing on the page. */
export function makeCard(art, { width = 1, cutout = art.cutout, paperNormal = null } = {}) {
  const tex = art.texture;
  const aspect = art.height / art.width;
  const height = width * aspect;
  const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
  geometry.translate(0, height / 2, 0);
  const material = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.94,
    metalness: 0,
    transparent: !!cutout,
    alphaTest: cutout ? 0.45 : 0,
    side: THREE.DoubleSide,
    emissive: 0x000000,
  });
  if (paperNormal) { material.normalMap = paperNormal; material.normalScale.set(0.2, 0.2); }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if(cutout)mesh.userData.hitTest=tex.userData.hitTest;
  if (cutout) mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.45 });
  const group = new THREE.Group();
  group.add(mesh);
  const state = { bounce: 0, sway: Math.random() * 6, tilt: 0, targetTilt: 0, lift: 0, targetLift: 0 };
  const api = {
    group,
    mesh,
    material,
    width,
    height,
    state,
    /** local point on the card from normalised (0..1) coordinates, bottom-left origin */
    point(nx, ny, dz = 0.012) {
      return new THREE.Vector3((nx - 0.5) * width, ny * height, dz);
    },
    worldPoint(nx, ny, dz = 0.012) {
      return group.localToWorld(api.point(nx, ny, dz));
    },
    /** invisible touch target over a region of the card (normalised rect) */
    hotspot(rect) {
      const [x, y, w, h] = rect;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w * width, h * height), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      m.position.set((x + w / 2 - 0.5) * width, (y + h / 2) * height, 0.006);
      m.renderOrder = -1;
      group.add(m);
      return m;
    },
    /** a soft glow lying flat on the card (a plane parallel to it, never a billboard that would
        cut into the tilted card and leave a hard edge) */
    glow(nx, ny, color = 0xffd98a, size = 0.2, opacity = 0.5) {
      const s = glowPlane(color, size, opacity);
      s.position.copy(api.point(nx, ny, 0.02));
      group.add(s);
      return s;
    },
    bounce() { state.bounce = 1; },
    lift(on) { state.targetLift = on ? 1 : 0; },
    update(dt, t) {
      const s = state;
      if (s.bounce > 0) s.bounce = Math.max(0, s.bounce - dt * 2);
      const k = Math.sin(s.bounce * Math.PI);
      s.lift += (s.targetLift - s.lift) * Math.min(1, dt * 6);
      s.tilt += (s.targetTilt - s.tilt) * Math.min(1, dt * 5);
      mesh.scale.set(1 + k * 0.05 + s.lift * 0.02, 1 - k * 0.04 + s.lift * 0.03, 1);
      mesh.rotation.y = s.tilt + Math.sin(t * 0.7 + s.sway) * 0.008;
      mesh.rotation.z = k * 0.03;
    },
  };
  return api;
}

