// Public StoryComet shelf helpers, adapted for local use; see REFERENCE_SOURCES.json.
import * as THREE from "./vendor/three/build/three.module.js";
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


export function easeOutBack(t) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function fitModel(model, { height = null, length = null, upright = true, flat = false, keep = false } = {}) {
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  let size = box.getSize(new THREE.Vector3());
  if (keep) {
    // trust the model's own orientation
  } else if (flat) {
    const min = Math.min(size.x, size.y, size.z);
    if (size.y !== min) { if (size.z === min) model.rotation.x = -Math.PI / 2; else model.rotation.z = Math.PI / 2; }
  } else if (upright) {
    const max = Math.max(size.x, size.y, size.z);
    if (size.y !== max) { if (size.z === max) model.rotation.x = Math.PI / 2; else model.rotation.z = -Math.PI / 2; }
  }
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  size = box.getSize(new THREE.Vector3());
  const k = height ? height / size.y : length ? length / Math.max(size.x, size.z) : 1;
  model.scale.multiplyScalar(k);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
  model.updateMatrixWorld(true);
  return model;
}

