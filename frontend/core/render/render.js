import { UI_ELEMENTS } from "../operator.js";
import { R } from "../runtime.js";

window.R = R;
// ─────────────────────────────────────────────────────────────────────────────
// renderFrame
// Responsibility: draw all UI elements onto the p5 graphics layers.
// Reads from R.reactions (via reactionFeedback) for visual overlays.
// ─────────────────────────────────────────────────────────────────────────────

export function renderFrame(p5, { gMain, gOverlay }) {
  // 1️⃣ MAIN SCENE
  gMain.clear();
    //
  gOverlay.clear();
  renderBackground(gMain, p5);
  UI_ELEMENTS.planner?.render(gMain, gOverlay);

  // 2️⃣ BUILD BLUR BUFFER (LOW RES = FAKE BLUR)
  const SCALE = 8;

  if (!R.render.blurLayer) {
    R.render.blurLayer = p5.createGraphics(
      gMain.width / SCALE,
      gMain.height / SCALE
    );
  }

  const blur = R.render.blurLayer;

  blur.clear();

  // 🔥 downscale (this creates blur effect)
  blur.image(
    gMain,
    0, 0,
    blur.width,
    blur.height
  );

  
  UI_ELEMENTS.button?.render(gOverlay);
  UI_ELEMENTS.exportButton?.render(gOverlay);

  UI_ELEMENTS.authModal?.render(gOverlay);
}


function renderBackground(g, p5) {
  const t = R.render.bg.time;

  g.push();
  g.noFill();

  const spacing = 40;

  for (let y = 0; y < g.height; y += spacing) {
    for (let x = 0; x < g.width; x += spacing) {

      const n = p5.noise(x * 0.002, y * 0.002, t);
      const angle = n * Math.PI * 2;

      const len = 10;

      const x2 = x + Math.cos(angle) * len;
      const y2 = y + Math.sin(angle) * len;

      g.stroke(255, 255, 255, 15);
      g.line(x, y, x2, y2);
    }
  }

  g.pop();

  R.render.bg.time += 0.002;
}