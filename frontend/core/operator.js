import { R }                from "./runtime.js";
import { getDragVerdict }   from "./validator.js";
import { captureInput }     from "./captureInput.js";
import { resolveHit }       from "./resolveHit.js";
import { routeInput }       from "./routeInput.js";
import { renderFrame }      from "./render/render.js";
import { reactionFeedback } from "./reactionFeedback.js";
import { Planner }          from "../UI_Elements/layout/Planner.js";
import { AuthModal }        from "../UI_Elements/overlays/auth/authModal.js";
import { ExportButton }     from "../UI_Elements/cards/ExportButton.js";
// import { TestTransitionButton } from "../UI_Elements/cards/TestTransitionButton.js";  // keep for future dev use
import { commands }         from "./commands.js";

// ─────────────────────────────────────────────────────────────────────────────
// UI_ELEMENTS  — registry used by resolveHit, routeInput, renderFrame
// ─────────────────────────────────────────────────────────────────────────────
export const UI_ELEMENTS = {
  planner:     null,
  button:       null,
  exportButton: null,
  authModal:    null,
};
window.UI_ELEMENTS = UI_ELEMENTS;
// ─────────────────────────────────────────────────────────────────────────────
// initUI  — called once from boot after appState is ready
// ─────────────────────────────────────────────────────────────────────────────
export function initUI() {console.log("INIT UI RUNNING");
  UI_ELEMENTS.authModal  = new AuthModal(); // Initialize authModal before planner to ensure it's available in routeInput
  UI_ELEMENTS.planner     = new Planner(R.appState, commands);
  UI_ELEMENTS.button       = null;//new GenerateButton(commands.generate.bind(commands));
  UI_ELEMENTS.exportButton = new ExportButton();
  _initGeometry();
}

function _initGeometry() {
  const W = window.innerWidth;
  const H = window.innerHeight;

  R.geometry.window   = { w: W, h: H };
  R.geometry.planner = { x: 50, y: 50, w: W - 100, h: H - 100 };

  UI_ELEMENTS.planner?.setGeometry(50, 50, W - 100, H - 100);
  UI_ELEMENTS.button?.setGeometry(W / 2 - 70, 10, 140, 25);
  // testButton positions itself in update() — no setGeometry needed
}

// ─────────────────────────────────────────────────────────────────────────────
// beginTransition
//
// The only way phase changes happen. Call from boot.js for initial load,
// or from routeInput for any mid-session async operation.
//
// asyncFn receives setProgress(0→1) to report work.
// On success → phase becomes "READY" and UI re-layouts.
// On failure → phase becomes "ERROR".
//
// Usage:
//   await beginTransition("BOOTING", async (setProgress) => {
//     setProgress(0.3);
//     const data = await fetch("/state").then(r => r.json());
//     setProgress(1.0);
//   });
//
//   beginTransition("FETCHING", async (sp) => { ... }, "Reloading…");
// ─────────────────────────────────────────────────────────────────────────────
export async function beginTransition(phase, asyncFn, message = "") {
  const t       = R.transition;
  t.phase       = phase;
  t.message     = message;
  t.progress    = 0;
  t.error       = "";

  try {
    await asyncFn((p) => { t.progress = Math.min(1, Math.max(0, p)); });
    _completeTransition();
  } catch (err) {
    console.error("Transition failed:", err);
    t.phase = "ERROR";
    t.error = String(err);
  }
}

function _completeTransition() {
  // Re-layout everything with current window size
  if (UI_ELEMENTS.planner) _initGeometry();

  R.transition.phase     = "READY";
  R.transition.fadeAlpha = 1;   // draw loop ticks this to 0
}

// ─────────────────────────────────────────────────────────────────────────────
// updateFrame  — called every draw tick by main.js
//
//  captureInput → resolveHit → update → routeInput → reactionFeedback
// ─────────────────────────────────────────────────────────────────────────────
export function updateFrame(p5) {

  // Tick fade alpha down after any transition completes
  if (R.transition.fadeAlpha > 0) {
    R.transition.fadeAlpha = Math.max(0, R.transition.fadeAlpha - 0.035);
  }

  // Pipeline only runs when fully ready
  if (R.transition.phase !== "READY") return;

  captureInput(p5);
  resolveHit();

  UI_ELEMENTS.planner?.update(p5, R.input.mouse);
  UI_ELEMENTS.button?.update(p5, R.input.mouse);
  UI_ELEMENTS.exportButton?.update(p5, R.input.mouse);

  routeInput();
  reactionFeedback();

  // Verdict computed after nearest slot is resolved — read by SlotRow.render
  R.interaction.drag.verdict = R.interaction.drag.active
    ? getDragVerdict()
    : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// renderFrame  — re-exported for main.js
// ─────────────────────────────────────────────────────────────────────────────
export { renderFrame };
