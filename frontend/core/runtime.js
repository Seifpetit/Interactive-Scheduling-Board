export const R = {

  appState: {},

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
    hovered:  null,       // { type, element, ref }
    click:    null,       // null | "single" | "double"
    released: false,

    // Restriction selection mode — active while user picks slots to restrict
    restrictMode: {
      active:       false,
      employeeId:   null,
      selected:     null,   // Set<slotId> — built fresh when mode opens
      _lastToggled:   null,   // prevents rapid re-toggle on same slot during drag
      _didDragSelect: false,  // true if drag-select fired this gesture — suppresses click toggle
    },
    drag: {
      active:       false,

      // source — only one is set at a time
      kind:         null,   // "card" | "slot"
      card:         null,   // EmployeeCard (kind === "card")
      sourceSlot:   null,   // SlotRow      (kind === "slot")

      // shared
      _nearestSlot: null,   // SlotRow currently closest to cursor
      offsetX:      0,      // cursor offset from drag origin
      offsetY:      0,

      // tilt — continuous velocity-based rotation, read by all ghost renders
      tilt:         0,      // current rotation in radians
      _tiltPrevX:   null,   // previous cursor x for velocity calc

      // verdict — computed each frame by getDragVerdict(), read by SlotRow.render
      verdict:      null,   // null | "valid" | "locked" | "unqualified" | "double" | "neutral"
    },
  },

  // ─────────────────────────────────────────
  // TRANSITION  (written by operator.beginTransition)
  // ─────────────────────────────────────────
  transition: {
    phase:     "BOOTING",  // "BOOTING" | "READY" | "FETCHING" | "ERROR"
    progress:  0,          // 0→1, reported by async work via setProgress()
    fadeAlpha: 1,          // 1 = black overlay, ticks to 0 after transition
    message:   "",         // shown during FETCHING
    error:     "",         // shown during ERROR
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
