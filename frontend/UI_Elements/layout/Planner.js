import { UINode }                from "../base/UINode.js";
import { TaskTray }              from "./TaskTray.js";
import { WeekGrid }              from "./WeekGrid.js";
import { HourSlot }              from "../cards/HourSlot.js";
import { ContextMenuController } from "../contextMenu/ContextMenuController.js";
import { Toaster }               from "../overlays/Toaster.js";
import { getDragVerdict }        from "../../core/validator.js";
import { updateCoachFeedback } from "../../core/coachFeedback.js";
import { R }                     from "../../core/runtime.js";
import { renderMaterial } from "../../core/render/materials/materialRenderer.js";
import { AuthModal } from "../overlays/auth/authModal.js";

class WeekNavButton extends UINode {
  constructor(label, onClick) {
    super();
    this.label = label;
    this.onClick = onClick;
    this.isHovered = false;
    this._pressedLastFrame = false;
    this.isUserBtn = false;
  }

  layout() {}

  update(mouse) {
    if (!this.visible) return;
    this.isHovered = this.contains(mouse.x, mouse.y);
    const target = this.isHovered ? 0.5 : 0;
      this.updateMaterial(target);

    if (mouse.justPressed && this.isHovered && !R.interaction.drag.active) {
      this.onClick?.();
    }
  }

  render(g) {
    if (!this.visible) return;

    g.push();

    // ─────────────────────────────
    // 1️⃣ MATERIAL LAYER (background)
    // ─────────────────────────────
    g.translate(this.x + this.w / 2, this.y + this.h / 2);
      renderMaterial(g, {
        ...this,
        x: this.dragging ? this.dragX : this.x,
        y: this.dragging ? this.dragY : this.y,
        w: this.w,
        h: this.h,
        color: this.label === "Logout" ? "#f67e7a" 
             : this.isUserBtn ? "#405048"   // light green
             : "#2a2a4a"
      });
    g.pop();

    // ─────────────────────────────
    // 2️⃣ BORDER (interaction layer)
    // ─────────────────────────────
    g.push();

    g.stroke(this.isHovered ? "#4a90d9" : "#2a2a4a");
    if (this.label === "Logout") {
      g.stroke(this.isHovered ? "#d9534f" : "#a43e3a");
    }

    if (this.isUserBtn) {
      g.stroke(this.isHovered ? "#6ddc9f" : "#3e4542");
    }
    
    g.strokeWeight(1.5);
    g.noFill();
    g.rect(this.x, this.y, this.w, this.h, 10);

    // ─────────────────────────────
    // 3️⃣ CONTENT (text)
    // ─────────────────────────────
    g.noStroke();
    g.fill(this.isHovered ? "#ffffff" : "#8888aa");

    if (this.label === "Logout") {
      g.fill(this.isHovered ? "#ffffff" : "#000000");
    }
    if (this.isUserBtn) {
      g.fill(this.isHovered ? "#ffffff" : "#42dd90");
    }

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
    this.todayBtn    = new WeekNavButton("Today", () => this.commands.recenterWeek());
    this.nextBtn     = new WeekNavButton("=>", () => this.commands.nextWeek());
    this.logoutBtn   = new WeekNavButton("Logout", () => this.commands.logout());
    this.userBtn     = new WeekNavButton("...", () => {});  this.userBtn.isUserBtn = true;

    this.contextMenu = new ContextMenuController(commands);
    this.authModal   = new AuthModal();
    this.toaster     = new Toaster();

    R.toast = (message, type = "info", mode = "timed") => {
      this.toaster.add(message, type, mode);
    };

    this.children = [
      this.grid, 
      this.tray, 
      this.prevBtn, 
      this.todayBtn, 
      this.nextBtn, 
      this.logoutBtn,
    ];

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
    const todayW     = 74;
    

    this.tray.setGeometry(this.x + pad, contentY, trayW, contentH);
    this.grid.setGeometry(gridX, contentY, gridW, contentH);

    this.prevBtn.setGeometry(gridX, btnY, btnW, btnH);
    this.todayBtn.setGeometry(gridX + (gridW - todayW) / 4, btnY, todayW, btnH);
    this.nextBtn.setGeometry(gridX + gridW - btnW, btnY, btnW, btnH);

    const logoutW    = 80;
    this.logoutBtn.setGeometry(
      this.x + this.w - pad - logoutW - this.w / 8,  // right side
      btnY,
      logoutW,
      btnH
    );

    const userW = 120;
    this.userBtn.setGeometry(
      this.x + this.w - pad - logoutW - this.w / 8 - userW - 10,
      btnY,
      userW,
      btnH
    );

  }

