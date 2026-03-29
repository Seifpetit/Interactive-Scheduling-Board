import { R } from "./runtime.js";

const STORAGE_KEY = "planner_coach_feedback_v1";
const REVIEW_LOOKBACK_HOURS = 48;

let _metaCache = null;
let _promptLock = false;
let _lastSweepAt = 0;

function _now() {
  return new Date();
}

function _loadMeta() {
  if (_metaCache) return _metaCache;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _metaCache = raw ? JSON.parse(raw) : {};
  } catch {
    _metaCache = {};
  }

  return _metaCache;
}

function _saveMeta() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_metaCache ?? {}));
  } catch {
    // ignore localStorage issues for now
  }
}

function _getMeta(slotId) {
  const meta = _loadMeta();
  meta[slotId] ??= {
    startPrompted: false,
    reviewed: false,
    review: null,
  };
  return meta[slotId];
}

function _patchMeta(slotId, patch) {
  const meta = _getMeta(slotId);
  Object.assign(meta, patch);
  _saveMeta();
}

function _getTaskById(taskId) {
  return (R.appState?.tasks ?? []).find(t => t.id === taskId) ?? null;
}

function _getEffectiveDuration(placement, task) {
  return placement?.customDuration ?? task?.duration ?? 1;
}

function _parseSlotDate(slotId) {
  const d = new Date(slotId);
  return Number.isNaN(d.getTime()) ? null : d;
}

function _getPlacementEntries() {
  const placements = R.appState?.placements ?? {};
  return Object.entries(placements)
    .map(([slotId, placement]) => {
      const task = _getTaskById(placement.taskId);
      const start = _parseSlotDate(slotId);
      if (!task || !start) return null;

      const duration = _getEffectiveDuration(placement, task);
      const end = new Date(start);
      end.setHours(end.getHours() + duration);

      return { slotId, placement, task, start, end, duration };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

function _shouldSweep() {
  const nowMs = Date.now();
  if (nowMs - _lastSweepAt < 20_000) return false; // every 20s max
  _lastSweepAt = nowMs;
  return true;
}

function _showStartToast(entry) {
  const message = `Time to start: ${entry.task.name}`;
  R.toast?.(message, "info");
  _patchMeta(entry.slotId, { startPrompted: true });
}

function _askReview(entry) {
  if (_promptLock) return;
  _promptLock = true;

  const title = entry.task.name;
  const scheduledLabel = `${entry.start.toLocaleString()} → ${entry.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  const didIt = window.prompt(
    `Coach check-in\n\n${title}\n${scheduledLabel}\n\nDid you do it?\nType: yes / partial / no`
  );

  if (didIt === null) {
    _promptLock = false;
    return;
  }

  const normalized = didIt.trim().toLowerCase();

  if (normalized === "no") {
    const why = window.prompt(
      `Why not?\n\nExamples:\n- too tired\n- forgot\n- something else came up\n- avoided it`
    );

    _patchMeta(entry.slotId, {
      reviewed: true,
      review: {
        outcome: "no",
        why: why?.trim() || "",
        reviewedAt: new Date().toISOString(),
      },
    });

    _promptLock = false;
    return;
  }

  if (normalized === "yes" || normalized === "partial") {
    const onTime = window.prompt(
      `Did you start within ±15 min?\nType: yes / late / early`
    );

    const actualMinutesRaw = window.prompt(
      `How much time did it take?\nEnter minutes (example: 45)`
    );

    const effortRaw = window.prompt(
      `How much effort?\nEnter 1 to 5`
    );

    const actualMinutes = Number(actualMinutesRaw);
    const effort = Number(effortRaw);

    _patchMeta(entry.slotId, {
      reviewed: true,
      review: {
        outcome: normalized,
        onTime: onTime?.trim().toLowerCase() || "",
        actualMinutes: Number.isFinite(actualMinutes) ? actualMinutes : null,
        effort: Number.isFinite(effort) ? effort : null,
        reviewedAt: new Date().toISOString(),
      },
    });

    _promptLock = false;
    return;
  }

  // invalid input → don’t mark reviewed, ask later again
  _promptLock = false;
}

function _runLiveCoach(entries, now) {
  for (const entry of entries) {
    const meta = _getMeta(entry.slotId);

    if (!meta.startPrompted && now >= entry.start && now < entry.end) {
      _showStartToast(entry);
      return; // one at a time
    }
  }
}

function _runRetroCoach(entries, now) {
  const lookback = new Date(now);
  lookback.setHours(lookback.getHours() - REVIEW_LOOKBACK_HOURS);

  for (const entry of entries) {
    const meta = _getMeta(entry.slotId);

    if (meta.reviewed) continue;
    if (entry.end > now) continue;
    if (entry.end < lookback) continue;

    _askReview(entry);
    return; // one at a time
  }
}

export function updateCoachFeedback() {
  if (R.transition?.phase !== "READY") return;
  if (!_shouldSweep()) return;
  if (R.interaction?.drag?.active) return;

  const entries = _getPlacementEntries();
  if (!entries.length) return;

  const now = _now();

  _runLiveCoach(entries, now);
  if (_promptLock) return;

  _runRetroCoach(entries, now);
}

export function resetCoachFeedbackForSlot(slotId) {
  const meta = _loadMeta();
  delete meta[slotId];
  _saveMeta();
}

export function resetAllCoachFeedback() {
  _metaCache = {};
  _saveMeta();
}