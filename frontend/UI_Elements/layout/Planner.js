import { UINode }                from "../base/UINode.js";
import { UIButton }              from "../base/UIButton.js";
import { TaskTray }              from "./TaskTray.js";
import { WeekGrid }              from "./WeekGrid.js";
import { HourSlot }              from "../cards/HourSlot.js";
import { ContextMenuController } from "../contextMenu/ContextMenuController.js";
import { Toaster }               from "../overlays/Toaster.js";
import { DataView }              from "../overlays/DataView.js";
import { CoachModal }            from "../overlays/CoachModal.js";
import { AuthModal }             from "../overlays/auth/authModal.js";
import { getDragVerdict }        from "../../core/validator.js";
import { updateCoachFeedback }   from "../../core/coachFeedback.js";
import { R }                     from "../../core/runtime.js";
import { renderMaterial }        from "../../core/render/materials/materialRenderer.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatWeekRange(weekStart) {
  const start = new Date(weekStart);
  const end   = new Date(weekStart);
  end.setDate(end.getDate() + 6);

  const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const sm = start.getMonth() === end.getMonth();
  const sy = start.getFullYear() === end.getFullYear();

  if (sm && sy)
    return `${M[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
  if (sy)
    return `${M[start.getMonth()]} ${start.getDate()} – ${M[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
  return `${M[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} – ${M[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Planner
// ─────────────────────────────────────────────────────────────────────────────
export class Planner extends UINode {
  constructor(state, commands) {
    super();
    this.hitType  = null;
    this.commands = commands;

    // ── CORE UI ──
    this.tray        = new TaskTray(state.tasks || [], commands);
    this.grid        = new WeekGrid();

    // ── NAV BUTTONS ──
    this.prevBtn   = new UIButton("<=",    () => commands.prevWeek(),     { color: "#2a2a4a" });
    this.todayBtn  = new UIButton("Today", () => commands.recenterWeek(), { color: "#2a2a4a" });
    this.nextBtn   = new UIButton("=>",    () => commands.nextWeek(),     { color: "#2a2a4a" });
    this.logoutBtn = new UIButton("Logout",() => commands.logout(),       {
      color:      "#f67e7a",
      hoverColor: "#d9534f",
      textColor:  "#000000",
      hoverText:  "#ffffff",
    });
    this.userBtn   = new UIButton("...",   () => {}, {
      color:      "#3e4542",
      hoverColor: "#6ddc9f",
      textColor:  "#6ddc9f",
      hoverText:  "#ffffff",
    });

    // ── OVERLAYS ──
    this.contextMenu = new ContextMenuController(commands);
    this.authModal   = new AuthModal();
    this.coachModal  = new CoachModal();
    this.toaster     = new Toaster();
    this.dataView    = new DataView();

    // ── PILL STATE ──
    this._pillMat  = { planner: 0, plannerV: 0, data: 0, dataV: 0 };
    this._pillRect = null;

    // ── TOAST ──
    R.toast = (message, type = "info", mode = "timed") => {
      this.toaster.add(message, type, mode);
    };

    // ── HIT TREE (only nodes that need hitTest routing) ──
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

  // ─────────────────────────────
  // LAYOUT
  // ─────────────────────────────

  layout() {
    const pad      = 20;
    const topBarH  = 44;
    const trayW    = Math.min(180, this.w * 0.17);
    const contentY = this.y + pad + topBarH + 10;
    const contentH = this.h - pad * 2 - topBarH - 10;
    const gridX    = this.x + pad + trayW + pad;
    const gridW    = this.w - trayW - pad * 3;
    const btnW     = 42;
    const btnH     = 30;
    const btnY     = this.y + pad + 4;
    const todayW   = 74;
    const logoutW  = 80;
    const userW    = 120;
    const dataViewW = trayW + gridW + pad;

    this.tray.setGeometry(this.x + pad, contentY, trayW, contentH);
    this.grid.setGeometry(gridX, contentY, gridW, contentH);
    this.dataView.setGeometry(this.x + (this.w - dataViewW)/2, contentY, dataViewW, contentH);

    this.prevBtn.setGeometry(gridX, btnY, btnW, btnH);
    this.todayBtn.setGeometry(gridX + (gridW - todayW) / 4, btnY, todayW, btnH);
    this.nextBtn.setGeometry(gridX + gridW - btnW, btnY, btnW, btnH);

    this.logoutBtn.setGeometry(
      this.x + this.w - pad - logoutW - this.w / 8,
      btnY, logoutW, btnH
    );
    this.userBtn.setGeometry(
      this.x + this.w - pad - logoutW - this.w / 8 - userW - 10,
      btnY, userW, btnH
    );
  }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update(p5, mouse) {
    if (!this.visible) return;

    this.setGeometry(20, 20, p5.width - 40, p5.height - 40);

    // ── modal visibility ──
    this.authModal.visible  = R.modal.open && R.modal.type === "auth";
    this.dataView.visible   = R.ui?.view === "data";

    // ── button updates ──
    this.prevBtn.update(mouse);
    this.todayBtn.update(mouse);
    this.nextBtn.update(mouse);
    this.logoutBtn.update(mouse);
    this.userBtn.label = R.auth?.email ?? "guest";
    this.userBtn.update(mouse);

    // ── pill click + hover ──
    if (this._pillRect) {
      const p = this._pillRect;
      const inPill = mouse.x > p.x && mouse.x < p.x + p.w &&
                     mouse.y > p.y && mouse.y < p.y + p.h;
      this._pillHoverLeft  = inPill && mouse.x <= p.x + p.half;
      this._pillHoverRight = inPill && mouse.x >  p.x + p.half;

      if (mouse.justPressed && inPill) {
        mouse.x > p.x + p.half
          ? this.commands.dataView()
          : this.commands.plannerView();
      }
    } else {
      this._pillHoverLeft  = false;
      this._pillHoverRight = false;
    }

    // ── overlays ──
    this.coachModal.update?.(mouse);
    this.dataView.update(mouse);

    // ── tray scroll ──
    if (this.tray.contains(mouse.x, mouse.y) && !R.interaction.drag.active) {
      if (mouse.wheelDelta !== 0) this.tray.scroll(mouse.wheelDelta);
    }

    // ── drag logic ──
    this._updateDrag(mouse);

    this.tray.update(mouse);
    this.grid.update(mouse);
    this.toaster.update();
    updateCoachFeedback();
  }

  _updateDrag(mouse) {
    const drag = R.interaction.drag;
    if (!drag.active) {
      drag.verdict = null;
      this._lastOverflow = false;
      return;
    }

    const targetX = drag.kind === "taskCard" ? drag.card.getDragX() : drag.ghostX;
    const targetY = drag.kind === "taskCard" ? drag.card.getDragY() : drag.ghostY;
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
    drag.verdict  = verdict;

    if (verdict?.level === "error" && verdict?.code === "DAY_OVERFLOW" && !drag._overflowToastFired) {
      drag._overflowToastFired = true;
      R.toast(verdict.message, "warning");
    }
    if (verdict?.code !== "DAY_OVERFLOW") drag._overflowToastFired = false;

    // ── slot highlights ──
    const blockSlots = new Set();
    if (nearest) {
      const duration = drag.kind === "taskCard"
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
        if (isSource) { slot.highlight = false; slot.highlightState = null; continue; }
        if (blockSlots.has(slot)) {
          slot.highlight      = true;
          slot.highlightState = verdict?.level === "error" ? "error"
                              : verdict?.level === "warning" ? "warning"
                              : "ok";
        } else {
          slot.highlight      = false;
          slot.highlightState = null;
        }
      }
    }
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(gMain, gOverlay) {
    if (!this.visible) return;

    // ── background ──
    gMain.push();
    gMain.fill("#0d0d1a");
    gMain.noStroke();
    gMain.rect(this.x, this.y, this.w, this.h, 16);
    gMain.pop();

    // ── top bar buttons ──
    this.prevBtn.render(gMain);
    this.todayBtn.render(gMain);
    this.nextBtn.render(gMain);
    this._renderViewPill(gMain);
    this.userBtn.render(gMain);
    this.logoutBtn.render(gMain);

    // ── DATA VIEW ──
    if (R.ui?.view === "data") {
      this.dataView.render(gMain);
      this._renderOverlays(gOverlay);
      return;
    }

    // ── PLANNER VIEW ──
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

    const activeCard = R.interaction.drag.kind === "taskCard"
      ? R.interaction.drag.card : null;

    this.tray.render(gMain, activeCard);
    this.grid.render(gMain);

    if (activeCard) activeCard.renderDrag(gOverlay, R.interaction.drag.tilt);
    HourSlot.renderDragGhost(gOverlay);
    this.tray.renderOverlay(gOverlay);
    this._renderOverlays(gOverlay);
  }

  _renderOverlays(gOverlay) {
    this.contextMenu.render(gOverlay);
    this.authModal.render(gOverlay);
    this.coachModal.render(gOverlay);
    this.toaster.render(gOverlay);
  }

  // ─────────────────────────────
  // PILL TOGGLE
  // ─────────────────────────────

  _renderViewPill(g) {
    const pad    = 20;
    const pillW  = 180;
    const pillH  = 30;
    const pillX  = this.x + pad + Math.min(180, this.w * 0.17) + pad + 42 + pad;
    const pillY  = this.y + 24;
    const half   = pillW / 2;
    const isData = R.ui?.view === "data";
    const color  = "#f5a52332";

    const m = this._pillMat;
    const stiffness = 0.2, damping = 0.3;

    m.plannerV = m.plannerV * damping + ((isData ? 0 : 1) - m.planner) * stiffness;
    m.planner += m.plannerV;
    m.dataV    = m.dataV    * damping + ((isData ? 1 : 0) - m.data)    * stiffness;
    m.data    += m.dataV;

    // planner side
    g.push();
    g.translate(pillX + half / 2, pillY + pillH / 2);
    renderMaterial(g, { w: half, h: pillH, color, materialProgress: m.planner, highlighted: false });
    g.pop();

    // data side
    g.push();
    g.translate(pillX + half + half / 2, pillY + pillH / 2);
    renderMaterial(g, { w: half, h: pillH, color, materialProgress: m.data, highlighted: false });
    g.pop();

    // border
    g.push();
    g.noFill();
    g.stroke("#ffffff18");
    g.strokeWeight(1);
    g.rect(pillX, pillY, pillW, pillH, 20);
    g.pop();

    // labels
    g.push();
    g.textAlign(g.CENTER, g.CENTER);
    g.textSize(18);
    const font = R.assets?.fonts?.["Bold"];
    if (font) g.textFont(font);
    g.fill(!isData ? "#ffffff" : this._pillHoverLeft  ? "#ffffffbb" : "#ffffff55");
    g.text("Planner", pillX + half / 2, pillY + pillH / 2);
    g.fill( isData  ? "#ffffff" : this._pillHoverRight ? "#ffffffbb" : "#ffffff55");
    g.text("Data", pillX + half + half / 2, pillY + pillH / 2);
    g.pop();

    this._pillRect = { x: pillX, y: pillY, w: pillW, h: pillH, half };
  }
}
