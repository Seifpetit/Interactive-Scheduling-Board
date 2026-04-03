import { R }                        from "./runtime.js";
import { loadState }                from "./loadState.js";
import { initUI, beginTransition }  from "./operator.js";

// ─────────────────────────────────────────────────────────────────────────────
// initState  — called once from p5.setup (fire-and-forget async)
// All phase management goes through beginTransition — never set
// R.transition.phase directly.
// ─────────────────────────────────────────────────────────────────────────────

export async function initState() {
  const token = R.auth?.token || localStorage.getItem("planner_token");

  if (!token) {
    R.openModal?.("auth", { mode: "login" });
    initUI(); 
    R.transition.phase = "READY";
    return;
  }

  await beginTransition("BOOTING", async (setProgress) => {
    setProgress(0.2);

    const appState = await loadState(setProgress);
    if (!appState) return;

    R.appState = appState;

    R.appState.config ??= {};
    R.appState.config.slotCounts ??= {};
    R.appState.draft ??= {};
    R.appState.draft.assignments ??= {};
    R.appState.slotLocks ??= {};
    R.appState.shiftLocks ??= {};
    R.appState.restrictions ??= {};
    R.appState.shiftRequirements ??= {};

    setProgress(0.8);
    initUI();
    setProgress(1.0);
  });
}
