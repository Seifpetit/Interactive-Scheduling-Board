// core/time/temporalModel.js
// Pure derivation — no side effects, no R writes.
// Computes the full temporal snapshot from R.appState and real-world time.
// Called once per frame by operator.js → stored in R.time.temporalSnapshot.

import { getUrgency01 } from "./timeSignals.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─────────────────────────────────────────────────────────────────────────────
// buildTemporalSnapshot
// Master entry point. Returns a full snapshot consumed by render modules.
// ─────────────────────────────────────────────────────────────────────────────

export function buildTemporalSnapshot(R) {
  const now        = new Date();
  const tasks      = R.appState?.tasks      ?? [];
  const placements = R.appState?.placements ?? {};

  const entries   = _collectEntries(placements, tasks, now);

  // decorated FIRST
  const decorated = entries.map(entry => {
    const state     = _getTemporalState(entry, now);
    const urgency01 = state === "upcoming"
      ? getUrgency01(_minutesUntil(entry.startDate, now), 90)
      : 0;
    return { ...entry, state, urgency01 };
  });

  const todayIndex   = _getTodayColumnIndex(now);
  const scrubberY01  = _getScrubberProgress(now);

  // _getNextUpcoming AFTER decorated
  const nextUpcoming = _getNextUpcoming(decorated);

  return {
    now,
    todayIndex,
    scrubberY01,
    entries:            decorated,
    nextUpcomingSlotId: nextUpcoming?.slotId ?? null,
  };
}
// ─────────────────────────────────────────────────────────────────────────────
// _collectEntries
// Turns placements dict into a structured array with real Date objects.
// Handles two slotId formats:
//   Legacy ISO: "2026-04-10T16:00" — parse directly as a Date
//   Current:    "dayIndex_hour" e.g. "4_16" — anchor to current week Monday
// ─────────────────────────────────────────────────────────────────────────────

function _collectEntries(placements, tasks, now) {
  const entries  = [];
  const weekStart = _getWeekStart(now);

  for (const [slotId, placement] of Object.entries(placements)) {
    const task = tasks.find(t => t.id === placement.taskId);
    if (!task) continue;

    let startDate, endDate, dayIndex, hour;

    if (slotId.includes("T") || slotId.includes("-")) {
      // ── legacy ISO format: "2026-04-10T16:00" ──
      startDate = new Date(slotId);
      if (isNaN(startDate.getTime())) continue;
      hour      = startDate.getHours();
      // derive dayIndex from day of week (Mon=0)
      dayIndex  = (startDate.getDay() + 6) % 7;
      endDate   = new Date(startDate);
      endDate.setHours(hour + (task.duration ?? 1), 0, 0, 0);

    } else {
      // ── current format: "dayIndex_hour" ──
      const parts = slotId.split("_");
      dayIndex    = parseInt(parts[0]);
      hour        = parseInt(parts[1]);
      if (isNaN(dayIndex) || isNaN(hour)) continue;

      startDate = new Date(weekStart);
      startDate.setDate(weekStart.getDate() + dayIndex);
      startDate.setHours(hour, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setHours(hour + (task.duration ?? 1), 0, 0, 0);
    }

    entries.push({ slotId, task, placement, dayIndex, hour, startDate, endDate });
  }

  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// _getTemporalState
// Returns one of: "future" | "upcoming" | "current" | "past" | "missed"
// "missed" = past and unreviewed — for now same as past (coach layer adds nuance later)
// ─────────────────────────────────────────────────────────────────────────────

function _getTemporalState(entry, now) {
  const { startDate, endDate } = entry;

  if (now >= startDate && now < endDate)     return "current";
  if (now < startDate) {
    const mins = _minutesUntil(startDate, now);
    if (mins <= 90)                          return "upcoming";
    return "future";
  }
  // past
  return "past";
}

// ─────────────────────────────────────────────────────────────────────────────
// _getTodayColumnIndex
// Returns 0–6 for Mon–Sun matching your grid's dayIndex convention.
// JS getDay() returns 0=Sun, so we rotate.
// ─────────────────────────────────────────────────────────────────────────────

function _getTodayColumnIndex(now) {
  return (now.getDay() + 6) % 7; // Mon=0 … Sun=6
}

// ─────────────────────────────────────────────────────────────────────────────
// _getScrubberProgress
// Returns 0.0–1.0 representing position of current time within the visible
// day range (START_HOUR=8 to END_HOUR=23).
// ─────────────────────────────────────────────────────────────────────────────

const START_HOUR = 8;
const END_HOUR   = 23;

function _getScrubberProgress(now) {
  const totalMinutes   = (END_HOUR - START_HOUR) * 60;
  const elapsedMinutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  return Math.max(0, Math.min(1, elapsedMinutes / totalMinutes));
}

// ─────────────────────────────────────────────────────────────────────────────
// _getNextUpcoming
// Returns the single nearest upcoming/current entry, or null.
// ─────────────────────────────────────────────────────────────────────────────

function _getNextUpcoming(entries) {
  const candidates = entries
    .filter(e => e.state === "upcoming" || e.state === "current")
    .sort((a, b) => a.startDate - b.startDate);
  return candidates[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// _getWeekStart
// Returns the Monday of the week containing `date`.
// ─────────────────────────────────────────────────────────────────────────────

function _getWeekStart(date) {
  const d   = new Date(date);
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day; // shift Sun back 6, others forward to Mon
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// _minutesUntil
// ─────────────────────────────────────────────────────────────────────────────

function _minutesUntil(targetDate, now) {
  return (targetDate - now) / 60000;
}
