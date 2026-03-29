import { R } from "./runtime.js";

export const VERDICT_COLORS = {
  ok:       "#27ae60",
  warning:  "#f5a623",
  error:    "#e2621d",
  neutral:  "#58e6fc",
};

function getTaskById(taskId) {
  return (R.appState?.tasks ?? []).find(t => t.id === taskId) ?? null;
}

function getPlacementDuration(placement, task) {
  return placement?.customDuration ?? task?.duration ?? 1;
}

function parseSlotId(slotId) {
  const d = new Date(slotId);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addHours(date, hours) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

export function getPlacementRange(slotId, placement) {
  const start = parseSlotId(slotId);
  if (!start || !placement) return null;

  const task = getTaskById(placement.taskId);
  if (!task) return null;

  const duration = getPlacementDuration(placement, task);
  const end = addHours(start, duration);

  return { start, end, duration, task, placement };
}

export function getProposedPlacementRange(task, targetSlotId, customDuration = null) {
  const start = parseSlotId(targetSlotId);
  if (!start || !task) return null;

  const duration = customDuration ?? task?.duration ?? 1;
  const end = addHours(start, duration);

  return { start, end, duration, task };
}

export function validatePlacement({
  task,
  targetSlotId,
  sourceSlotId = null,
  customDuration = null,
}) {
  if (!task || !targetSlotId) {
    return {
      ok: false,
      level: "error",
      code: "INVALID_INPUT",
      message: "Missing task or target slot",
    };
  }

  const proposed = getProposedPlacementRange(task, targetSlotId, customDuration);
  if (!proposed) {
    return {
      ok: false,
      level: "error",
      code: "INVALID_SLOT",
      message: "Invalid target slot",
    };
  }

  // Rule 1: overflow outside visible day
  const startHour = proposed.start.getHours();
  const endHour = startHour + proposed.duration;
  if (endHour > 23) {
    return {
      ok: false,
      level: "error",
      code: "DAY_OVERFLOW",
      message: "Task exceeds available space in this day",
    };
  }

  // Rule 2: collision with other placed tasks
  const placements = R.appState?.placements ?? {};

  for (const [slotId, placement] of Object.entries(placements)) {
    if (slotId === sourceSlotId) continue;

    const existing = getPlacementRange(slotId, placement);
    if (!existing) continue;

    if (rangesOverlap(proposed.start, proposed.end, existing.start, existing.end)) {
      return {
        ok: false,
        level: "error",
        code: "OVERLAP",
        message: `Conflicts with "${existing.task.name}"`,
      };
    }
  }

  // Rule 3: daily load warning
  const dayStart = new Date(proposed.start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  let totalHours = proposed.duration;

  for (const [slotId, placement] of Object.entries(placements)) {
    if (slotId === sourceSlotId) continue;

    const existing = getPlacementRange(slotId, placement);
    if (!existing) continue;

    if (existing.start >= dayStart && existing.start < dayEnd) {
      totalHours += existing.duration;
    }
  }

  if (totalHours > 8) {
    return {
      ok: true,
      level: "warning",
      code: "HEAVY_DAY",
      message: `Heavy day: ${totalHours}h scheduled`,
    };
  }

  return {
    ok: true,
    level: "ok",
    code: "VALID",
    message: "Placement valid",
  };
}

export function getDragVerdict() {
  const drag = R.interaction.drag;
  if (!drag.active || !drag._nearestSlot) return null;

  const targetSlotId = drag._nearestSlot.slotId;

  if (drag.kind === "taskCard" && drag.card?.task) {
    return validatePlacement({
      task: drag.card.task,
      targetSlotId,
    });
  }

  if (drag.kind === "placedTask" && drag.task) {
    return validatePlacement({
      task: drag.task,
      targetSlotId,
      sourceSlotId: drag.fromSlotId,
      customDuration: drag.customDuration ?? null,
    });
  }

  return null;
}