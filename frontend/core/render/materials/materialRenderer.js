import { renderSolid } from "./solidMaterial.js";
import { renderFocus } from "./renderFocus.js";
import { renderFrost } from "./renderFrost.js";
import { R } from "../../../core/runtime.js";

export function renderMaterial(g, node) {
  const t = node.materialProgress ?? 0;

  if (t <= 0.01) {
    return renderSolid(g, node);
  }

  // blend frost instead of glass
  renderFrost(g, node, t);

  // add focus on top
  renderFocus(g, node, t * 0.7);
}