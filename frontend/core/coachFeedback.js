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

  R.openModal("coach", {
    entry,
    onComplete: (answers) => {
      const outcome = answers.outcome;

      if (outcome === "no") {
        _patchMeta(entry.slotId, {
          reviewed: true,
          review: {
            outcome: "no",
            why: answers.why ?? "",
            reviewedAt: new Date().toISOString(),
          },
        });
      } else {
        _patchMeta(entry.slotId, {
          reviewed: true,
          review: {
            outcome,
            onTime:        answers.onTime    ?? null,
            actualMinutes: answers.duration  ?? null,
            effort:        answers.effort    ?? null,
            reviewedAt:    new Date().toISOString(),
          },
        });
      }

      _promptLock = false;
    },
  });
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