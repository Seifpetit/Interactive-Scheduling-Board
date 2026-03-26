import { R } from "./runtime.js";

// ─────────────────────────────────────────────────────────────────────────────
// loadState
// Called once at boot by boot.js.
// Fetches /state from FastAPI, populates R.appState with tasks + placements.
// Returns the state object so boot.js can proceed.
// ─────────────────────────────────────────────────────────────────────────────

export async function loadState(setProgress) {
  // initialise with empty defaults so the UI never crashes on null
  R.appState = {
    tasks:      [],
    placements: {},
  };

  setProgress(0.4);
  try {
    const res  = await fetch("/state");
    if (!res.ok) throw new Error(`/state returned ${res.status}`);
    const data = await res.json();

    R.appState.tasks      = data.tasks      ?? [];
    R.appState.placements = data.placements ?? {};

    console.log(`[loadState] loaded ${R.appState.tasks.length} tasks, ${Object.keys(R.appState.placements).length} placements`);
    
   
  } catch (err) {
    console.warn("[loadState] failed to load from backend — starting empty:", err);
    // app still works, just with no data
  }
   setProgress(0.6); 
  return R.appState;
}
