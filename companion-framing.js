// Companion-only framing. These are geometric projections, not WebGL visual checks.
import * as T from './vendor/three/build/three.module.js';
const DIRECTION = new T.Vector3(.06, .36, 1).normalize();
const finite = v => v.toArray().every(Number.isFinite);

function ignored(object, root) {
  for (let p = object; p; p = p.parent) {
    if (!p.visible || p.userData.companionGround || p.userData.excludeCompanionFraming) return true;
    if (p === root) break;
  }
  return false;
}

/** Capture once per spread in diorama-local coordinates, even when it is folded shut.
 * Do not run physics or timers: open the pop pivots only, then restore their progress.
 * Ground artwork, lights, particles, transparent hit hulls and glow sprites are not content bounds.
 */
export function captureCompanionBounds(state) {
  if (state?.companionBounds) return state.companionBounds;
  const d = state?.diorama, root = d?.group;
  if (!root) return null;
  const progress = d.progress ?? 0, points = [];
  try {
    d.setProgress(1);
    root.updateWorldMatrix(true, false);
    root.updateMatrixWorld(true);
    const inverse = root.matrixWorld.clone().invert();
    root.traverse(object => {
      if (!object.isMesh || !object.geometry || ignored(object, root)) return;
      const materials = [].concat(object.material || []);
      if (!materials.some(m => m.visible !== false && m.opacity > .05 && m.blending !== T.AdditiveBlending && (object.isSkinnedMesh || m.map))) return;
      // All source illustration cards stand upright. Ignore horizontal paper/floor surfaces.
      if (!object.isSkinnedMesh) {
        const normal = new T.Vector3(0, 0, 1).transformDirection(object.matrixWorld);
        if (Math.abs(normal.y) > .85) return;
      }
      let box;
      if (object.isSkinnedMesh) {
        object.skeleton.update();
        object.computeBoundingBox();
        box = object.boundingBox.clone();
        // Keep the initial body readable during small idle motions without chasing each frame.
        box.expandByScalar(box.getSize(new T.Vector3()).length() * .06);
      } else {
        object.geometry.computeBoundingBox();
        box = object.geometry.boundingBox.clone();
      }
      if (box.isEmpty()) return;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new T.Vector3(x, y, z).applyMatrix4(object.matrixWorld).applyMatrix4(inverse);
        if (finite(point)) points.push(point);
      }
    });
  } finally {
    d.setProgress(progress);
    root.updateWorldMatrix(true, false);
    root.updateMatrixWorld(true);
  }
  return state.companionBounds = points.length ? {points} : null;
}

/** The caller sets its normal view offset first, centered on region.
 * Returns camera goals only. It never changes the camera or the scene layout.
 * No 39-unit distance cap: narrow reading regions must not crop principal content.
 */
export function fitCompanionFraming({camera, state, viewport, region, lookCloser = false, padding = .06}) {
  const bounds = captureCompanionBounds(state), root = state?.diorama?.group;
  const width = viewport?.width, height = viewport?.height;
  if (!bounds || !root || !(width > 0 && height > 0 && region?.width > 0 && region?.height > 0)) return null;
  root.updateWorldMatrix(true, false);
  const right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), DIRECTION).normalize();
  const up = new T.Vector3().crossVectors(DIRECTION, right).normalize();
  const points = bounds.points.map(p => p.clone().applyMatrix4(root.matrixWorld)).filter(finite)
    .map(p => [p.dot(right), p.dot(up), p.dot(DIRECTION)]);
  if (!points.length) return null;
  const margin = 1 - 2 * T.MathUtils.clamp(padding, 0, .25);
  const tangent = Math.tan(T.MathUtils.degToRad((camera.getEffectiveFOV?.() ?? camera.fov ?? 33) / 2));
  const tx = tangent * (width / height) * (region.width / width) * margin;
  const ty = tangent * (region.height / height) * margin;
  let minZ = Infinity, maxZ = -Infinity;
  for (const p of points) { minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]); }
  function interval(eye) {
    let left = -Infinity, rightEdge = Infinity, bottom = -Infinity, top = Infinity;
    for (const [x, y, z] of points) {
      const depth = eye - z;
      left = Math.max(left, x - tx * depth); rightEdge = Math.min(rightEdge, x + tx * depth);
      bottom = Math.max(bottom, y - ty * depth); top = Math.min(top, y + ty * depth);
    }
    return {fits: left <= rightEdge && bottom <= top, x: (left + rightEdge) / 2, y: (bottom + top) / 2};
  }
  let lo = maxZ + Math.max(.11, camera.near || .1), hi = lo + 150;
  while (!interval(hi).fits) hi += 150;
  for (let i = 0; i < 52; i++) { const mid = (lo + hi) / 2; if (interval(mid).fits) hi = mid; else lo = mid; }
  const center = interval(hi), target = new T.Vector3().addScaledVector(right, center.x).addScaledVector(up, center.y).addScaledVector(DIRECTION, (minZ + maxZ) / 2);
  const distance = (hi - (minZ + maxZ) / 2) * (lookCloser ? .62 : 1);
  return {position: target.clone().addScaledVector(DIRECTION, distance), target, distance};
}
