// core/time/sessionDelta.js
// Session-to-session memory — detects what changed while the user was away.
// Reads from localStorage. Writes to localStorage.
// Called once on boot by boot.js after loadState resolves.
// Result stored in R.time.sessionDelta by the caller.
// Does not import R — receives appState as a plain argument to stay pure.

const STORAGE_KEY = "planner_last_seen_at_v1";

const START_HOUR = 8;
const END_HOUR   = 23;

// ─────────────────────────────────────────────────────────────────────────────
// loadLastSeenAt
// Returns ISO string from localStorage, or null if first visit.
// ─────────────────────────────────────────────────────────────────────────────

export function loadLastSeenAt() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// saveSessionSeenNow
// Stamps current time into localStorage.
// Called on boot and on page hide.
// ─────────────────────────────────────────────────────────────────────────────

export function saveSessionSeenNow() {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    // localStorage unavailable — silent fail, feature degrades gracefully
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// computeReturnDelta
// Compares placement states at lastSeenAt vs now.
// Returns a ReturnDelta describing what the board experienced while user was away.
//
// appState = { tasks: [], placements: {} }
// lastSeenAtISO = ISO string | null
// ─────────────────────────────────────────────────────────────────────────────

export function computeReturnDelta(appState, lastSeenAtISO) {
  const now         = new Date();
  const lastSeen    = lastSeenAtISO ? new Date(lastSeenAtISO) : null;
  const timeAwayMs  = lastSeen ? now - lastSeen : 0;

  // first visit or same session — no delta to compute
  if (!lastSeen || timeAwayMs < 60_000) {
    return _emptyDelta(now, timeAwayMs);
  }

  const tasks      = appState?.tasks      ?? [];
  const placements = appState?.placements ?? {};
  const weekStart  = _getWeekStart(now);

  const crossedIntoPast  = [];
  const crossedIntoCurrent = [];
  const nowMissed        = [];

  for (const [slotId, placement] of Object.entries(placements)) {
    const task = tasks.find(t => t.id === placement.taskId);
    if (!task) continue;

    const { startDate, endDate } = _resolveDates(slotId, task, weekStart);
    if (!startDate) continue;

    const stateThen = _classifyAt(startDate, endDate, lastSeen);
    const stateNow  = _classifyAt(startDate, endDate, now);

    if (stateThen !== stateNow) {
      if (stateNow === "past" || stateNow === "missed") {
        crossedIntoPast.push(slotId);
        if (stateNow === "missed") nowMissed.push(slotId);
      }
      if (stateNow === "current") {
        crossedIntoCurrent.push(slotId);
      }
    }
  }

  // find the single most urgent upcoming slot right now
  const upcomingHot = _findNextUpcoming(placements, tasks, weekStart, now);

  return {
    now,
    lastSeen,
    timeAwayMs,
    crossedIntoPast,
    crossedIntoCurrent,
    nowMissed,
    upcomingHotSlotId: upcomingHot,
    hasChanges: crossedIntoPast.length > 0 || crossedIntoCurrent.length > 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function _classifyAt(startDate, endDate, at) {
  if (at >= startDate && at < endDate) return "current";
  if (at < startDate) {
    const mins = (startDate - at) / 60000;
    return mins <= 90 ? "upcoming" : "future";
  }
  return "past";
}

function _resolveDates(slotId, task, weekStart) {
  const parts    = slotId.split("_");
  const dayIndex = parseInt(parts[0]);
  const hour     = parseInt(parts[1]);
  if (isNaN(dayIndex) || isNaN(hour)) return {};

  const startDate = new Date(weekStart);
  startDate.setDate(weekStart.getDate() + dayIndex);
  startDate.setHours(hour, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setHours(hour + (task.duration ?? 1), 0, 0, 0);

  return { startDate, endDate };
}

function _findNextUpcoming(placements, tasks, weekStart, now) {
  let best = null;
  let bestMs = Infinity;

  for (const [slotId, placement] of Object.entries(placements)) {
    const task = tasks.find(t => t.id === placement.taskId);
    if (!task) continue;
    const { startDate } = _resolveDates(slotId, task, weekStart);
    if (!startDate) continue;
    const ms = startDate - now;
    if (ms >= 0 && ms < bestMs) { bestMs = ms; best = slotId; }
  }
  return best;
}

function _getWeekStart(date) {
  const d   = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day === 0) ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function _emptyDelta(now, timeAwayMs) {
  return {
    now,
    lastSeen:          null,
    timeAwayMs,
    crossedIntoPast:   [],
    crossedIntoCurrent:[],
    nowMissed:         [],
    upcomingHotSlotId: null,
    hasChanges:        false,
  };
}