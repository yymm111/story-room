// Adapted from StoryComet src/scenes.js; local book coordinates.
/* The pop-up engine shared by every book: a Diorama (pop-up elements that hinge or rise as
   the page opens, a registry of touchable objects with labels linked to the words on the page,
   story verbs, and an update loop) plus the builders for painted back cards, paper-cut figures,
   star fields, moons and tied balloons. Each book keeps its own spreads in
   books/<id>/scenes.js and imports these. */
import * as THREE from "./vendor/three/build/three.module.js";
import * as P from "./reference-scene-props.js?v=otto9";

const { clamp, lerp, easeOutBack } = P;

export class Diorama {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.pops = [];
    this.objects = {};
    this.updaters = [];
    this.progress = 0;
    this.pointer = new THREE.Vector3(0, 0.4, 1.5);
    this.bursts = [];
    this.timers = [];
  }

  /** Add an element; wraps it in a pop-up pivot and optionally registers it as touchable. */
  add(object, options = {}) {
    const { pop = "rise", delay = 0, name, label, onHover, onTap, onDrag, onDragEnd, parent, radius, anchor } = options;
    let root = object;
    if (pop) {
      const pivot = new THREE.Group();
      pivot.position.copy(object.position);
      object.position.set(0, 0, 0);
      pivot.add(object);
      pivot.userData.pop = { type: pop, delay, object };
      this.pops.push(pivot);
      root = pivot;
    }
    (parent || this.group).add(root);
    if (name) this.register(name, object, { label, onHover, onTap, onDrag, onDragEnd, root, radius, anchor });
    return root;
  }

  /** Attach a named verb (from a story word like {floated:otto/float}) to a registered object. */
  action(name, verb, fn) {
    const entry = this.objects[name];
    if (!entry) return;
    (entry.actions || (entry.actions = {}))[verb] = fn;
  }

  register(name, object, { label, onHover, onTap, onDrag, onDragEnd, root, radius, anchor }) {
    const entry = { name, label: label || name, object, root: root || object, onHover, onTap, onDrag, onDragEnd, radius: radius || 0.2, anchor: anchor || null };
    this.objects[name] = entry;
    object.traverse((child) => {
      if (child.isMesh || child.isSprite) child.userData.owner = child.userData.owner || name;
    });
    return entry;
  }

  /** A touch target over a region of an illustrated card. */
  hotspot(card, name, rect, { label, onTap, onHover, radius = 0.15, glow = 0xffe2a8 } = {}) {
    const mesh = card.hotspot(rect);
    mesh.userData.owner = name;
    const cx = rect[0] + rect[2] / 2;
    const cy = rect[1] + rect[3] / 2;
    // every hotspot answers the hand with a soft light
    const halo = card.glow(cx, cy, glow, Math.max(rect[2] * card.width, rect[3] * card.height) * 1.4, 0);
    halo.userData.owner = name;
    const state = { target: 0, level: 0 };
    this.updaters.push((dt, t) => {
      state.level += (state.target - state.level) * Math.min(1, dt * 6);
      halo.material.opacity = state.level * (0.22 + Math.sin(t * 3) * 0.04);
    });
    return this.register(name, mesh, {
      label,
      radius,
      anchor: () => card.worldPoint(cx, cy, 0.03),
      onHover: (on) => { state.target = on ? 1 : 0; if (onHover) onHover(on); },
      onTap: () => { state.target = 1; setTimeout(() => { state.target = 0; }, 700); if (onTap) onTap(); },
    });
  }

  every(seconds, fn) {
    this.timers.push({ t: Math.random() * seconds, seconds, fn });
  }

  burst(color = 0xffe9a8, count = 60, size = 0.03) {
    const b = new P.Burst(this.group, count, color, size);
    this.bursts.push(b);
    return b;
  }

  setProgress(p) {
    this.progress = p;
    for (const pivot of this.pops) {
      const { type, delay } = pivot.userData.pop;
      const local = clamp((p - delay) / 0.55, 0, 1);
      if (type === "hinge") {
        pivot.rotation.x = -Math.PI / 2 * (1 - easeOutBack(local));
        pivot.visible = local > 0.001;
      } else {
        const s = Math.max(0.001, easeOutBack(local));
        pivot.scale.setScalar(s);
        pivot.visible = local > 0.001;
      }
    }
  }

  update(dt, t) {
    for (const fn of this.updaters) fn(dt, t);
    for (const b of this.bursts) b.update(dt);
    for (const timer of this.timers) {
      timer.t -= dt;
      if (timer.t <= 0) { timer.t = timer.seconds; timer.fn(); }
    }
  }

  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
    });
  }
}

