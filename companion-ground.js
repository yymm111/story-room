// Local, companion-only visual enhancement for the previously blank right page.
// This painted floor is not a claim about the public reference site's layout.
import * as T from './vendor/three/build/three.module.js';

const spec = (kind, art, crop, colors, opacity = .68, detail = .42) => Object.freeze({
  kind, art, crop: Object.freeze(crop), colors: Object.freeze(colors), opacity, detail,
});

// Crops are normalized [left, top, width, height], inspected in the actual artwork.
// Only safe lower ground/water bands are sampled, never a whole upright illustration.
// Meadow grass replaces the cottage/fence/cloud backdrops here on purpose: no house,
// fence, kite, cloud face, fish or character is duplicated onto the paper floor.
export const COMPANION_GROUND_SCENES = Object.freeze({
  nia: Object.freeze({
    'kite-door': spec('grass', 'meadow-sky', [.08, .87, .84, .12], ['#83a760', '#b8c985', '#d5dca8']),
    'kite-meadow': spec('grass', 'meadow-sky', [.08, .83, .84, .16], ['#79a95e', '#acc97f', '#d3dda2']),
    'kite-letgo': spec('grass', 'meadow-sky', [.12, .88, .76, .11], ['#87a963', '#bdcc8b', '#d9dfad']),
    'kite-river': spec('riverbank', 'river', [.38, .89, .31, .10], ['#6daba2', '#abd0b8', '#d4dfb4'], .66, .36),
    'kite-hill': spec('grass', 'hill', [.10, .86, .45, .13], ['#83a563', '#b8ca82', '#d4dc9d']),
    'kite-cloud': spec('grass', 'meadow-sky', [.18, .87, .64, .12], ['#8fb28d', '#c2d6a7', '#dfe4bf'], .60, .32),
    'kite-oak': spec('woodland', 'oak-wood', [.35, .86, .59, .13], ['#75935c', '#aabd78', '#d0d5a0'], .68, .46),
    'kite-festival': spec('grass', 'festival-sky', [.12, .91, .76, .08], ['#8da267', '#c1ca8c', '#deddac']),
    'kite-choice': spec('grass', 'festival-sky', [.16, .91, .68, .08], ['#9b9f6b', '#ccca91', '#e4dbb1']),
    // The very bottom is plain wood grain below the skirting's top edge.
    'kite-home': spec('wood', 'home-wall', [.32, .983, .36, .012], ['#bd9d76', '#d4bc96', '#e5d5b9'], .65, .24),
  }),
  fin: Object.freeze({
    'sea-reef': spec('reef-sand', 'reef-dark', [.35, .90, .30, .09], ['#537d80', '#8fac9d', '#c9d2b2'], .72, .42),
    // Shallows has no seabed; use a sand-only crop, washed with shallow-water blue.
    'sea-dive': spec('shallow-water', 'kelp-forest', [.31, .93, .38, .06], ['#4a9caa', '#a1d1cf', '#cce0d0'], .67, .26),
    'sea-kelp': spec('kelp-sand', 'kelp-forest', [.25, .89, .50, .10], ['#598f7a', '#a8b98c', '#d0d9b4'], .72, .48),
    'sea-crab': spec('rock-sand', 'crab-rocks', [.34, .89, .33, .10], ['#779f9c', '#bfc5a1', '#ded9b8'], .68, .43),
    'sea-deep': spec('deep-water', 'deep-dark', [.24, .91, .52, .08], ['#34536e', '#6f9da9', '#afcbd0'], .70, .36),
    // Central bottom sand excludes the ship hull, wreckage and side vegetation.
    'sea-ship': spec('ship-sand', 'ship-sand', [.31, .94, .36, .05], ['#829d97', '#c3bf94', '#dfd9b4'], .72, .50),
    'sea-whale': spec('open-water', 'deep-dark', [.26, .91, .48, .08], ['#397e99', '#88b8c4', '#bed8d9'], .65, .26),
    'sea-plankton': spec('glowing-sand', 'plankton', [.23, .945, .54, .045], ['#477f8a', '#91bdb0', '#c2d9bc'], .68, .37),
    'sea-light': spec('bright-reef-sand', 'reef-bright', [.43, .91, .17, .08], ['#79aca2', '#c3d2a4', '#e0dfb5'], .68, .41),
    'sea-home': spec('bright-reef-sand', 'reef-bright', [.43, .91, .17, .08], ['#7eaca3', '#c2d0ac', '#dfdfbe'], .64, .37),
  }),
});

