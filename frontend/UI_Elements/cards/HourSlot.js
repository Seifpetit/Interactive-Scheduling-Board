import { UINode } from "../base/UINode.js";
import { R }      from "../../core/runtime.js";
import { renderMaterial } from "../../core/render/materials/materialRenderer.js";

const CATEGORY_COLORS = {
  study:   "#4a90d9",
  gym:     "#e2621d",
  errands: "#f5a623",
  work:    "#9b59b6",
  health:  "#27ae60",
  social:  "#e91e8c",
  other:   "#92ba00",
};

function getEffectiveDuration(placement, task) {
  return placement?.customDuration ?? task?.duration ?? 1;
}

function makeSlotId(weekStart, dayIndex, hour) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIndex);
  d.setHours(hour, 0, 0, 0);

  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  const hh   = String(d.getHours()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T${hh}:00`;
}

export class HourSlot extends UINode {
  constructor(dayIndex, hour) {
    super();
    this.dayIndex = dayIndex;
    this.hour     = hour;
    this.slotId   = makeSlotId(R.calendar.currentWeekStart, dayIndex, hour);

    this.hitType        = "hourSlot";
    this.highlight      = false;
    this.highlightState = null;
    this.pulse          = 0;
    this.pulseTriggered = false;

    this._columnSlots = null;
  }

  refreshSlotId() {
    this.slotId = makeSlotId(R.calendar.currentWeekStart, this.dayIndex, this.hour);
  }

  _getOwningPlacement() {
    if (!this._columnSlots) return null;

    const myIndex = this._columnSlots.indexOf(this);

    for (let i = myIndex; i >= 0; i--) {
      const slot      = this._columnSlots[i];
      const placement = R.appState?.placements?.[slot.slotId];
      if (!placement) continue;

      const task     = R.appState?.tasks?.find(t => t.id === placement.taskId);
      const duration = getEffectiveDuration(placement, task);
      const endIndex = i + duration - 1;

      if (myIndex >= i && myIndex <= endIndex) {
        return { placement, task, startIndex: i, endIndex, isStart: i === myIndex };
      }
    }
    return null;
  }

  _blockHeight(duration) {
    if (!this._columnSlots) return this.h;
    let totalH = 0;
    const myIndex = this._columnSlots.indexOf(this);
    for (let i = 0; i < duration; i++) {
      const s = this._columnSlots[myIndex + i];
      if (s) totalH += s.h + 1;
    }
    return totalH - 1;
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

  update() {
    this.refreshSlotId();

    const owned = this._getOwningPlacement();
    if (!owned) {
      this.hitType    = "hourSlot";
      this._startSlot = null;
    } else {
      this.hitType    = "placedTask";
      this._startSlot = owned.isStart ? null : this._columnSlots[owned.startIndex];
    }

    if (this.pulse > 0) {
      this.pulse *= 0.2;
      if (this.pulse < 0.01) { this.pulse = 0; this.pulseTriggered = false; }
    }
  }

  hitTest(gx, gy) {
    if (!this.visible) return null;
    if (!this.contains(gx, gy)) return null;
    if (!this.hitType) return null;

    const node = this._startSlot ?? this;
    return { node, type: this.hitType };
  }

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

  render(g) {
    if (!this.visible) return;

    const owned = this._getOwningPlacement();
    const drag  = R.interaction.drag;

    // ─────────────────────────────
    // 1️⃣ CONTINUATION SLOT (not start of block)
    // ─────────────────────────────
    if (owned && !owned.isStart) {
      const color = CATEGORY_COLORS[owned.task?.category] ?? CATEGORY_COLORS.other;

      g.push();
      g.translate(this.x + this.w / 2, this.y + this.h / 2);



      g.pop();
      return;
    }

    g.push();

    const isBeingDragged =
      drag.active &&
      drag.kind === "placedTask" &&
      drag.fromSlotId === this.slotId;

    // ─────────────────────────────
    // 2️⃣ PLACED TASK (START SLOT)
    // ─────────────────────────────
    if (owned && owned.isStart) {
      const { task, placement } = owned;
      const duration = getEffectiveDuration(placement, task);
      const blockH   = this._blockHeight(duration);
      const color    = CATEGORY_COLORS[task?.category] ?? CATEGORY_COLORS.other;
      const hovMatch = R.interaction.hoveredTaskId === placement.taskId;

      // 🔥 MATERIAL (task surface)
      g.push();
      g.translate(this.x + this.w / 2, this.y + this.h / 2);

    

      g.pop();

      // ─────────────────────────────
      // CONTENT LAYER (text, icons)
      // ─────────────────────────────
      if (!isBeingDragged) {
        g.fill("#fff");
        g.textSize(13);
        g.textAlign(g.LEFT, g.CENTER);

        const font = R.assets?.fonts?.["Bold"];
        if (font) g.textFont(font);

        g.text(task.name, this.x + 8, this.y + this.h / 2 - 2);

        g.fill("#ffffff88");
        g.textSize(11);
        g.textAlign(g.RIGHT, g.CENTER);

        const font2 = R.assets?.fonts?.["Italic"];
        if (font2) g.textFont(font2);

        g.text(`${duration}h`, this.x + this.w - 8, this.y + this.h / 2 - 2);

        // ─────────────────────────────
        // INTERACTION LAYER (hover highlight)
        // ─────────────────────────────
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

        // ─────────────────────────────
        // VALIDATION HIGHLIGHT
        // ─────────────────────────────
        if (this.highlight) {
          const rc =
            this.highlightState === "error"
              ? "#e2621d"
              : "#27ae60";

          g.push();

          g.noFill();
          g.stroke(rc + "aa");
          g.strokeWeight(6);
          g.rect(this.x - 1, this.y - 1, this.w + 2, blockH + 2, 8);

          g.stroke(rc);
          g.strokeWeight(2);
          g.rect(this.x, this.y, this.w, blockH, 6);

          g.pop();
        }
      }

    // ─────────────────────────────
    // 3️⃣ EMPTY SLOT
    // ─────────────────────────────
    } else {
      const isError   = this.highlightState === "error";
      const isWarning = this.highlightState === "warning";

      g.push();
      g.translate(this.x + this.w / 2, this.y + this.h / 2);

      g.pop();

      // ─────────────────────────────
      // INTERACTION LAYER (border)
      // ─────────────────────────────
      g.stroke(
        this.highlight
          ? isError
            ? "#e2621d"
            : isWarning
            ? "#f5a623"
            : "#27ae60"
          : "#2a2a3e"
      );

      g.strokeWeight(this.highlight ? 2 : 1);
      g.noFill();
      g.rect(this.x, this.y, this.w, this.h, 6);
    }

    // ─────────────────────────────
    // GLOBAL INTERACTION (pulse)
    // ─────────────────────────────
    if (this.highlight) this._drawPulse(g);

    this.highlight = false;

    g.pop();
  }

  static renderDragGhost(g) {
    const drag = R.interaction.drag;
    if (!drag.active || drag.kind !== "placedTask" || !drag.task) return;

    const color    = CATEGORY_COLORS[drag.task.category] ?? CATEGORY_COLORS.other;
    const duration = drag.customDuration ?? drag.task?.duration ?? 1;
    const slotH    = drag.ghostH / duration;

    g.push();
    g.translate(drag.ghostX + drag.ghostW / 2, drag.ghostY + drag.ghostH / 2);
    g.rotate(drag.tilt);

    const hw = drag.ghostW / 2;
    const hh = drag.ghostH / 2;

    g.fill(color + "33");
    g.noStroke();
    g.rect(-hw, -hh, drag.ghostW, drag.ghostH, 6);

    g.fill(color + "cc");
    g.rect(-hw, -hh, drag.ghostW, slotH, 6, 6, 0, 0);

    if (duration > 1) {
      g.fill(color + "55");
      g.rect(-hw, -hh + slotH, drag.ghostW, drag.ghostH - slotH, 0, 0, 6, 6);
      g.fill(color + "99");
      g.rect(-hw, -hh + slotH, 3, drag.ghostH - slotH, 4);
    }

    g.fill("#fff");
    g.textSize(13);
    g.textAlign(g.LEFT, g.CENTER);
    const font = R.assets?.fonts?.["Bold"];
    if (font) g.textFont(font);
    g.text(drag.task.name, -hw + 8, -hh + slotH / 2 - 2);
    g.noStroke();

    g.fill("#ffffff88");
    g.textSize(11);
    g.textAlign(g.RIGHT, g.CENTER);
    const font2 = R.assets?.fonts?.["Italic"];
    if (font2) g.textFont(font2);
    g.text(`${duration}h`, hw - 8, -hh + slotH / 2 - 2);

    g.pop();
  }
}