  update(p5, mouse) {
    if (!this.visible) return;
    if (R.modal.open && R.modal.type === "auth") {
      this.authModal.visible = true;
    } else {
      this.authModal.visible = false;
    }

    this.setGeometry(20, 20, p5.width - 40, p5.height - 40);

    this.prevBtn.update(mouse);
    this.todayBtn.update(mouse);
    this.nextBtn.update(mouse);

    this.logoutBtn.update(mouse);
    this.userBtn.label = R.auth?.email ?? "guest";
    this.userBtn.update(mouse);

    if (this.tray.contains(mouse.x, mouse.y) && !R.interaction.drag.active) {
      if (mouse.wheelDelta !== 0) this.tray.scroll(mouse.wheelDelta);
    }

    const drag = R.interaction.drag;

    if (drag.active) {

      const targetX = drag.kind === "taskCard"
        ? drag.card.getDragX()
        : drag.ghostX;

      const targetY = drag.kind === "taskCard"
        ? drag.card.getDragY()
        : drag.ghostY;

      const nearest = drag._nearestSlot;

      if (nearest) {
        const center = nearest.getCenter();

        const dx = center.x - targetX;
        const dy = center.y - targetY;

        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < drag.magnet.radius) {
          const force = (1 - dist / drag.magnet.radius) * drag.magnet.strength;

          if (drag.kind === "taskCard") {
            drag.card.dragX += dx * force;
            drag.card.dragY += dy * force;
          } else {
            drag.ghostX += dx * force;
            drag.ghostY += dy * force;
          }
        }
      }

      const verdict = getDragVerdict();
      drag.verdict = verdict;

      if (
        verdict?.level === "error" &&
        verdict?.code === "DAY_OVERFLOW" &&
        !drag._overflowToastFired
      ) {
        drag._overflowToastFired = true;
        R.toast(verdict.message, "warning");
      }

      if (verdict?.code !== "DAY_OVERFLOW") {
        drag._overflowToastFired = false;
      }
      // ─────────────────────────────
      // Compute blockSlots (correct variable)
      // ─────────────────────────────
      const blockSlots = new Set();

      if (nearest) {
        const duration =
          drag.kind === "taskCard"
            ? drag.card?.task?.duration ?? 1
            : drag.customDuration ?? drag.task?.duration ?? 1;

        const day = this.grid.days[nearest.dayIndex];

        if (day) {
          const startIndex = day.slots.findIndex(s => s.slotId === nearest.slotId);

          for (let i = 0; i < duration; i++) {
            const slot = day.slots[startIndex + i];
            if (slot) blockSlots.add(slot);
          }
        }
      }
      for (const day of this.grid.days) {
        for (const slot of day.slots) {
          const isSource = drag.kind === "placedTask" && slot.slotId === drag.fromSlotId;
          if (isSource) {
            slot.highlight = false;
            slot.highlightState = null;
            continue;
          }

          if (blockSlots.has(slot)) {
            slot.highlight = true;
            slot.highlightState =
              verdict?.level === "error" ? "error" :
              verdict?.level === "warning" ? "warning" :
              "ok";
          } else {
            slot.highlight = false;
            slot.highlightState = null;
          }
        }
      }

    } else {
      drag.verdict = null;
      if (this._lastOverflow !== false) this._lastOverflow = false;
    }

    this.tray.update(mouse);
    this.grid.update(mouse);
    
    this.toaster.update();
    updateCoachFeedback();
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
    this.todayBtn.render(gMain);
    this.nextBtn.render(gMain);

    this.logoutBtn.render(gMain);
    this.userBtn.render(gMain);

    this.grid.render(gMain);

    const activeCard = R.interaction.drag.kind === "taskCard"
      ? R.interaction.drag.card
      : null;
    this.tray.render(gMain, activeCard);

    if (activeCard) activeCard.renderDrag(gOverlay, R.interaction.drag.tilt);

    HourSlot.renderDragGhost(gOverlay);

    this.tray.renderOverlay(gOverlay);

    this.contextMenu.render(gOverlay);

    this.authModal.render(gOverlay);

    this.toaster.render(gOverlay);
  }
}