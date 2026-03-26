import { UINode }                from "../base/UINode.js";
import { TaskTray }              from "./TaskTray.js";
import { WeekGrid }              from "./WeekGrid.js";
import { HourSlot }              from "../cards/HourSlot.js";
import { ContextMenuController } from "../contextMenu/ContextMenuController.js";
import { Toaster }               from "../overlays/Toaster.js";
import { R }                     from "../../core/runtime.js";

class WeekNavButton extends UINode {
  constructor(label, onClick) {
    super();
    this.label = label;
    this.onClick = onClick;
    this.isHovered = false;
    this._pressedLastFrame = false;
  }

  layout() {}

  update(mouse) {
    if (!this.visible) return;
    this.isHovered = this.contains(mouse.x, mouse.y);

    const pressedNow = mouse.justPressed && this.isHovered && !R.interaction.drag.active;
    if (pressedNow && !this._pressedLastFrame) {
      this.onClick?.();
    }
    this._pressedLastFrame = pressedNow;
  }

  render(g) {
    if (!this.visible) return;

    g.push();
    g.noStroke();
    g.fill(this.isHovered ? "#4a90d930" : "#1a1a2e");
    g.rect(this.x, this.y, this.w, this.h, 10);

    g.stroke(this.isHovered ? "#4a90d9" : "#2a2a4a");
    g.strokeWeight(1.5);
    g.noFill();
    g.rect(this.x, this.y, this.w, this.h, 10);

    g.noStroke();
    g.fill(this.isHovered ? "#ffffff" : "#8888aa");
    g.textAlign(g.CENTER, g.CENTER);
    g.textSize(18);
    const font = R.assets?.fonts?.["Bold"];
    if (font) g.textFont(font);
    g.text(this.label, this.x + this.w / 2, this.y + this.h / 2 - 1);
    g.pop();

    this.isHovered = false;
  }
}

function formatWeekRange(weekStart) {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth && sameYear) {
    return `${monthNames[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
  }

  if (sameYear) {
    return `${monthNames[start.getMonth()]} ${start.getDate()} – ${monthNames[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
  }

  return `${monthNames[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} – ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

export class Planner extends UINode {
  constructor(state, commands) {
    super();
    this.hitType  = null;
    this.commands = commands;

    this.tray        = new TaskTray(state.tasks || [], commands);
    this.grid        = new WeekGrid();
    this.prevBtn     = new WeekNavButton("<=", () => this.commands.prevWeek());
    this.nextBtn     = new WeekNavButton("=>", () => this.commands.nextWeek());
    this.contextMenu = new ContextMenuController(commands);
    this.toaster     = new Toaster();

    R.toast = (message, type = "info", mode = "timed") => {
      this.toaster.add(message, type, mode);
    };

    this.children = [this.grid, this.tray, this.prevBtn, this.nextBtn];

    this._lastOverflow = false;
  }

  layout() {
    const pad        = 20;
    const topBarH    = 44;
    const trayW      = Math.min(180, this.w * 0.17);
    const contentY   = this.y + pad + topBarH + 10;
    const contentH   = this.h - pad * 2 - topBarH - 10;
    const gridX      = this.x + pad + trayW + pad;
    const gridW      = this.w - trayW - pad * 3;
    const btnW       = 42;
    const btnH       = 30;
    const btnY       = this.y + pad + 4;

    this.tray.setGeometry(this.x + pad, contentY, trayW, contentH);
    this.grid.setGeometry(gridX, contentY, gridW, contentH);

    this.prevBtn.setGeometry(gridX, btnY, btnW, btnH);
    this.nextBtn.setGeometry(gridX + gridW - btnW, btnY, btnW, btnH);
  }

  update(p5, mouse) {
    if (!this.visible) return;

    this.setGeometry(20, 20, p5.width - 40, p5.height - 40);

    this.prevBtn.update(mouse);
    this.nextBtn.update(mouse);

    if (this.tray.contains(mouse.x, mouse.y) && !R.interaction.drag.active) {
      if (mouse.wheelDelta !== 0) this.tray.scroll(mouse.wheelDelta);
    }

    const drag = R.interaction.drag;
    if (drag.active && (drag.kind === "taskCard" || drag.kind === "placedTask")) {

      const cx = drag.kind === "taskCard"
        ? drag.card.getDragX() + drag.card.w / 2
        : drag.ghostX + drag.ghostW / 2;

      const cy = drag.kind === "taskCard"
        ? drag.card.getDragY() + drag.card.h / 2
        : drag.ghostY + drag.ghostH * 0.1;

      const nearest  = this.grid.findNearestSlot(cx, cy);
      const duration = drag.kind === "taskCard"
        ? (drag.card.task.duration ?? 1)
        : (drag.task?.duration ?? 1);

      const blockSlots = new Set();
      let overflow = false;

      if (nearest) {
        const day = this.grid.days[nearest.dayIndex];
        if (day) {
          const startIndex = day.slots.findIndex(s => s.slotId === nearest.slotId);
          for (let i = 0; i < duration; i++) {
            const slot = day.slots[startIndex + i];
            if (slot) blockSlots.add(slot);
            else overflow = true;
          }
        }
      }

      if (overflow && !drag._overflowToastFired) {
        drag._overflowToastFired = true;
        R.toast("Task overflows end of day — try dropping higher", "warning");
      }
      if (!overflow) drag._overflowToastFired = false;
      this._lastOverflow = overflow;

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
      if (this._lastOverflow !== false) this._lastOverflow = false;
    }

    this.tray.update(mouse);
    this.grid.update(mouse);
    this.toaster.update();
  }

  render(gMain, gOverlay) {
    if (!this.visible) return;

    gMain.push();
    gMain.fill("#0d0d1a");
    gMain.noStroke();
    gMain.rect(this.x, this.y, this.w, this.h, 16);
    gMain.pop();

    // week label
    gMain.push();
    gMain.fill("#ffffff");
    gMain.textAlign(gMain.CENTER, gMain.CENTER);
    gMain.textSize(16);
    const font = R.assets?.fonts?.["Bold"];
    if (font) gMain.textFont(font);
    gMain.text(
      formatWeekRange(R.calendar.currentWeekStart),
      this.grid.x + this.grid.w / 2,
      this.y + 39
    );
    gMain.pop();

    this.prevBtn.render(gMain);
    this.nextBtn.render(gMain);
    this.grid.render(gMain);

    const activeCard = R.interaction.drag.kind === "taskCard"
      ? R.interaction.drag.card
      : null;
    this.tray.render(gMain, activeCard);

    if (activeCard) activeCard.renderDrag(gOverlay, R.interaction.drag.tilt);

    HourSlot.renderDragGhost(gOverlay);

    this.tray.renderOverlay(gOverlay);

    this.contextMenu.render(gOverlay);

    this.toaster.render(gOverlay);
  }
}