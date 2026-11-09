// Companion-only coordinate adaptation for the shared reference pop-up engine.
// Three.js PointsMaterial.size does not inherit the diorama's object scale.
import {Diorama as ReferenceDiorama} from './reference-diorama.js?v=otto9';

export class Diorama extends ReferenceDiorama {
  burst(color, count, size) {
    const burst = super.burst(color, count, size);
    const scale = this.ctx.displayScale ?? 1;
    burst.points.material.size *= scale;
    burst.points.raycast = () => {};
    return burst;
  }
}
