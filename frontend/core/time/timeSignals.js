// core/time/timeSignals.js
// Pure math utilities for temporal animation and urgency derivation.
// No imports. No side effects. No R reads.
// All consumers import selectively from this file.

// ─────────────────────────────────────────────────────────────────────────────
// URGENCY
// ─────────────────────────────────────────────────────────────────────────────

// Returns 0.0 (calm, far away) → 1.0 (urgent, starting now or overdue).
// Linear ramp over windowMinutes.
export function getUrgency01(minutesUntilStart, windowMinutes = 90) {
  if (minutesUntilStart <= 0)             return 1;
  if (minutesUntilStart >= windowMinutes) return 0;
  return 1 - (minutesUntilStart / windowMinutes);
}

// ─────────────────────────────────────────────────────────────────────────────
// EASING
// ─────────────────────────────────────────────────────────────────────────────

// Smooth deceleration — fast start, slow end.
export function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

// Symmetric smooth acceleration and deceleration.
export function easeInOutSine(x) {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// PULSE — upcoming task block scale and glow
// t = performance.now() millis, passed in by caller each frame
// urgency01 = 0→1 from getUrgency01
// ─────────────────────────────────────────────────────────────────────────────

// Returns a scale multiplier for the upcoming task block.
// At urgency=0: no change. At urgency=1: 2–5% slow breathing growth.
export function getPulseScale(t, urgency01) {
  const wave  = 0.5 + 0.5 * Math.sin(t * 0.0025);
  const eased = easeOutCubic(urgency01);
  return 1 + eased * (0.04 + wave * 0.06);   // 0–10% growth
}

// Returns 0→1 alpha for the glow ring around the upcoming task.
// Wave is phase-offset from scale so glow and scale breathe independently.
export function getGlowAlpha(t, urgency01) {
  const wave  = 0.5 + 0.5 * Math.sin(t * 0.0025 + 1.0);
  const eased = easeOutCubic(urgency01);
  return 0.15 + eased * (0.45 + wave * 0.4); // floor at 0.15 so always slightly visible
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRUBBER — time line glow
// ─────────────────────────────────────────────────────────────────────────────

// Returns 0.6→1.0 alpha for the scrubber line — slow gentle pulse.
export function getScrubberGlow(t) {
  return 0.6 + 0.4 * Math.sin(t * 0.001);               // ~6s cycle
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARDS
// ─────────────────────────────────────────────────────────────────────────────

// Returns true if a placement is within the urgency attention window.
export function isApproaching(minutesUntilStart, windowMinutes = 90) {
  return minutesUntilStart >= 0 && minutesUntilStart <= windowMinutes;
}