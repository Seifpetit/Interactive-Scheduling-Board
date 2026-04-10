import { R }                      from "./runtime.js";
import { getDragVerdict }         from "./validator.js";
import { captureInput }           from "./captureInput.js";
import { resolveHit }             from "./resolveHit.js";
import { routeInput }             from "./routeInput.js";
import { renderFrame }            from "./render/render.js";
import { reactionFeedback }       from "./reactionFeedback.js";
import { Planner }                from "../UI_Elements/layout/Planner.js";
import { AuthModal }              from "../UI_Elements/overlays/auth/authModal.js";
import { ExportButton }           from "../UI_Elements/cards/ExportButton.js";
import { commands }               from "./commands.js";
import { buildTemporalSnapshot }  from "./time/temporalModel.js";
import { TimeScrubberOverlay }    from "../UI_Elements/overlays/TimeScrubberOverlay.js";
import { UpcomingTaskPulse }      from "../UI_Elements/feedback/UpcomingTaskPulse.js";
import { saveSessionSeenNow }     from "./time/sessionDelta.js";

// ─────────────────────────────────────────────────────────────────────────────
// UI_ELEMENTS  — registry used by resolveHit, routeInput, renderFrame
// ─────────────────────────────────────────────────────────────────────────────
export const UI_ELEMENTS = {
  planner:          null,
  button:           null,
  exportButton:     null,
  authModal:        null,
  timeScrubber:     null,
  upcomingPulse:    null,
};
window.UI_ELEMENTS = UI_ELEMENTS;

// ─────────────────────────────────────────────────────────────────────────────
// initUI  — called once from boot after appState is ready
// ─────────────────────────────────────────────────────────────────────────────
export function initUI() {
  console.log("INIT UI RUNNING");
  UI_ELEMENTS.authModal     = new AuthModal();
  UI_ELEMENTS.planner       = new Planner(R.appState, commands);
  UI_ELEMENTS.button        = null;
  UI_ELEMENTS.exportButton  = new ExportButton();
  UI_ELEMENTS.timeScrubber  = new TimeScrubberOverlay();
  UI_ELEMENTS.upcomingPulse = new UpcomingTaskPulse();

  _initGeometry();

  // stamp session on page hide so sessionDelta can compute timeAway on next boot
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveSessionSeenNow();
  });
}

function _initGeometry() {
  const W = window.innerWidth;
  const H = window.innerHeight;

  R.geometry.window  = { w: W, h: H };
  R.geometry.planner = { x: 50, y: 50, w: W - 100, h: H - 100 };

  UI_ELEMENTS.planner?.setGeometry(50, 50, W - 100, H - 100);
  UI_ELEMENTS.button?.setGeometry(W / 2 - 70, 10, 140, 25);
}

// ─────────────────────────────────────────────────────────────────────────────
// beginTransition
// ─────────────────────────────────────────────────────────────────────────────
export async function beginTransition(phase, asyncFn, message = "") {
  const t    = R.transition;
  t.phase    = phase;
  t.message  = message;
  t.progress = 0;
  t.error    = "";

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
  if (UI_ELEMENTS.planner) _initGeometry();
  R.transition.phase     = "READY";
  R.transition.fadeAlpha = 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// updateFrame  — called every draw tick by main.js
//
//  temporal update → captureInput → resolveHit → update → routeInput → reactionFeedback
// ─────────────────────────────────────────────────────────────────────────────
export function updateFrame(p5) {

  if (R.transition.fadeAlpha > 0) {
    R.transition.fadeAlpha = Math.max(0, R.transition.fadeAlpha - 0.035);
  }

  if (R.transition.phase !== "READY") return;

  // ── TEMPORAL UPDATE — before input so render consumers always have fresh snapshot ──
  R.time.now             = new Date();
  R.time.temporalSnapshot = buildTemporalSnapshot(R);

  captureInput(p5);
  resolveHit();

  UI_ELEMENTS.planner?.update(p5, R.input.mouse);
  UI_ELEMENTS.button?.update(p5, R.input.mouse);
  UI_ELEMENTS.exportButton?.update(p5, R.input.mouse);

  routeInput();
  reactionFeedback();

  R.interaction.drag.verdict = R.interaction.drag.active
    ? getDragVerdict()
    : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// renderFrame  — re-exported for main.js
// ─────────────────────────────────────────────────────────────────────────────
export { renderFrame };