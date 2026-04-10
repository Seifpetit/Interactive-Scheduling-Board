import { UI_ELEMENTS } from "../operator.js";
import { R }           from "../runtime.js";

window.R = R;

// ─────────────────────────────────────────────────────────────────────────────
// renderFrame
// ─────────────────────────────────────────────────────────────────────────────

export function renderFrame(p5, { gMain, gOverlay }) {
  gMain.clear();
  gOverlay.clear();

  renderBackground(gMain, p5);

  // ── MAIN SCENE ──
  UI_ELEMENTS.planner?.render(gMain, gOverlay);

  // ── BLUR BUFFER ──
  const SCALE = 8;
  if (!R.render.blurLayer) {
    R.render.blurLayer = p5.createGraphics(
      gMain.width / SCALE,
      gMain.height / SCALE
    );
  }
  R.render.blurLayer.clear();
  R.render.blurLayer.image(gMain, 0, 0, R.render.blurLayer.width, R.render.blurLayer.height);

  // ── OVERLAY PASS ──
  UI_ELEMENTS.button?.render(gOverlay);

  // temporal overlays — after planner, before modals
  const grid = UI_ELEMENTS.planner?.grid;
  UI_ELEMENTS.timeScrubber?.render(gOverlay, grid);
  UI_ELEMENTS.upcomingPulse?.render(gOverlay, grid);

  // modals always on top
  UI_ELEMENTS.authModal?.render(gOverlay);
}


function renderBackground(g, p5) {
  const t = R.render.bg.time;

  g.push();
  g.noFill();

  const spacing = 40;

  for (let y = 0; y < g.height; y += spacing) {
    for (let x = 0; x < g.width; x += spacing) {
      const n     = p5.noise(x * 0.002, y * 0.002, t);
      const angle = n * Math.PI * 2;
      const len   = 10;
      g.stroke(255, 255, 255, 15);
      g.line(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    }
  }

  g.pop();

  R.render.bg.time += 0.002;
}