/* ---------- shared pieces ---------- */

export function art(d, id) {
  return d.ctx.art && d.ctx.art[id];
}

/** Procedural starry backdrop, used only when a painted back card is missing. */
export function skyFallback(d, options = {}) {
  const tex = P.skyTexture(options.top, options.mid, options.bottom, options.stars);
  const backdrop = P.makeBackdrop(1.12, 0.95, tex);
  backdrop.group.position.set(0, 0, -0.62 + backdrop.radius);
  d.add(backdrop.group, { pop: "hinge", delay: 0, name: "sky", label: "sky", onTap: () => d.ctx.sound.sparkle() });
  return { group: backdrop.group, material: backdrop.material, mesh: backdrop.mesh, glow: () => ({ material: { opacity: 0 } }), point: () => new THREE.Vector3(), worldPoint: () => backdrop.group.getWorldPosition(new THREE.Vector3()), bounce() {}, lift() {}, hotspot: () => new THREE.Mesh(), update() {}, fallback: true, width: 1.12, height: 0.95 };
}

export function backCard(d, id, { width = 1.16, z = -0.56, x = 0, delay = 0, name = "sky", label = "sky" } = {}) {
  const a = art(d, id);
  if (!a) return skyFallback(d);
  const card = P.makeCard(a, { width, paperNormal: d.ctx.textures.paperNormal });
  card.group.position.set(x, 0, z);
  d.add(card.group, { pop: "hinge", delay, name, label, radius: 0.5, onTap: () => { card.bounce(); d.ctx.sound.sparkle(); } });
  d.updaters.push((dt, t) => card.update(dt, t));
  return card;
}

export function figure(d, id, { width, x, y = 0, z, delay = 0.2, name, label, onTap, onHover, onDrag, onDragEnd, pop = "rise", radius = 0.18, rotY = 0, register = true } = {}) {
  const a = art(d, id);
  if (!a) return null;
  const card = P.makeCard(a, { width, paperNormal: d.ctx.textures.paperNormal });
  card.group.position.set(x, y, z);
  card.group.rotation.y = rotY;
  const options = { pop, delay, radius, onDrag, onDragEnd };
  if (register && name) Object.assign(options, { name, label, onHover: (on) => { card.lift(on); if (onHover) onHover(on); }, onTap: () => { card.bounce(); if (onTap) onTap(); } });
  d.add(card.group, options);
  d.updaters.push((dt, t) => card.update(dt, t));
  return card;
}

export function standingSpring(group) {
  const base = group.position.clone();
  const off = new THREE.Vector3(), vel = new THREE.Vector3();
  return {
    kick: (x, y, z) => vel.add(new THREE.Vector3(x, y, z)),
    update: (dt) => {
      vel.addScaledVector(off, -40 * dt).addScaledVector(vel, -6 * dt);
      off.addScaledVector(vel, dt);
      group.position.copy(base).add(off);
      if (group.position.y < base.y) group.position.y = base.y;
    },
  };
}

export function tiedBalloon(d, anchorWorldFn, rest, delay = 0.3) {
  const balloon = P.makeBalloon();
  balloon.group.scale.setScalar(0.62);
  balloon.group.position.copy(rest);
  d.add(balloon.group, {
    pop: "rise",
    delay,
    name: "balloon",
    label: "balloon",
    radius: 0.16,
    onHover: (on) => { if (on) balloon.poke(new THREE.Vector3((Math.random() - 0.5) * 0.25, 0.08, 0)); },
    onTap: () => { balloon.poke(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.2, 0.1)); d.ctx.sound.pop(1.3); },
  });
  d.updaters.push((dt, t) => {
    balloon.update(dt, t);
    balloon.tether(anchorWorldFn(), d.group);
  });
  return balloon;
}

