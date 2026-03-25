import { UINode }                from "../base/UINode.js";
import { TaskTray }              from "./TaskTray.js";
import { WeekGrid }              from "./WeekGrid.js";
import { HourSlot }              from "../cards/HourSlot.js";
import { ContextMenuController } from "../contextMenu/ContextMenuController.js";
import { Toaster }               from "../overlays/Toaster.js";
import { R }                     from "../../core/runtime.js";

// ─────────────────────────────────────────────────────────────────────────────
// Planner  — root UI node for the personal planner
//
// Types emitted by this tree:
//   "taskCard"      — draggable task card in the tray
//   "placedTask"    — occupied hour slot, draggable to another slot
//   "hourSlot"      — empty drop target on the calendar
//   "addTaskButton" — (+) button in the tray
// ─────────────────────────────────────────────────────────────────────────────

export class Planner extends UINode {
  constructor(state, commands) {
    super();
    this.hitType  = null;
    this.commands = commands;

    this.tray        = new TaskTray(state.tasks || [], commands);
    this.grid        = new WeekGrid();
    this.contextMenu = new ContextMenuController(commands);
    this.toaster     = new Toaster();

    // attach R.toast globally — any file can now call R.toast("msg", "type", "mode")
    R.toast = (message, type = "info", mode = "timed") => {
      this.toaster.add(message, type, mode);
    };

    this.children = [this.grid, this.tray];

    // track last overflow state to avoid spamming the toaster
    this._lastOverflow = false;
  }

  // ─────────────────────────────
  // LAYOUT
  // ─────────────────────────────

  layout() {
    const pad   = 20;
    const trayW = Math.min(180, this.w * 0.17);
    const gridX = this.x + pad + trayW + pad;
    const gridW = this.w - trayW - pad * 3;

    this.tray.setGeometry(this.x + pad, this.y + pad, trayW, this.h - pad * 2);
    this.grid.setGeometry(gridX,        this.y + pad, gridW, this.h - pad * 2);
  }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update(p5, mouse) {
    if (!this.visible) return;

    this.setGeometry(20, 20, p5.width - 40, p5.height - 40);

    // scroll — only when tray hovered and no drag active
    if (this.tray.contains(mouse.x, mouse.y) && !R.interaction.drag.active) {
      if (mouse.wheelDelta !== 0) this.tray.scroll(mouse.wheelDelta);
    }

    // ── drag highlight block ──
    const drag = R.interaction.drag;
    if (drag.active && (drag.kind === "taskCard" || drag.kind === "placedTask")) {

      const cx = drag.kind === "taskCard"
        ? drag.card.getDragX() + drag.card.w / 2
        : drag.ghostX + drag.ghostW / 2;

      const cy = drag.kind === "taskCard"
        ? drag.card.getDragY() + drag.card.h / 2
        : drag.ghostY + drag.ghostH * 0.1; // use top of ghost, not center

      const nearest  = this.grid.findNearestSlot(cx, cy);
      const duration = drag.kind === "taskCard"
        ? (drag.card.task.duration ?? 1)
        : (drag.task?.duration ?? 1);

      // build block — same day column, consecutive hours downward
      const blockSlots = new Set();
      let   overflow   = false;

      if (nearest) {
        const day = this.grid.days[nearest.dayIndex];
        if (day) {
          const startIndex = day.slots.findIndex(s => s.slotId === nearest.slotId);
          for (let i = 0; i < duration; i++) {
            const slot = day.slots[startIndex + i];
            if (slot) blockSlots.add(slot);
            else      overflow = true; // ran off end of day
          }
        }
      }

      // fire warning toast once per drag session — not per frame or per slot change
      if (overflow && !drag._overflowToastFired) {
        drag._overflowToastFired = true;
        R.toast("Task overflows end of day — try dropping higher", "warning");
      }
      if (!overflow) drag._overflowToastFired = false;
      this._lastOverflow = overflow;

      // apply highlights — highlightState drives color in HourSlot.render
      for (const day of this.grid.days) {
        for (const slot of day.slots) {
          const isSource = drag.kind === "placedTask" && slot.slotId === drag.fromSlotId;
          if (isSource) {
            slot.highlight      = false;
            slot.highlightState = null;
            continue;
          }
          if (blockSlots.has(slot)) {
            slot.highlight      = true;
            slot.highlightState = overflow ? "error" : "ok";
          } else {
            slot.highlight      = false;
            slot.highlightState = null;
          }
        }
      }

      drag._nearestSlot = nearest;

    } else {
      // drag ended or not active — reset overflow tracker
      if (this._lastOverflow !== false) this._lastOverflow = false;
    }

    this.tray.update(mouse);
    this.grid.update(mouse);
    this.toaster.update();
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(gMain, gOverlay) {
    if (!this.visible) return;

    // background panel
    gMain.push();
    gMain.fill("#0d0d1a");
    gMain.noStroke();
    gMain.rect(this.x, this.y, this.w, this.h, 16);
    gMain.pop();

    this.grid.render(gMain);

    const activeCard = R.interaction.drag.kind === "taskCard"
      ? R.interaction.drag.card
      : null;
    this.tray.render(gMain, activeCard);

    // overlay: tray card ghost
    if (activeCard) activeCard.renderDrag(gOverlay, R.interaction.drag.tilt);

    // overlay: placed task ghost
    HourSlot.renderDragGhost(gOverlay);

    // overlay: add-task input highlight
    this.tray.renderOverlay(gOverlay);

    // overlay: context menu
    this.contextMenu.render(gOverlay);

    // overlay: toaster — always last, always on top
    this.toaster.render(gOverlay);
  }
}
