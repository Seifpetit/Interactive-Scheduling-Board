// UI_Elements/overlay/TimeScrubberOverlay.js
// Render-only overlay — draws the live time scrubber on today's column.
// Receives grid geometry and reads R.time.temporalSnapshot.
// No state. No hit testing. No mutations. Pure visual layer.

import { R }               from "../../core/runtime.js";
import { getScrubberGlow } from "../../core/time/timeSignals.js";

const HEADER_H = 36; // must match DayColumn.layout() header height

// ─────────────────────────────────────────────────────────────────────────────
// TimeScrubberOverlay
// ─────────────────────────────────────────────────────────────────────────────

export class TimeScrubberOverlay {
  constructor() {
    this.visible = true;
  }

  // ─────────────────────────────
  // render
  // Called on gOverlay each frame by render.js.
  // grid = WeekGrid instance — must expose .days array where each day has x, y, w, h
  // ─────────────────────────────

  render(g, grid) {
    if (!this.visible) return;

    const snapshot = R.time?.temporalSnapshot;
    if (!snapshot) return;

    const { todayIndex, scrubberY01, now } = snapshot;
    const day = grid?.days?.[todayIndex];
    if (!day) return;

    // content area — below column header
    const contentY = day.y + HEADER_H;
    const contentH = day.h - HEADER_H;
    const scrubY   = contentY + scrubberY01 * contentH;

    const t     = performance.now();
    const glow  = getScrubberGlow(t);          // 0.6→1.0
    const a255  = Math.round(glow * 255);
    const aHex  = a255.toString(16).padStart(2, "0");
    const aHex2 = Math.round(glow * 40).toString(16).padStart(2, "0");

    g.push();

    // ── GLOW BAND — soft ambient light around the line ──
    g.noStroke();
    g.fill(`#4a90d9${aHex2}`);
    g.rect(day.x + 2, scrubY - 10, day.w - 4, 20, 4);

    // ── SCRUBBER LINE ──
    g.stroke(`#4a90d9${aHex}`);
    g.strokeWeight(1.5);
    g.line(day.x + 4, scrubY, day.x + day.w - 4, scrubY);

    // ── NOW DOT — left anchor point ──
    g.noStroke();
    g.fill(`#4a90d9${aHex}`);
    g.circle(day.x + 4, scrubY, 7);

    // ── TIME LABEL — right of dot ──
    g.fill(`#4a90d9${aHex}`);
    g.textSize(10);
    g.textAlign(g.LEFT, g.CENTER);
    const font = R.assets?.fonts?.["Bold"];
    if (font) g.textFont(font);
    g.text(_formatTime(now), day.x + 10, scrubY - 6);

    g.pop();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// _formatTime — "14:35"
// ─────────────────────────────────────────────────────────────────────────────

function _formatTime(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}