// Same local coordinates as Diorama: x across the page, +z towards the reader.
// Parent diorama applies the world scale (normally 7.5) exactly once.
export const COMPANION_GROUND_LAYOUT = Object.freeze({
  width: .94, depth: 1.28, x: 0, z: -.01, elevation: .0012,
  textureWidth: 640, textureHeight: 864,
});

export function getCompanionGroundSpec(theme, scene) {
  const value = COMPANION_GROUND_SCENES[theme]?.[scene];
  if (!value) throw new Error(`Unknown companion ground: ${theme}/${scene}`);
  return value;
}

function newCanvas(width, height) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas')
    : typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : null;
  if (!canvas) throw new Error('Companion ground requires Canvas 2D');
  canvas.width = width; canvas.height = height;
  return canvas;
}

function sourceFor(images, id) {
  const record = images instanceof Map ? images.get(id) : images?.[id];
  return record?.texture?.image || record?.image || record;
}

function gradient(ctx, x0, y0, x1, y1, stops) {
  const value = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, color] of stops) value.addColorStop(at, color);
  return value;
}

/** Exported to generate a true Canvas 2D preview without creating a WebGL renderer. */
export function paintCompanionGround(ctx, width, height, config, source) {
  const {colors, crop, detail} = config;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.fillStyle = gradient(ctx, 0, 0, 0, height, [[0, colors[0]], [.53, colors[1]], [1, colors[2]]]);
  ctx.fillRect(0, 0, width, height);

  if (source) {
    const sw = source.naturalWidth || source.width, sh = source.naturalHeight || source.height;
    if (!(sw > 0 && sh > 0)) throw new Error(`Ground source has invalid dimensions: ${config.art}`);
    // Keep the ground's proportions near the source, then fade into a full-page
    // color wash. Stretching a 10%-high crop over the entire page makes pebbles
    // and grass into distracting long stripes, so the art stays near the back.
    const nativeHeight = width * crop[3] * sh / (crop[2] * sw);
    const bandHeight = Math.max(24, Math.min(height * .34, nativeHeight * 1.7));
    const band = newCanvas(width, Math.ceil(bandHeight));
    const brush = band.getContext('2d');
    brush.imageSmoothingEnabled = true; brush.imageSmoothingQuality = 'high';
    brush.filter = 'blur(1.25px)';
    brush.drawImage(source, crop[0] * sw, crop[1] * sh, crop[2] * sw, crop[3] * sh,
      -2, -2, width + 4, bandHeight + 4);
    brush.filter = 'none';
    brush.globalCompositeOperation = 'destination-in';
    brush.fillStyle = gradient(brush, 0, 0, 0, bandHeight,
      [[0, '#000000ff'], [.15, '#000000ee'], [.65, '#00000066'], [1, '#00000000']]);
    brush.fillRect(0, 0, width, bandHeight);
    ctx.globalAlpha = detail;
    ctx.drawImage(band, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient(ctx, 0, 0, 0, height,
      [[0, `${colors[0]}12`], [.48, `${colors[1]}33`], [1, `${colors[2]}99`]]);
    ctx.fillRect(0, 0, width, height);
  }

  // Sparse translucent washes soften large flat spans without procedural props.
  // These deterministic stains are texture, not glowing particles or scene objects.
  for (let i = 0; i < 13; i++) {
    const x = ((i * .381966 + .17) % 1) * width;
    const y = ((i * .618034 + .11) % 1) * height;
    const radius = width * (.09 + (i % 4) * .025);
    const wash = ctx.createRadialGradient(x, y, 0, x, y, radius);
    wash.addColorStop(0, i % 2 ? '#fff9dd12' : `${colors[0]}0b`);
    wash.addColorStop(1, '#ffffff00');
    ctx.fillStyle = wash; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Rounded, feathered paper margin. The back blends below the upright card;
  // the foreground remains painted rather than disappearing halfway down the page.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = gradient(ctx, 0, 0, width, 0, [
    [0, '#00000000'], [.045, '#000000d9'], [.10, '#000000ff'],
    [.90, '#000000ff'], [.955, '#000000d9'], [1, '#00000000'],
  ]);
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = gradient(ctx, 0, 0, 0, height, [
    [0, '#00000000'], [.035, '#000000d9'], [.09, '#000000ff'],
    [.72, '#000000f2'], [.92, '#000000b8'], [1, '#00000000'],
  ]);
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function createCompanionGroundCanvas({theme, scene, images, canvasFactory = newCanvas} = {}) {
  const config = getCompanionGroundSpec(theme, scene);
  const {textureWidth: width, textureHeight: height} = COMPANION_GROUND_LAYOUT;
  const canvas = canvasFactory(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Companion ground requires Canvas 2D');
  const source = sourceFor(images, config.art);
  if (!source) throw new Error(`Missing companion ground artwork: ${theme}/${config.art}`);
  paintCompanionGround(ctx, width, height, config, source);
  return canvas;
}

/**
 * Add the returned group to diorama.group, which already receives the world scale.
 * No model, shared source texture or parent state is mutated. Group is not pickable.
 * Call userData.setProgress(p) with page-opening progress. Host disposeGroup can own
 * geometry/material/map cleanup, or call userData.dispose() for standalone usage.
 * Keep maps with companionGroundOwned out of the host's blanket shared-map tagging.
 */
export function buildCompanionGround({theme, scene, images, scale = 7.5} = {}) {
  if (!(Number.isFinite(scale) && scale > 0)) throw new Error('Ground scale must be positive');
  const config = getCompanionGroundSpec(theme, scene);
  const canvas = createCompanionGroundCanvas({theme, scene, images});
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.userData.shared = false;
  texture.userData.companionGroundOwned = true;
  const material = new T.MeshBasicMaterial({
    map: texture, transparent: true, opacity: config.opacity, depthWrite: false,
    depthTest: true, toneMapped: false, polygonOffset: true,
    polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const {width, depth, x, z, elevation} = COMPANION_GROUND_LAYOUT;
  const geometry = new T.PlaneGeometry(width, depth).rotateX(-Math.PI / 2);
  const mesh = new T.Mesh(geometry, material);
  mesh.name = `companion-ground-${scene}`;
  mesh.position.set(x, elevation, z);
  // Transparent paper wash is drawn before actors and sprites; normal depth testing
  // prevents the floor from painting over a hero even if their draw order differs.
  mesh.renderOrder = -2;
  mesh.raycast = () => {};
  mesh.castShadow = false; mesh.receiveShadow = false;
  const group = new T.Group();
  group.name = `companion-ground-${theme}-${scene}`;
  group.add(mesh);
  group.userData.companionGround = true;
  mesh.userData.companionGround = true;
  group.userData.sourceArt = config.art;
  group.userData.groundKind = config.kind;
  group.userData.displayScale = scale;
  group.userData.setProgress = progress => {
    const p = T.MathUtils.clamp(Number(progress) || 0, 0, 1);
    material.opacity = config.opacity * p * p * (3 - 2 * p);
    group.visible = p > .001;
  };
  let disposed = false;
  group.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    geometry.dispose(); material.dispose(); texture.dispose();
    group.visible = false;
  };
  return group;
}
