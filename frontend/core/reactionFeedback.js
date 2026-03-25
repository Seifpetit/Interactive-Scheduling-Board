import { R } from "./runtime.js";

// ─────────────────────────────────────────────────────────────────────────────
// reactionFeedback
// Responsibility: advance time-based visual reactions and write
// display-ready values into R.reactions so render.js can consume them.
//
// Pattern:
//   commands.js writes a reaction trigger  →  R.reactions[id] = { … }
//   reactionFeedback advances it each frame →  updates progress / alpha / scale
//   render reads R.reactions                →  paints the visual
// ─────────────────────────────────────────────────────────────────────────────

export function reactionFeedback() {

  const now = Date.now();

  for (const id in R.reactions) {
    const rx = R.reactions[id];

    const elapsed  = now - rx.startTime;
    const progress = Math.min(elapsed / rx.duration, 1);  // 0 → 1

    rx.progress = progress;

    // Derive per-type display values
    if (rx.type === "flash") {
      rx.alpha = (1 - progress) * 255;          // fade out
    }

    if (rx.type === "scale-bounce") {
      rx.scale = 1 + 0.15 * Math.sin(progress * Math.PI); // bounce up then back
    }

    // Prune finished reactions
    if (progress >= 1) {
      delete R.reactions[id];
    }
  }

}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: fire a reaction from anywhere (e.g. from a command)
// Usage:  triggerReaction("slot_2_lunch_1", "flash", 400)
// ─────────────────────────────────────────────────────────────────────────────
export function triggerReaction(id, type, duration = 300, extra = {}) {
  R.reactions[id] = { type, duration, startTime: Date.now(), progress: 0, ...extra };
}
