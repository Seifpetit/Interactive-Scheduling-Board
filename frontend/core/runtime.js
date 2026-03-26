export function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun, 1 Mon
  const diff = day === 0 ? -6 : 1 - day; // move to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const R = {

  appState: {},

  calendar: {
    currentWeekStart: startOfWeek(new Date()),
  },

  // ─────────────────────────────────────────
  // INPUT  (written by captureInput)
  // ─────────────────────────────────────────
  input: {
    mouse: {
      x: 0, y: 0,
      pressed: false, prevPressed: false,
      justPressed: false, justReleased: false,
      wheelDelta: 0,
      rightPressed: false, prevRightPressed: false,
      justRightClicked: false,
    },
    keyboard: {
      pressed: false, prevPressed: false,
      justPressed: false, justReleased: false,
      key: null, code: null,
      shift: false, ctrl: false, alt: false,
    },
    touch: {},
  },

  // ─────────────────────────────────────────
  // INTERACTION  (written by resolveHit + routeInput)
  // ─────────────────────────────────────────
  interaction: {
    hovered:  null,
    click:    null,
    released: false,

    restrictMode: {
      active:         false,
      employeeId:     null,
      selected:       null,
      _lastToggled:   null,
      _didDragSelect: false,
    },

    drag: {
      active:       false,

      kind:         null,   // "taskCard" | "placedTask"
      card:         null,
      sourceSlot:   null,

      _nearestSlot: null,
      offsetX:      0,
      offsetY:      0,

      tilt:         0,
      _tiltPrevX:   null,

      verdict:      null,
    },
  },

  // ─────────────────────────────────────────
  // TRANSITION  (written by operator.beginTransition)
  // ─────────────────────────────────────────
  transition: {
    phase:     "BOOTING",
    progress:  0,
    fadeAlpha: 1,
    message:   "",
    error:     "",
  },

  // ─────────────────────────────────────────
  // REACTIONS  (written by reactionFeedback)
  // ─────────────────────────────────────────
  reactions: {},

  // ─────────────────────────────────────────
  // GEOMETRY / UI / ASSETS
  // ─────────────────────────────────────────
  geometry: { window: {}, schedule: {} },

  ui: { root: null },

  assets: { fonts: {} },

};