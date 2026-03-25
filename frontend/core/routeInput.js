import { R }              from "./runtime.js";
import { UI_ELEMENTS }   from "./operator.js";
import { commands }      from "./commands.js";
import { beginTransition } from "./operator.js";

export function routeInput() {
  if (R.transition.phase !== "READY") return;

  const { hovered, click, released } = R.interaction;
  const mouse = R.input.mouse;

  // tilt + drag position update every frame while drag is active
  if (R.interaction.drag.active) {
    _updateDragTilt(mouse);

    if (R.interaction.drag.kind === "taskCard") {
      R.interaction.drag.card?.updateDrag(mouse);
    }

    if (R.interaction.drag.kind === "placedTask") {
      R.interaction.drag.ghostX = mouse.x - R.interaction.drag.offsetX;
      R.interaction.drag.ghostY = mouse.y - R.interaction.drag.offsetY;
    }
  }

  if (hovered)             _onHover(hovered, mouse);
  if (click === "single")  _onClick(hovered, mouse);
  if (click === "right")   _onRightClick(hovered, mouse);
  if (released)            _onRelease(hovered, mouse);
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAG TILT
// ─────────────────────────────────────────────────────────────────────────────

function _updateDragTilt(mouse) {
  const drag      = R.interaction.drag;
  const prevX     = drag._tiltPrevX ?? mouse.x;
  const velocityX = mouse.x - prevX;
  drag._tiltPrevX = mouse.x;
  const maxTilt   = 0.12;
  const target    = Math.max(-maxTilt, Math.min(maxTilt, velocityX * 0.018));
  drag.tilt      += (target - drag.tilt) * 0.15;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOVER
// ─────────────────────────────────────────────────────────────────────────────

function _onHover({ type, node }, mouse) {

  const planner = UI_ELEMENTS.planner;
  const tray    = planner?.tray;
  const ctx     = planner?.contextMenu;

  if (ctx?.visible) {
    if (ctx.hitTest(mouse.x, mouse.y)) { ctx.onHover(mouse.x, mouse.y); return; }
  }

  if (type === "taskCard")      { tray?.onHoverCard(node);   return; }
  if (type === "addTaskButton") { tray?.onHoverAddBtn(node); return; }

  // highlight drop target while any drag is active
  if (R.interaction.drag.active &&
     (type === "hourSlot" || type === "placedTask")) {
    node.highlight = true;
    if (!node.pulseTriggered) node.triggerPulse();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEFT CLICK
// ─────────────────────────────────────────────────────────────────────────────

function _onClick(hovered, mouse) {
  const planner = UI_ELEMENTS.planner;
  const tray    = planner?.tray;
  const ctx     = planner?.contextMenu;

  // click anywhere while menu open → close it
  if (ctx?.visible) {
    if (ctx.hitTest(mouse.x, mouse.y)) { ctx.onClick(mouse.x, mouse.y); return; }
    ctx.close();
  }

  if (!hovered) {
    tray?.addInput?.cancel();
    return;
  }

  const { type, node } = hovered;

  if (type === "addTaskButton") {
    tray?.openAddInput();
    return;
  }

  // start tray card drag
  if (type === "taskCard") {
    tray?.addInput?.cancel();
    node.startDrag(mouse, tray.x, tray.y, tray.scrollY);
    const drag      = R.interaction.drag;
    drag.active     = true;
    drag.kind       = "taskCard";
    drag.card       = node;
    drag.tilt       = 0;
    drag._tiltPrevX = mouse.x;
    return;
  }

  // start placed-task drag
  if (type === "placedTask") {
    tray?.addInput?.cancel();
    const drag      = R.interaction.drag;
    drag.active     = true;
    drag.kind       = "placedTask";
    drag.card       = null;
    drag.fromSlotId = node.slotId;
    drag.task       = R.appState.tasks?.find(t => t.id === node.getPlacement()?.taskId) ?? null;
    drag.ghostX     = node.x;
    drag.ghostY     = node.y;
    drag.ghostW     = node.w;
    drag.ghostH     = node._blockHeight(drag.task?.duration ?? 1);
    drag.offsetX    = mouse.x - node.x;
    drag.offsetY    = mouse.y - node.y; // node = start slot, ghost anchored to top
    drag.tilt       = 0;
    drag._tiltPrevX = mouse.x;
    return;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RIGHT CLICK
// ─────────────────────────────────────────────────────────────────────────────

function _onRightClick(hovered, mouse) {
  const ctx = UI_ELEMENTS.planner?.contextMenu;
  if (!ctx) return;

  // right-click on nothing → close any open menu
  if (!hovered) { ctx.close(); return; }

  const { type, node } = hovered;

  // tray card → TASK_CARD menu, ref = TaskCard instance
  if (type === "taskCard") {
    ctx.open({ x: mouse.x, y: mouse.y, type: "TASK_CARD", ref: node });
    return;
  }

  // placed task on calendar → PLACED_TASK menu, ref = HourSlot instance
  if (type === "placedTask") {
    ctx.open({ x: mouse.x, y: mouse.y, type: "PLACED_TASK", ref: node });
    return;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RELEASE
// ─────────────────────────────────────────────────────────────────────────────

function _onRelease(hovered, mouse) {
  const drag = R.interaction.drag;
  if (!drag.active) return;

  const grid = UI_ELEMENTS.planner?.grid;

  // tray card dropped onto calendar
  if (drag.kind === "taskCard" && drag.card) {
    const slot = grid?.findNearestSlot(
      drag.card.getDragX() + drag.card.w / 2,
      drag.card.getDragY() + drag.card.h / 2
    );
    if (slot) {
      commands.place(drag.card.task.id, slot.slotId);
      slot.triggerPulse();
    }
    drag.card.stopDrag();
  }

  // placed task dragged to another slot
  if (drag.kind === "placedTask" && drag.fromSlotId) {
    const slot = grid?.findNearestSlot(
      drag.ghostX + drag.ghostW / 2,
      drag.ghostY + drag.ghostH * 0.1
    );
    if (slot && slot.slotId !== drag.fromSlotId) {
      commands.movePlacement(drag.fromSlotId, slot.slotId);
      slot.triggerPulse();
    }
    // dropped nowhere valid → stays in original slot, no command needed
  }

  // reset all drag state
  drag.active       = false;
  drag.kind         = null;
  drag.card         = null;
  drag.fromSlotId   = null;
  drag.task         = null;
  drag.ghostX       = 0;
  drag.ghostY       = 0;
  drag.ghostW       = 0;
  drag.ghostH       = 0;
  drag.offsetX      = 0;
  drag.offsetY      = 0;
  drag._nearestSlot = null;
  drag.tilt         = 0;
  drag._tiltPrevX   = null;
}
