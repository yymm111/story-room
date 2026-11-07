// Adapted from publicly served StoryComet src/props.js, retrieved 2026-11-06.
// Preserves the source character posture, gaze, blinking and hand IK.
import * as THREE from './vendor/three/build/three.module.js';
import {clone as skeletonClone} from './vendor/three/examples/jsm/utils/SkeletonUtils.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const _v = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(() => new THREE.Vector3());
const _q = [0, 1, 2, 3, 4].map(() => new THREE.Quaternion());
const _identity = new THREE.Quaternion();

/** Rotate `bone` in world space so the line from the bone to `tip` points at `target`. */
function aimBone(bone, tip, target, strength = 1) {
  const from = bone.getWorldPosition(_v[0]);
  const tipPos = tip.getWorldPosition(_v[1]);
  const cur = _v[2].subVectors(tipPos, from).normalize();
  const want = _v[3].subVectors(target, from).normalize();
  if (cur.lengthSq() < 1e-6 || want.lengthSq() < 1e-6) return;
  const delta = _q[0].setFromUnitVectors(cur, want);
  if (strength < 1) delta.slerp(_identity, 1 - strength);
  const worldQ = bone.getWorldQuaternion(_q[1]);
  const parentQ = bone.parent.getWorldQuaternion(_q[2]);
  const newWorld = _q[3].copy(delta).multiply(worldQ);
  bone.quaternion.copy(parentQ.invert().multiply(newWorld));
  bone.updateWorldMatrix(false, true);
}

