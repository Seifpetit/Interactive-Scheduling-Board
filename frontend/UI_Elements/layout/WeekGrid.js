import { UINode }   from "../base/UINode.js";
import { DayColumn } from "./DayColumn.js";
import { R }         from "../../core/runtime.js";

const START_HOUR    = 8;
const END_HOUR      = 23;
const HOUR_LABEL_W  = 44;

// ─────────────────────────────────────────────────────────────────────────────
// WeekGrid  — 7-day hour grid
// Children: DayColumn × 7
// ─────────────────────────────────────────────────────────────────────────────

export class WeekGrid extends UINode {
  constructor() {
    super();
    this.hitType = null; // grid itself not hittable — slots inside are

    for (let i = 0; i < 7; i++) {
      this.children.push(new DayColumn(i));
    }
  }

  get days() { return this.children; }

  // ─────────────────────────────
  // LAYOUT
  // ─────────────────────────────

  layout() {
    const gridW = this.w - HOUR_LABEL_W;
    const colW  = gridW / 7;

    this.children.forEach((day, i) => {
      day.setGeometry(
        this.x + HOUR_LABEL_W + i * colW,
        this.y,
        colW,
        this.h
      );
    });
  }

  // ─────────────────────────────
  // NEAREST SLOT  — for drop snapping
  // ─────────────────────────────

  findNearestSlot(gx, gy, radius = 60) {
    let nearest = null;
    let minDist = radius;

    for (const day of this.children) {
      for (const slot of day.slots) {
        const c  = slot.getCenter();
        const dx = gx - c.x;
        const dy = gy - c.y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < minDist) { minDist = d; nearest = slot; }
      }
    }
    return nearest;
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  _renderHourLabels(g) {
    const headerH  = 36;
    const count    = END_HOUR - START_HOUR;
    const slotH    = (this.h - headerH) / count;

    g.push();
    g.textSize(11);
    g.textAlign(g.RIGHT, g.CENTER);
    g.fill("#555577");
    const font = R.assets?.fonts?.["Medium"];
    if (font) g.textFont(font);

    for (let i = 0; i < count; i++) {
      const hour  = START_HOUR + i;
      const label = hour < 12 ? `${hour}am`
                  : hour === 12 ? "12pm"
                  : `${hour-12}pm`;
      const slotY = this.y + headerH + i * slotH + 2;
      g.text(label, this.x + HOUR_LABEL_W - 6, slotY);
    }
    g.pop();
  }

  render(g) {
    if (!this.visible) return;
    this._renderHourLabels(g);
    super.render(g); // walks DayColumns → HourSlots
  }
}
