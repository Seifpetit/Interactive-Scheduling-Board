import { R } from "./runtime.js";

// ─────────────────────────────────────────────────────────────────────────────
// commands
// Every mutation of R.appState lives here.
// Every mutation also fires a fetch() to the backend — fire and forget.
// UI updates immediately (optimistic), backend catches up async.
// ─────────────────────────────────────────────────────────────────────────────

function _post(path, body) {
  fetch(path, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  }).catch(err => console.warn(`[api] POST ${path} failed:`, err));
}

function _patch(path, body) {
  fetch(path, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  }).catch(err => console.warn(`[api] PATCH ${path} failed:`, err));
}

function _delete(path) {
  fetch(path, { method: "DELETE" })
    .catch(err => console.warn(`[api] DELETE ${path} failed:`, err));
}

export const commands = {

  // ═══════════════════════════════════════
  // TASKS — direct calls
  // ═══════════════════════════════════════

  addTask(name) {
    R.appState.tasks ??= [];
    const task = {
      id:       "task_" + Date.now(),
      name,
      duration: 1,
      energy:   "medium",
      category: "other",
    };
    R.appState.tasks = [...R.appState.tasks, task];
    _post("/tasks", task);
  },

  // ═══════════════════════════════════════
  // TASKS — context menu actions (ref = TaskCard)
  // ═══════════════════════════════════════

  renameTask(ref, payload) {
    const name = payload?.trim();
    if (!name) return;
    const task = (R.appState.tasks ?? []).find(t => t.id === ref.task.id);
    if (!task) return;
    task.name = name;
    _patch(`/tasks/${task.id}`, { name });
  },

  setTaskDuration(ref, payload) {
    const n = Number(payload);
    if (!Number.isFinite(n) || n <= 0) return;
    const task = (R.appState.tasks ?? []).find(t => t.id === ref.task.id);
    if (!task) return;
    task.duration = n;
    _patch(`/tasks/${task.id}`, { duration: n });
  },

  setEnergyHigh(ref)   { this._setEnergy(ref, "high");   },
  setEnergyMedium(ref) { this._setEnergy(ref, "medium"); },
  setEnergyLow(ref)    { this._setEnergy(ref, "low");    },

  _setEnergy(ref, level) {
    const task = (R.appState.tasks ?? []).find(t => t.id === ref.task.id);
    if (!task) return;
    task.energy = level;
    _patch(`/tasks/${task.id}`, { energy: level });
  },

  setCategoryStudy(ref)   { this._setCategory(ref, "study");   },
  setCategoryGym(ref)     { this._setCategory(ref, "gym");     },
  setCategoryErrands(ref) { this._setCategory(ref, "errands"); },
  setCategoryWork(ref)    { this._setCategory(ref, "work");    },
  setCategoryHealth(ref)  { this._setCategory(ref, "health");  },
  setCategorySocial(ref)  { this._setCategory(ref, "social");  },
  setCategoryOther(ref)   { this._setCategory(ref, "other");   },

  _setCategory(ref, category) {
    const task = (R.appState.tasks ?? []).find(t => t.id === ref.task.id);
    if (!task) return;
    task.category = category;
    _patch(`/tasks/${task.id}`, { category });
  },

  removeTask(ref) {
    const id = ref.task.id;
    R.appState.tasks = (R.appState.tasks ?? []).filter(t => t.id !== id);
    const placements = R.appState.placements ?? {};
    for (const slotId in placements) {
      if (placements[slotId]?.taskId === id) delete placements[slotId];
    }
    _delete(`/tasks/${id}`); // cascade removes placements in DB
  },

  // ═══════════════════════════════════════
  // PLACEMENTS — context menu (ref = HourSlot)
  // ═══════════════════════════════════════

  unplace(ref) {
    const placements = R.appState.placements ?? {};
    delete placements[ref.slotId];
    _delete(`/placements/${ref.slotId}`);
  },

  // ═══════════════════════════════════════
  // PLACEMENTS — direct calls
  // ═══════════════════════════════════════

  place(taskId, slotId) {
    R.appState.placements ??= {};
    R.appState.placements[slotId] = { taskId };
    _post("/placements", { slotId, taskId });
  },

  movePlacement(fromSlotId, toSlotId) {
    const placements = R.appState.placements ?? {};
    const from = placements[fromSlotId];
    if (!from) return false;
    const to = placements[toSlotId];
    placements[toSlotId] = from;
    if (to) { placements[fromSlotId] = to; }
    else    { delete placements[fromSlotId]; }
    _post("/placements/move", { fromSlotId, toSlotId });
    return true;
  },

  clearDay(dayIndex) {
    const placements = R.appState.placements ?? {};
    for (const slotId in placements) {
      if (slotId.startsWith(`${dayIndex}_`)) {
        delete placements[slotId];
        _delete(`/placements/${slotId}`);
      }
    }
  },

  clearWeek() {
    const placements = R.appState.placements ?? {};
    for (const slotId in placements) {
      _delete(`/placements/${slotId}`);
    }
    R.appState.placements = {};
  },

};
