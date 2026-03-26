import { UINode }   from "../base/UINode.js";
import { R }        from "../../core/runtime.js";

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
// HourSlot  — one hour block in a DayColumn
//
// hitType is dynamic:
//   "placedTask" — slot has a placement → draggable to another slot
//   "hourSlot"   — slot is empty        → drop target only
// ─────────────────────────────────────────────────────────────────────────────

export class HourSlot extends UINode {
  constructor(dayIndex, hour) {
    super();
    this.dayIndex = dayIndex;
    this.hour     = hour;
    this.slotId   = `${dayIndex}_${hour}`;

    this.hitType        = "hourSlot";
    this.highlight      = false;
    this.highlightState = null;
    this.pulse          = 0;
    this.pulseTriggered = false;

    // set by DayColumn after build — lets slot look up neighbours
    this._columnSlots = null;
  }

  // ─────────────────────────────
  // BLOCK HELPERS
  // ─────────────────────────────

  // returns the placement that OWNS this slot
  // either placed directly here, or placed above and spanning into here
  _getOwningPlacement() {
    if (!this._columnSlots) return null;

    const myIndex = this._columnSlots.indexOf(this);

    // check this slot and all slots above it
    for (let i = myIndex; i >= 0; i--) {
      const slot      = this._columnSlots[i];
      const placement = R.appState?.placements?.[slot.slotId];
      if (!placement) continue;

      const task     = R.appState?.tasks?.find(t => t.id === placement.taskId);
      const duration = task?.duration ?? 1;
      const endIndex = i + duration - 1;

      // does this placement span into our slot?
      if (myIndex >= i && myIndex <= endIndex) {
        return { placement, task, startIndex: i, endIndex, isStart: i === myIndex };
      }
    }
    return null;
  }

  // total pixel height of the block starting at this slot
  _blockHeight(duration) {
    if (!this._columnSlots) return this.h;
    let totalH = 0;
    const myIndex = this._columnSlots.indexOf(this);
    for (let i = 0; i < duration; i++) {
      const s = this._columnSlots[myIndex + i];
      if (s) totalH += s.h + 1; // +1 for the 1px gap between slots
    }
    return totalH - 1; // remove last gap
  }

  layout() {}

  getCenter() {
    return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
  }

  getPlacement() {
    return R.appState?.placements?.[this.slotId] ?? null;
  }

  triggerPulse() {
    this.pulseTriggered = true;
    this.pulse = 1.0;
  }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update() {
    const owned = this._getOwningPlacement();
    if (!owned) {
      this.hitType    = "hourSlot";
      this._startSlot = null;
    } else {
      // both start and covered slots are "placedTask"
      // but covered slots store a ref to the start slot
      this.hitType    = "placedTask";
      this._startSlot = owned.isStart ? null : this._columnSlots[owned.startIndex];
    }

    if (this.pulse > 0) {
      this.pulse *= 0.2;
      if (this.pulse < 0.01) { this.pulse = 0; this.pulseTriggered = false; }
    }
  }

  // override hitTest — covered slots report the START slot as the hit node
  // so drag and context menu always receive the correct ref
  hitTest(gx, gy) {
    if (!this.visible) return null;
    if (!this.contains(gx, gy)) return null;
    if (!this.hitType) return null;

    // if this is a covered slot, return the start slot as the node
    const node = this._startSlot ?? this;
    return { node, type: this.hitType };
  }

  // ─────────────────────────────
  // RENDER helpers
  // ─────────────────────────────

  _drawPulse(g) {
    if (this.pulse <= 0) return;
    const expand = this.pulse * 4;
    g.push();
    g.noFill();
    g.stroke("#4a90d9be");
    g.strokeWeight(2 + this.pulse * 2);
    g.rect(this.x - expand/2, this.y - expand/2, this.w + expand, this.h + expand, 6);
    g.pop();
  }

  _drawTaskContent(g, task, color, faded = false) {
    g.fill(faded ? color + "44" : (this.highlight ? color + "cc" : color));
    g.noStroke();
    g.rect(this.x, this.y, this.w, this.h, 6);

    if (!faded) {
      g.fill("#fff");
      g.textSize(13);
      g.textAlign(g.LEFT, g.CENTER);
        g.noStroke();
      const font = R.assets?.fonts?.["Bold"];
      if (font) g.textFont(font);
      g.text(task.name, this.x + 6, this.y + this.h / 2 - 4);
      g.noStroke();
      g.fill("#ffffff88");
      g.textSize(10);
      g.text(`${task.duration}h`, this.x + 6, this.y + this.h / 2 + 8);
    }
  }

  // ─────────────────────────────
  // RENDER — main layer
  // ─────────────────────────────

