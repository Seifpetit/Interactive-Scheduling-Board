import { R } from "../core/runtime.js";
import { DayColumn } from "./DayColumn.js";

export class WeekGrid {
  constructor(demandData) {
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;

    this.days = [];      // DayColumn instances
    this.demand = demandData; // from state.core.demand
  }

  setGeometry(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    this.buildDays();
    this.layout();
  }

  buildDays() {
    this.days = [];

    for (let i = 0; i < 7; i++) {
      this.days.push(new DayColumn(i));
    }
  }

  layout() {
    const colW = this.w / 7;

    for (let i = 0; i < this.days.length; i++) {
      const colX = this.x + i * colW;
      this.days[i].setGeometry(colX, this.y, colW, this.h);
    }
  }

  findNearestSlot(x, y) {
    let nearest = null;
    let minDist = 40; // snap radius

    for (const day of this.days) {
      for (const shift of day.shifts) {
        for (const slot of shift.slots) {

          const center = slot.getCenter();
          const dx = x - center.x;
          const dy = y - center.y;
          const dist = Math.sqrt(dx*dx + dy*dy);

          if (dist < minDist) {
            minDist = dist;
            nearest = slot;
          }
        }
      }
    }

    return nearest;
  }

  update(mouse) {
    // V0: nothing dynamic yet
    if (R.ui.activeEmployeeCard) {
      const nearestSlot = this.findNearestSlot(mouse.x, mouse.y);
      for (const day of this.days) {
        for (const shift of day.shifts) {
          for (const slot of shift.slots) {
            slot.highlight = (slot === nearestSlot);
            slot.triggerPulse();
          }
        }
      }
    }
    for (const day of this.days) {
      for (const shift of day.shifts) {
        for (const slot of shift.slots) {
          slot.update(mouse);
        }
      }
    }
  }

  render(g) {
    for (const day of this.days) {
      day.render(g);
    }
  }

}