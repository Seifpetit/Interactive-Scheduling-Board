import { UINode }   from "../base/UINode.js";
import { HourSlot } from "../cards/HourSlot.js";
import { R }        from "../../core/runtime.js";

const START_HOUR = 8;
const END_HOUR   = 23;

// ─────────────────────────────────────────────────────────────────────────────
// DayColumn  — one column in the WeekGrid
// Children: HourSlot × (END_HOUR - START_HOUR)
// ─────────────────────────────────────────────────────────────────────────────

export class DayColumn extends UINode {
  constructor(dayIndex) {
    super();
    this.hitType  = null; // column itself is not hittable — slots are
    this.dayIndex = dayIndex;

    this._buildSlots();
  }

  _buildSlots() {
    this.children = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      this.children.push(new HourSlot(this.dayIndex, hour));
    }
    // give each slot a reference to the full column slots
    // so it can calculate spanning height and block ownership
    for (const slot of this.children) {
      slot._columnSlots = this.children;
    }
  }

  get slots() { return this.children; }

  getDayLabel() {
    return ["MON","TUE","WED","THU","FRI","SAT","SUN"][this.dayIndex];
  }

  // ─────────────────────────────
  // LAYOUT
  // ─────────────────────────────

  layout() {
    const headerH  = 36;
    const count    = END_HOUR - START_HOUR;
    const slotH    = (this.h - headerH) / count;

    this.children.forEach((slot, i) => {
      slot.setGeometry(
        this.x + 2,
        this.y + headerH + i * slotH,
        this.w - 4,
        slotH - 1
      );
    });
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(g) {
    if (!this.visible) return;
    g.push();

    // column bg
    g.fill("#12122a");
    g.noStroke();
    g.rect(this.x, this.y, this.w, this.h, 8);

    // header
    const isToday = (new Date().getDay() + 6) % 7 === this.dayIndex;
    g.fill(isToday ? "#4a90d9" : "#2a2a4a");
    g.rect(this.x, this.y, this.w, 34, 8);

    g.fill(isToday ? "#ffffff" : "#8888aa");
    g.textSize(13);
    g.textAlign(g.CENTER, g.CENTER);
    const font = R.assets?.fonts?.["ExtraBold"];
    if (font) g.textFont(font);
    g.text(this.getDayLabel(), this.x + this.w / 2, this.y + 17);

    g.pop();

    // children (slots)
    super.render(g);
  }
}