  render(g) {
    if (!this.visible) return;

    const owned = this._getOwningPlacement();
    const drag  = R.interaction.drag;

    // ── covered slot (part of a block but not the start) ──
    if (owned && !owned.isStart) {
      const color = CATEGORY_COLORS[owned.task?.category] ?? CATEGORY_COLORS.other;

      g.push();
      g.fill(color + "30"); // lighter tint
      g.noStroke();
      g.rect(this.x, this.y, this.w, this.h, 4);

      
      return;
    }

    g.push();

    const isBeingDragged = drag.active &&
                           drag.kind === "placedTask" &&
                           drag.fromSlotId === this.slotId;

    if (owned && owned.isStart) {
      // ── start slot — draws header of the block ──
      const { task, placement } = owned;
      const duration = task?.duration ?? 1;
      const blockH   = this._blockHeight(duration);
      const color    = CATEGORY_COLORS[task?.category] ?? CATEGORY_COLORS.other;
      const hovMatch = R.interaction.hoveredTaskId === placement.taskId;

      // just the first slot rect (full color header)
      g.fill(isBeingDragged ? color + "44" : color);
      g.noStroke();
      g.rect(this.x, this.y, this.w, this.h, 6, 6, 0, 0); // rounded top only

      if (!isBeingDragged) {
        // name
        g.fill("#fff");
        g.textSize(13);
        g.textAlign(g.LEFT, g.CENTER);
        const font = R.assets?.fonts?.["Bold"];
        if (font) g.textFont(font);
        g.text(task.name, this.x + 8, this.y + this.h / 2 - 2);
        g.noStroke();

        // duration badge right side
        g.fill("#ffffff88");
        g.textSize(11);
        const font2 = R.assets?.fonts?.["Italic"];
        if (font2) g.textFont(font2);
        g.textAlign(g.RIGHT, g.CENTER);
        g.text(`${duration}h`, this.x + this.w - 8, this.y + this.h / 2 - 2);

        // hover glow around full block
        if (hovMatch) {
          g.push();
          g.noFill();
          g.stroke(color + "88");
          g.strokeWeight(6);
          g.rect(this.x - 1, this.y - 1, this.w + 2, blockH + 2, 8);
          g.stroke(color);
          g.strokeWeight(2);
          g.rect(this.x, this.y, this.w, blockH, 6);
          g.noStroke();
          g.fill(color + "cc");
          g.rect(this.x, this.y, this.w, 3, 3, 3, 0, 0);
          g.pop();
        }

        // constraint ring around full block
        if (this.highlight) {
          const rc = this.highlightState === "error" ? "#e2621d" : "#27ae60";
          g.push();
          g.noFill();
          g.stroke(rc + "aa"); g.strokeWeight(6);
          g.rect(this.x - 1, this.y - 1, this.w + 2, blockH + 2, 8);
          g.stroke(rc); g.strokeWeight(2);
          g.rect(this.x, this.y, this.w, blockH, 6);
          g.pop();
        }
      }

    } else {
      // ── empty slot ──
      const isError = this.highlightState === "error";
      if (this.highlight) {
        g.fill(isError ? "#e2621d18" : "#27ae6018");
        g.stroke(isError ? "#e2621d" : "#27ae60");
        g.strokeWeight(isError ? 2 : 1.5);
      } else {
        g.fill("#1e1e2e");
        g.stroke("#2a2a3e");
        g.strokeWeight(1);
      }
      g.rect(this.x, this.y, this.w, this.h, 6);
    }

    if (this.highlight) this._drawPulse(g);
    this.highlight = false;

    g.pop();
  }

  // ─────────────────────────────
  // STATIC — ghost drawn on gOverlay by Planner
  // ─────────────────────────────

  static renderDragGhost(g) {
    const drag = R.interaction.drag;
    if (!drag.active || drag.kind !== "placedTask" || !drag.task) return;

    const color    = CATEGORY_COLORS[drag.task.category] ?? CATEGORY_COLORS.other;
    const duration = drag.task.duration ?? 1;
    const slotH    = drag.ghostH / duration; // approximate single slot height

    g.push();
    g.translate(drag.ghostX + drag.ghostW / 2, drag.ghostY + drag.ghostH / 2);
    g.rotate(drag.tilt);

    const hw = drag.ghostW / 2;
    const hh = drag.ghostH / 2;

    // full block outline
    g.fill(color + "33");
    g.noStroke();
    g.rect(-hw, -hh, drag.ghostW, drag.ghostH, 6);

    // header slot — full color
    g.fill(color + "cc");
    g.rect(-hw, -hh, drag.ghostW, slotH, 6, 6, 0, 0);

    // covered slots — lighter tint with left border
    if (duration > 1) {
      g.fill(color + "55");
      g.rect(-hw, -hh + slotH, drag.ghostW, drag.ghostH - slotH, 0, 0, 6, 6);
      g.fill(color + "99");
      g.rect(-hw, -hh + slotH, 3, drag.ghostH - slotH, 4);
    }

    // name on header
    g.fill("#fff");
    g.textSize(13);
    g.textAlign(g.LEFT, g.CENTER);
    
    const font = R.assets?.fonts?.["Bold"];
    if (font) g.textFont(font);
    g.text(drag.task.name, -hw + 8, -hh + slotH / 2 - 2);
    g.noStroke();

    // duration badge right side of header
    g.fill("#ffffff88");
    g.textSize(11);
    g.textAlign(g.RIGHT, g.CENTER);
    const font2 = R.assets?.fonts?.["Italic"];
    if (font2) g.textFont(font2);
    g.text(`${duration}h`, hw - 8, -hh + slotH / 2 - 2);

    g.pop();
  }
}
