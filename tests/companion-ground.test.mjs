// Numerical/data/Canvas-command tests. Real Canvas pixels: companion-ground-preview.html.
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import * as T from '../vendor/three/build/three.module.js';
import {COMPANION_MANIFESTS} from '../companion-asset-manifests.js';
import {COMPANION_GROUND_SCENES as scenes, COMPANION_GROUND_LAYOUT as layout,
  getCompanionGroundSpec, buildCompanionGround, paintCompanionGround} from '../companion-ground.js';

const expected = {
  nia: ['kite-door','kite-meadow','kite-letgo','kite-river','kite-hill','kite-cloud','kite-oak','kite-festival','kite-choice','kite-home'],
  fin: ['sea-reef','sea-dive','sea-kelp','sea-crab','sea-deep','sea-ship','sea-whale','sea-plankton','sea-light','sea-home'],
};
const adapter = readFileSync(new URL('../reference-companion-scenes.js', import.meta.url), 'utf8');
const calls = [];
const ctx = {save(){},restore(){},clearRect(){},fillRect(){},
  createLinearGradient(){return {addColorStop(){}};},
  createRadialGradient(){return {addColorStop(){}};},
  drawImage(...args){calls.push(args);},
};
globalThis.document = {createElement: () => ({getContext: () => ctx})};
for (const [theme, ids] of Object.entries(expected)) {
  assert.deepEqual(Object.keys(scenes[theme]), ids);
  for (const scene of ids) {
    const config = getCompanionGroundSpec(theme, scene);
    assert(Object.isFrozen(config));
    const asset = COMPANION_MANIFESTS[theme].art[config.art];
    assert(asset && !asset.cutout, `${scene}: only non-character background ground is allowed`);
    assert(existsSync(new URL('../' + asset.url, import.meta.url)));
    assert(adapter.includes(`'${config.art}'`), `${scene}: source must already be loaded`);
    const [x, y, w, h] = config.crop;
    assert(x >= 0 && y >= .8 && w > 0 && h > 0 && h <= .2 && x + w <= 1 && y + h <= 1);
    assert(config.opacity > .5 && config.opacity <= .75);
    const source = {width: 1600, height: 1195};
    const texture = new T.Texture(source);
    let sourceDisposals = 0; texture.addEventListener('dispose', () => sourceDisposals++);
    const images = new Map([[config.art, {texture, width: 1600, height: 1195}]]);
    for (const scale of [1, 2.5, 7.5]) {
      const ground = buildCompanionGround({theme, scene, images, scale});
      assert(ground.isGroup && ground.userData.companionGround);
      assert.equal(ground.scale.x, 1, 'world scale is applied by the parent only');
      ground.updateMatrixWorld(true);
      const bounds = new T.Box3().setFromObject(ground);
      assert(Math.abs(bounds.min.x + .47) < 1e-6 && Math.abs(bounds.max.x - .47) < 1e-6);
      assert(Math.abs(bounds.min.z + .65) < 1e-6 && Math.abs(bounds.max.z - .63) < 1e-6);
      assert(Math.abs(bounds.min.y - layout.elevation) < 1e-6);
      const mesh = ground.children[0], map = mesh.material.map;
      assert(map.isCanvasTexture && map.userData.companionGroundOwned && !map.userData.shared);
      assert.equal(mesh.material.depthWrite, false);
      assert.equal(mesh.material.depthTest, true);
      assert.equal(mesh.material.toneMapped, false);
      assert.equal(mesh.material.transparent, true);
      assert(mesh.renderOrder < 0);
      const hit = []; mesh.raycast({}, hit); assert.equal(hit.length, 0);
      ground.userData.setProgress(0); assert(!ground.visible); assert.equal(mesh.material.opacity, 0);
      ground.userData.setProgress(.5); assert(ground.visible); assert.equal(mesh.material.opacity, config.opacity / 2);
      ground.userData.setProgress(1); assert.equal(mesh.material.opacity, config.opacity);
      let disposal = 0; map.addEventListener('dispose', () => disposal++);
      ground.userData.dispose(); ground.userData.dispose();
      assert.equal(disposal, 1); assert.equal(sourceDisposals, 0);
    }
    const draw = calls.findLast(args => args[0] === source);
    assert.equal(draw[0], source);
    assert.deepEqual(draw.slice(1, 5), [x * 1600, y * 1195, w * 1600, h * 1195]);
    assert(draw[8] <= layout.textureHeight * .34 + 4, 'original art must not stretch over the entire floor');
  }
}
assert.notDeepEqual(scenes.fin['sea-dive'].colors, scenes.fin['sea-deep'].colors);
assert.notDeepEqual(scenes.fin['sea-deep'].colors, scenes.fin['sea-ship'].colors);
assert.equal(scenes.nia['kite-home'].kind, 'wood');
assert.equal(scenes.nia['kite-door'].kind, 'grass');
assert.throws(() => buildCompanionGround({theme:'fin',scene:'sea-kelp',images:{}}), /Missing/);
assert.throws(() => getCompanionGroundSpec('otto','end'), /Unknown/);
assert.throws(() => buildCompanionGround({scale:0}), /positive/);
assert.equal(typeof paintCompanionGround, 'function');
console.log('PASS: 20 explicit ground mappings, safe crop/assets, Canvas commands, local geometry at 1/2.5/7.5 scales, fold fading, no hit interception and owned texture disposal.');