export function starField(d, positions, { lit = true, delay = 0.2, size = 0.045 } = {}) {
  const stars = [];
  const holder = new THREE.Group();
  positions.forEach((p) => {
    const star = P.makeStar(size, { lit });
    star.group.position.copy(p);
    holder.add(star.group);
    stars.push(star);
  });
  d.add(holder, { pop: "rise", delay, name: "stars", label: "stars", radius: 0.3, onHover: (on) => { if (on) stars.forEach((s, i) => setTimeout(() => s.twinkle(), i * 60)); }, onTap: () => { stars.forEach((s, i) => setTimeout(() => s.twinkle(), i * 70)); d.ctx.sound.sparkle(); } });
  d.action("stars", "twinkle", () => { stars.forEach((s, i) => setTimeout(() => s.twinkle(), i * 80)); d.ctx.sound.sparkle(); });
  d.updaters.push((dt, t) => stars.forEach((s) => s.update(dt, t)));
  return stars;
}

/** A painted moon card with a glow that can be driven from 0 (dim, shy) to 1 (beaming). */
export function moonCard(d, { width, x, y, z, delay = 0.2, glow = 0.3, name = "moon", label = "moon", onTap }) {
  const card = figure(d, "moon-face", { width, x, y, z, delay, name, label, radius: width * 0.5, onTap: () => { state.pulse = 1; if (onTap) onTap(); } });
  if (!card) return null;
  const halo = card.glow(0.5, 0.5, 0xffe9a8, width * 2.4, 0.2);
  halo.position.z = -0.01;
  const light = new THREE.PointLight(0xffe4a0, 0.4, 2.2, 1.6);
  light.position.copy(card.point(0.5, 0.5, 0.15));
  card.group.add(light);
  const state = { glow, target: glow, pulse: 0 };
  d.updaters.push((dt, t) => {
    state.glow += (state.target - state.glow) * Math.min(1, dt * 2.2);
    if (state.pulse > 0) state.pulse = Math.max(0, state.pulse - dt * 1.4);
    const g = clamp(state.glow + Math.sin(state.pulse * Math.PI) * 0.35, 0, 1.2);
    // keep the painted face readable: the glow lives in the halo and the light, not on the card
    const tint = 0.62 + Math.min(g, 1) * 0.3;
    card.material.color.setRGB(tint, tint, tint * 0.97);
    card.material.emissive.setRGB(g * 0.16, g * 0.13, g * 0.05);
    halo.material.opacity = 0.04 + g * 0.42;
    halo.scale.setScalar(width * (1.8 + g * 1.4 + Math.sin(t * 1.3) * 0.05));
    light.intensity = 0.1 + g * 1.6;
  });
  const api = { card, state, setGlow: (v) => { state.target = clamp(v, 0, 1); }, pulse: () => { state.pulse = 1; } };
  d.action(name, "glow", () => { api.setGlow(1); api.pulse(); d.ctx.sound.glow(); });
  d.action(name, "smile", () => { api.pulse(); card.bounce(); d.ctx.sound.chime(6, 0.4); });
  d.action(name, "pale", () => { api.setGlow(0.08); card.bounce(); d.ctx.sound.chime(2, 0.3); setTimeout(() => api.setGlow(state.target < 0.3 ? 0.3 : state.target), 2500); });
  d.action(name, "hide", () => { api.setGlow(0.03); d.ctx.sound.puff(); });
  return api;
}

/** Bedroom cards shared by three pages: the painted wall and the paper-cut furniture. */

/** Build one spread from a book's registry of scene builders (`books/<id>/scenes.js`). */
export function buildScene(builders, name, ctx) {
  const builder = builders[name] || builders.end;
  return builder(ctx);
}

