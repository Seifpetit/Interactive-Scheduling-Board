import { UINode }   from "../base/UINode.js";
import { HourSlot } from "../cards/HourSlot.js";
import { R }        from "../../core/runtime.js";

const START_HOUR = 8;
const END_HOUR   = 23;

export class DayColumn extends UINode {
  constructor(dayIndex) {
    super();
    this.hitType  = null;
    this.dayIndex = dayIndex;

    this._buildSlots();
  }

  _buildSlots() {
    this.children = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      this.children.push(new HourSlot(this.dayIndex, hour));
    }
    for (const slot of this.children) {
      slot._columnSlots = this.children;
    }
  }

  get slots() { return this.children; }

  getDate() {
    const d = new Date(R.calendar.currentWeekStart);
    d.setDate(d.getDate() + this.dayIndex);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  getDayLabel() {
    const d = this.getDate();
    const day = ["MON","TUE","WED","THU","FRI","SAT","SUN"][this.dayIndex];
    return `${day} ${d.getDate()}`;
  }

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

  render(g) {
    if (!this.visible) return;
    g.push();

    g.fill("#12122a");
    g.noStroke();
    g.rect(this.x, this.y, this.w, this.h, 8);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const colDate = this.getDate();
    const isToday = today.getTime() === colDate.getTime();

    g.fill(isToday ? "#4a90d9" : "#2a2a4a");
    g.rect(this.x, this.y, this.w, 34, 8);

    g.fill(isToday ? "#ffffff" : "#8888aa");
    g.textSize(13);
    g.textAlign(g.CENTER, g.CENTER);
    const font = R.assets?.fonts?.["ExtraBold"];
    if (font) g.textFont(font);
    g.text(this.getDayLabel(), this.x + this.w / 2, this.y + 17);

    g.pop();

    super.render(g);
  }
}