/** Same API as makeOtto, driven by the rigged, textured GLB generated from the character sheet. */
export function makeOttoModel(gltf, clips = {}) {
  const group = new THREE.Group();
  const model = skeletonClone(gltf.scene);
  model.scale.setScalar(0.86);
  group.add(model);
  const bones = {};
  model.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      const m = o.material;
      m.metalness = 0;
      if (!m.isMeshPhysicalMaterial) m.roughness = 0.78;
      if (m.emissive) m.emissive.setHex(0x000000);
      m.emissiveMap = null;
      if (m.sheen !== undefined) { m.sheen = 0.36; m.sheenRoughness = 0.78; m.sheenColor = new THREE.Color(0xffe0b0); }
      m.needsUpdate = true;
    }
  });
  // animation: a looping base clip per pose (idle / hang / doze) and one-shots (wave, look, jump)
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  const addClip = (name, clip, loop = true) => {
    if (!clip) return;
    const a = mixer.clipAction(clip);
    if (!loop) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    actions[name] = a;
  };
  addClip("idle", gltf.animations[0]);
  // looping poses and one-shot gestures; a book declares whichever clips its hero has
  const LOOPS = new Set(["idle", "hang", "doze", "run", "swim", "sit", "float"]);
  for (const [name, clip] of Object.entries(clips)) addClip(name, clip, LOOPS.has(name));
  const idle = actions.idle || null;
  const state = { pose: "stand", look: new THREE.Vector3(0, 0.4, 2), wave: 0, blink: 0, nextBlink: 2 + Math.random() * 3, hold: null, holdSide: "left", yaw: 0, pitch: 0, seed: Math.random() * 6, base: null, oneShot: null };
  const playBase = (name, fade = 0.4) => {
    const a = actions[name] || idle;
    if (!a) return;
    if (state.base === a) return;
    a.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (state.base) state.base.fadeOut(fade);
    state.base = a;
  };
  const playOnce = (name, fade = 0.2) => {
    const a = actions[name];
    if (!a) return false;
    if (state.oneShot) { state.oneShot.fadeOut(0.1); }
    a.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (state.base) state.base.fadeOut(fade);
    state.oneShot = a;
    return true;
  };
  mixer.addEventListener("finished", (e) => {
    if (e.action !== state.oneShot) return;
    state.oneShot = null;
    if (state.base) { state.base.reset().setEffectiveWeight(1).fadeIn(0.35).play(); }
    e.action.fadeOut(0.35);
  });
  playBase("idle", 0);
  if (idle) idle.time = Math.random() * idle.getClip().duration;
  const head = bones.Head;
  const neck = bones.neck || (head ? head.parent : null);
  model.updateMatrixWorld(true);
  const headRestWorld = head ? head.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
  const headRestWorldInv = headRestWorld.clone().invert();
  const headFromNeck = neck ? neck.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(headRestWorld) : new THREE.Quaternion();
  const restLocal = {};
  for (const name of ["Head", "neck"]) if (bones[name]) restLocal[name] = bones[name].quaternion.clone();
  // POSTURE RULE: the shared idle (and some retargeted clips) fold the neck, spine and hips far
  // beyond the rest pose: two seconds in, every hero bows 30 to 45 degrees (Pong 100), which from
  // the reading camera hides the face and shows the top of the head. Each frame the torso chain is
  // pulled back to within a friendly angle of its rest pose (the hips by tilt only, so turning and
  // walking are untouched) and a standing hero's legs stay near rest too. The limits open up for
  // swimming, floating and sleeping, and for one-shot gestures (wave, look, jump, walk).
  // (radians; the reading camera looks down at about 45 degrees, so even a modest bow of the
  // chain hides a face: standing heroes keep to a few degrees per joint)
  const POSTURE = {
    stand: { hips: 0.09, spine: 0.09, neck: 0.11, upLeg: 0.22, leg: 0.28 },
    peek: { hips: 0.09, spine: 0.09, neck: 0.11, upLeg: 0.22, leg: 0.28 },
    run: { hips: 0.25, spine: 0.2, neck: 0.2 },
    swim: { hips: 0.3, spine: 0.18, neck: 0.18 },
    float: { hips: 0.25, spine: 0.18, neck: 0.18 },
    sleep: { hips: 0.12, spine: 0.15, neck: 0.3, upLeg: 0.3, leg: 0.4 },
  };
  for (const name of ["Hips", "Spine", "Spine1", "Spine2", "Neck", "LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg"]) if (bones[name]) restLocal[name] = bones[name].quaternion.clone();
  const _mq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _bq = new THREE.Quaternion(), _fq = new THREE.Quaternion(), _sq = new THREE.Quaternion();
  const _up = new THREE.Vector3();
  // the character's up axis expressed in the hips' rest frame (the hips bone's own axes are not
  // upright on these rigs); tilt is how far that axis has swung from the group's up since rest
  const GROUP_UP = new THREE.Vector3(0, 1, 0);
  const hipsRestUp = bones.Hips ? GROUP_UP.clone().applyQuaternion(group.getWorldQuaternion(_mq).invert().multiply(bones.Hips.getWorldQuaternion(_pq)).invert()) : null;
  const limitLocal = (name, max) => {
    const bone = bones[name], rest = restLocal[name];
    if (!bone || !rest || max == null) return;
    const ang = 2 * Math.acos(Math.min(1, Math.abs(_bq.copy(rest).invert().multiply(bone.quaternion).w)));
    if (ang > max) bone.quaternion.slerp(rest, 1 - max / ang);
  };
  const limitHipsTilt = (max) => {
    const hips = bones.Hips;
    if (!hips || !hipsRestUp || max == null) return;
    const groupInv = group.getWorldQuaternion(_mq).invert();
    const local = _bq.copy(groupInv).multiply(hips.getWorldQuaternion(_pq));   // hips in group space
    const up = _up.copy(hipsRestUp).applyQuaternion(local);                      // where the character's up axis went
    const ang = Math.acos(clamp(up.y, -1, 1));
    if (ang <= max) return;
    // swing the up axis back toward upright by the excess (shortest arc), then rebuild the local pose
    const fix = _sq.copy(_identity).slerp(_fq.setFromUnitVectors(up, GROUP_UP), 1 - max / ang);
    const newWorld = _mq.invert().multiply(fix.multiply(local));
    hips.quaternion.copy(hips.parent.getWorldQuaternion(_pq).invert().multiply(newWorld));
    hips.updateWorldMatrix(false, true);
  };
  const posture = (s) => {
    const p = POSTURE[s.pose] || POSTURE.stand;
    const k = s.oneShot ? 1.6 : 1;
    limitHipsTilt(p.hips * k);
    for (const name of ["Spine", "Spine1", "Spine2"]) limitLocal(name, p.spine * k);
    for (const name of ["neck", "Neck"]) limitLocal(name, p.neck * k);
    if (!s.oneShot && p.upLeg != null) {
      for (const name of ["LeftUpLeg", "RightUpLeg"]) limitLocal(name, p.upLeg);
      for (const name of ["LeftLeg", "RightLeg"]) limitLocal(name, p.leg);
    }
    model.updateMatrixWorld(true);
  };
  const api = {
    group,
    head,
    bones,
    state,
    actions,
    mixer,
    restLocal,
    posture: { limits: POSTURE, restUp: hipsRestUp },
    setPose(pose) {
      state.pose = pose;
      model.rotation.x = pose === "float" ? -0.16 : pose === "peek" ? -0.08 : 0;
      const base = { float: "hang", sleep: "doze", run: "run", swim: "swim" }[pose] || "idle";
      playBase(actions[base] ? base : "idle");
    },
    blink() { state.blink = 0.001; },
    wave() { if (!playOnce("wave")) state.wave = 1.6; },
    look() { if (!playOnce("look")) state.blink = 0.001; },
    jump() { playOnce("jump"); },
    /** play any one-shot clip the hero has (falls back to a wave) */
    play(name) { if (!playOnce(name)) state.wave = 1.2; },
    has(name) { return !!actions[name]; },
    lookAt(p) { state.look.copy(p); },
    /** hold a world point with one paw ("left" = the paw on the viewer's right when he faces us) */
    hold(worldPoint, side = "left") { state.hold = (state.hold || new THREE.Vector3()).copy(worldPoint); state.holdSide = side; },
    paw() { const hand = state.holdSide === "right" ? bones.RightHand : bones.LeftHand; return hand ? hand.getWorldPosition(new THREE.Vector3()) : group.getWorldPosition(new THREE.Vector3()); },
    update(dt, t) {
      const s = state;
      if (idle && s.base === idle && !s.oneShot) idle.setEffectiveWeight(s.pose === "sleep" ? 0.12 : s.pose === "float" ? 0.6 : 1);
      mixer.update(dt);
      model.updateMatrixWorld(true);
      posture(s);
      // HEAD RULE: every frame the head is rebuilt from the neck's current pose (its rest offset)
      // plus a small, clamped look toward the reader. It is never derived from its own previous
      // orientation, so it cannot drift, accumulate or twist; targets behind him are ignored.
      if (head && neck) {
        const neckWorld = neck.getWorldQuaternion(_q[0]);
        const headBase = _q[1].copy(neckWorld).multiply(headFromNeck);
        const bodyDelta = _q[2].copy(headBase).multiply(headRestWorldInv);
        const forward = _v[0].set(0, 0, 1).applyQuaternion(bodyDelta);
        const up = _v[1].set(0, 1, 0).applyQuaternion(bodyDelta);
        const right = _v[2].set(1, 0, 0).applyQuaternion(bodyDelta);
        let yawT = 0, pitchT = 0;
        if (s.pose !== "sleep") {
          const to = _v[3].subVectors(s.look, head.getWorldPosition(_v[4]));
          const lx = right.dot(to), ly = up.dot(to), lz = forward.dot(to);
          const yaw = Math.atan2(lx, lz);
          const pitch = Math.atan2(ly, Math.hypot(lx, lz));
          // the reader looks down at the page, so the head follows the hand sideways and upward but
          // only a touch downward: a face pitched down is a face hidden from above
          if (Math.abs(yaw) < 1.25) { yawT = clamp(yaw, -0.55, 0.55); pitchT = clamp(pitch, -0.1, 0.3); }
        }
        s.yaw += (yawT - s.yaw) * Math.min(1, dt * 4.5);
        s.pitch += (pitchT - s.pitch) * Math.min(1, dt * 4.5);
        const look = _q[3].setFromAxisAngle(up, s.yaw).multiply(_q[4].setFromAxisAngle(right, -s.pitch));
        let desired = look.multiply(headBase);
        if (s.oneShot) {
          // a one-shot clip may move the head, but never further than a friendly angle from the body
          const clipWorld = head.getWorldQuaternion(_q[0]);
          const delta = _q[2].copy(clipWorld).multiply(_q[3].copy(headBase).invert());
          const ang = 2 * Math.acos(Math.min(1, Math.abs(delta.w)));
          if (ang > 0.6) delta.slerp(_identity, 1 - 0.6 / ang);
          desired = delta.multiply(headBase);
        }
        const parentQ = head.parent.getWorldQuaternion(_q[4]);
        head.quaternion.copy(parentQ.invert().multiply(desired));
        head.updateWorldMatrix(false, true);
      }
      // blink: the model has no lids, so give a quick friendly head squash
      s.nextBlink -= dt;
      if (s.nextBlink < 0) { api.blink(); s.nextBlink = 2.5 + Math.random() * 4; }
      if (s.blink > 0 && head) {
        s.blink += dt;
        const p = s.blink / 0.3;
        const k = p < 1 ? Math.sin(p * Math.PI) : 0;
        if (p >= 1) s.blink = 0;
        head.scale.set(1 + k * 0.06, 1 - k * 0.1, 1 + k * 0.06);
      }
      // hold the balloon string with one paw, out to the side so the arm never crosses the face
      const holdLeft = s.holdSide !== "right";
      const holdArm = holdLeft ? bones.LeftArm : bones.RightArm, holdFore = holdLeft ? bones.LeftForeArm : bones.RightForeArm, holdHand = holdLeft ? bones.LeftHand : bones.RightHand;
      const freeArm = holdLeft ? bones.RightArm : bones.LeftArm, freeHand = holdLeft ? bones.RightHand : bones.LeftHand;
      const freeSign = holdLeft ? -1 : 1;
      if (s.hold && holdArm && holdHand && s.pose !== "sleep") {
        // never behind the body: a held point past the shoulder plane (a kite on the wind behind
        // her) is brought forward, so the arm reaches out to the side instead of into the back
        const shoulder = holdArm.getWorldPosition(_v[5]);
        const fwd = _v[6].set(0, 0, 1).transformDirection(group.matrixWorld).normalize();
        const depth = fwd.dot(_v[7].subVectors(s.hold, shoulder));
        const target = depth < 0.05 ? _v[8].copy(s.hold).addScaledVector(fwd, 0.05 - depth) : s.hold;
        aimBone(holdArm, holdHand, target, 1);
        if (holdFore) aimBone(holdFore, holdHand, target, 0.6);
      }
      // the free paw hangs relaxed beside him while floating (the hang clip would raise it to the
      // rope); the upper arm and forearm are both aimed so the paw is not left twisted
      const freeFore = holdLeft ? bones.RightForeArm : bones.LeftForeArm;
      if (s.hold && s.pose === "float" && !s.oneShot && s.wave <= 0 && freeArm && freeHand) {
        const shoulder = freeArm.getWorldPosition(_v[0]);
        const target = _v[1].set(freeSign * 0.16, -0.34, 0.12).transformDirection(group.matrixWorld).multiplyScalar(group.scale.x).add(shoulder);
        aimBone(freeArm, freeHand, target, 1);
        if (freeFore) aimBone(freeFore, freeHand, target, 0.7);
      }
      // procedural wave with the free paw (used when there is no wave clip)
      if (s.wave > 0 && freeArm && freeHand) {
        s.wave -= dt;
        const shoulder = freeArm.getWorldPosition(_v[0]);
        const target = _v[1].set(freeSign * 0.28, 0.3 + Math.sin(s.wave * 16) * 0.12, 0.12).transformDirection(group.matrixWorld).multiplyScalar(group.scale.x).add(shoulder);
        aimBone(freeArm, freeHand, target, 1);
      }
      // dangling legs while floating (softer when the hang clip already swings them)
      if (s.pose === "float" && bones.LeftUpLeg && bones.RightUpLeg && bones.LeftFoot && bones.RightFoot) {
        const swing = Math.sin(t * 1.6 + s.seed) * 0.12;
        const strength = actions.hang ? 0.25 : 0.55;
        for (const [leg, foot, sign] of [[bones.LeftUpLeg, bones.LeftFoot, 1], [bones.RightUpLeg, bones.RightFoot, -1]]) {
          const hip = leg.getWorldPosition(_v[0]);
          const target = _v[1].set(sign * 0.05, -0.28, 0.16 + swing * sign).transformDirection(group.matrixWorld).multiplyScalar(group.scale.x).add(hip);
          aimBone(leg, foot, target, strength);
        }
      }
    },
  };
  group.userData.otto = api;
  return api;
}

