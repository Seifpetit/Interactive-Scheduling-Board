import { UI_ELEMENTS } from "./operator.js";

// ─────────────────────────────────────────────────────────────────────────────
// renderFrame
// Responsibility: draw all UI elements onto the p5 graphics layers.
// Reads from R.reactions (via reactionFeedback) for visual overlays.
// ─────────────────────────────────────────────────────────────────────────────

export function renderFrame(p5, { gMain, gOverlay }) {

  gOverlay.clear();

  UI_ELEMENTS.planner?.render(gMain, gOverlay);
  UI_ELEMENTS.button?.render(gOverlay);
  UI_ELEMENTS.exportButton?.render(gOverlay);

}
