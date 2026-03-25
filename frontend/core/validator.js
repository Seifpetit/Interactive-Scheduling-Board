import { R } from "./runtime.js";

export const VERDICT_COLORS = {
  valid:       "#92ba00",
  locked:      "#e2621d",
  restricted:  "#fba700",
  double:      "#9b59b6",
  neutral:     "#58e6fc",
};

export function getAssignmentVerdict(employeeId, targetSlotId) {
  if (!employeeId || !targetSlotId) return "neutral";

  const state = R.appState;

  // 1. Locked
  if (state.slotLocks?.[targetSlotId]) return "locked";

  // 2. Slot-level restriction
  const empRestrictions = state.restrictions?.[employeeId];
  if (empRestrictions?.includes(targetSlotId)) return "restricted";

  // 3. Double-booking — same day, different slot
  const [dayStr] = targetSlotId.split("_");
  const dayIndex = parseInt(dayStr, 10);
  const assignments = state.draft?.assignments ?? {};
  const alreadyOnDay = Object.entries(assignments).some(([slotId, empId]) => {
    if (empId !== employeeId) return false;
    if (slotId === targetSlotId) return false;
    return parseInt(slotId.split("_")[0], 10) === dayIndex;
  });
  if (alreadyOnDay) return "double";

  return "valid";
}

export function getDragVerdict() {
  const drag = R.interaction.drag;
  if (!drag.active || !drag._nearestSlot) return null;

  const targetSlotId = drag._nearestSlot.slotId;

  if (drag.kind === "card" && drag.card) {
    return getAssignmentVerdict(drag.card.employee.id, targetSlotId);
  }

  if (drag.kind === "slot" && drag.sourceSlot) {
    const empId = R.appState.draft?.assignments?.[drag.sourceSlot.slotId];
    if (!empId) return null;
    return getAssignmentVerdict(empId, targetSlotId);
  }

  return null;
}
