// UI_Elements/feedback/UpcomingTaskPulse.js
// Render-only feedback module — draws the approaching-task attention signal.
// Finds the single focus placement from R.time.temporalSnapshot and renders
// a breathing glow and scale emphasis around that task block.
// No state. No hit testing. No mutations. One task emphasized at a time.

import { R }                           from "../../core/runtime.js";
import { getPulseScale, getGlowAlpha } from "../../core/time/timeSignals.js";

const HEADER_H   = 36;
const START_HOUR = 8;

const CATEGORY_COLORS = {
  study:   "#4a90d9",
  gym:     "#e2621d",
  errands: "#f5a623",
  work:    "#9b59b6",
  health:  "#27ae60",
  social:  "#e91e8c",
  other:   "#92ba00",
};

// ─────────────────────────────────────────────────────────────────────────────
// UpcomingTaskPulse
// ─────────────────────────────────────────────────────────────────────────────

export class UpcomingTaskPulse {
  constructor() {
    this.visible = true;
  }

  // ─────────────────────────────
  // render
  // Called on gOverlay each frame by render.js after TimeScrubberOverlay.
  // grid = WeekGrid instance — must expose .days array
  // ─────────────────────────────

  render(g, grid) {
    if (!this.visible) return;

    const snapshot = R.time?.temporalSnapshot;
    if (!snapshot) return;

    const { entries, nextUpcomingSlotId } = snapshot;
    if (!nextUpcomingSlotId) return;

    const entry = entries.find(e => e.slotId === nextUpcomingSlotId);
    if (!entry || entry.urgency01 <= 0) return;

    const day = grid?.days?.[entry.dayIndex];
    if (!day) return;

    const slot = _findSlot(day, entry.hour);
    if (!slot) return;

    const t         = performance.now();
    const urgency   = entry.urgency01;
    const scale     = getPulseScale(t, urgency);
    const glowAlpha = getGlowAlpha(t, urgency);
    const color     = CATEGORY_COLORS[entry.task?.category] ?? CATEGORY_COLORS.other;
    const blockH    = _blockHeight(day, entry.hour, entry.task?.duration ?? 1);

    g.push();

    // ── OUTER GLOW RING — soft, color-matched, breathing ──
    const glowA = Math.round(glowAlpha * 255).toString(16).padStart(2, "0");
    g.noFill();
    g.stroke(`${color}${glowA}`);
    g.strokeWeight(8);
    g.rect(
      slot.x - 2,
      slot.y - 2,
      slot.w + 4,
      blockH + 4,
      10
    );

    // ── INNER CRISP BORDER ──
    const innerA = Math.round(Math.min(glowAlpha * 1.6, 1) * 255).toString(16).padStart(2, "0");
    g.stroke(`${color}${innerA}`);
    g.strokeWeight(1.5);
    g.noFill();
    g.rect(slot.x, slot.y, slot.w, blockH, 6);

    // ── SCALE PULSE — draw a fill overlay that grows/shrinks ──
    // Center the scale transform on the block
    const cx = slot.x + slot.w / 2;
    const cy = slot.y + blockH / 2;
    const sw = slot.w * scale;
    const sh = blockH * scale;

    const scaleOverlayA = Math.round(glowAlpha * 0.12 * 255).toString(16).padStart(2, "0");
    g.noStroke();
    g.fill(`${color}${scaleOverlayA}`);
    g.rect(cx - sw / 2, cy - sh / 2, sw, sh, 8);

    // ── SOON CHIP — appears in final ~13 min (urgency >= 0.85) ──
    if (urgency >= 0.85) {
      _renderSoonChip(g, slot, blockH, color, urgency);
    }

    g.pop();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// _renderSoonChip
// Small pill label in top-right corner of the block.
// ─────────────────────────────────────────────────────────────────────────────

function _renderSoonChip(g, slot, blockH, color, urgency) {
  const chipW = 36;
  const chipH = 16;
  const chipX = slot.x + slot.w - chipW - 4;
  const chipY = slot.y + 4;
  const alpha = Math.round(((urgency - 0.85) / 0.15) * 255).toString(16).padStart(2, "0");

  g.push();
  g.noStroke();
  g.fill(`${color}${alpha}`);
  g.rect(chipX, chipY, chipW, chipH, 4);

  g.fill(`#ffffff${alpha}`);
  g.textSize(9);
  g.textAlign(g.CENTER, g.CENTER);
  const font = R.assets?.fonts?.["Bold"];
  if (font) g.textFont(font);
  g.text("SOON", chipX + chipW / 2, chipY + chipH / 2);
  g.pop();
}

// ─────────────────────────────────────────────────────────────────────────────
// _findSlot
// Finds the slot object for a given hour in a day's slots array.
// ─────────────────────────────────────────────────────────────────────────────

function _findSlot(day, hour) {
  const index = hour - START_HOUR;
  return day.slots?.[index] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// _blockHeight
// Accumulates real pixel heights across duration slots — same logic as HourSlot.
// ─────────────────────────────────────────────────────────────────────────────

function _blockHeight(day, startHour, duration) {
  let totalH = 0;
  const startIndex = startHour - START_HOUR;
  for (let i = 0; i < duration; i++) {
    const s = day.slots?.[startIndex + i];
    if (s) totalH += s.h + 1;
  }
  return Math.max(totalH - 1, 0);
}