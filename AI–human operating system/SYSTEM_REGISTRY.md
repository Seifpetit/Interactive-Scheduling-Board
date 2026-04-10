# System Registry

## Global State Shape

```
R = {
  appState: {
    tasks:      [],          // { id, name, duration, energy, category }
    placements: {},          // { slotId: { taskId } }
  },

  interaction: {
    hovered:       null,     // { node, type }
    click:         null,     // "single" | "right" | null
    released:      false,
    drag: {
      active:       false,
      kind:         null,    // "taskCard" | "placedTask"
      card:         null,
      fromSlotId:   null,
      task:         null,
      ghostX:       0,
      ghostY:       0,
      ghostW:       0,
      ghostH:       0,
      offsetX:      0,
      offsetY:      0,
      tilt:         0,
      _tiltPrevX:   null,
      _nearestSlot: null,
    },
    hoveredTaskId:   null,
    restrictMode: {
      active:       false,
      employeeId:   null,
      selected:     null,
    },
  },

  input: {
    mouse: {
      x: 0, y: 0,
      isPressed: false,
      justPressed: false,
      justReleased: false,
      button: null,
      wheelDelta: 0,
    },
    keyboard: {
      key: null,
      justPressed: false,
    },
  },

  modal: {
    open:  false,
    type:  null,             // "coach" | null
    props: null,
  },

  assets: {
    fonts: {},
  },

  transition: {
    phase: "READY",          // "READY" | "TRANSITIONING"
  },

  toast: null,               // function attached by Planner — R.toast(msg, type, mode)
}
```

## Ownership Rules

- commands.js owns all writes to R.appState
- routeInput.js owns all writes to R.interaction.drag and R.interaction.hoveredTaskId
- captureInput.js owns all writes to R.input
- R.openModal / R.closeModal own writes to R.modal
- render files are read-only — no writes to R from any render call
- Planner.js owns slot.highlight and slot.highlightState — no other file sets these

## Read / Write Rules

- reads are explicit — always via R.appState, R.interaction etc
- writes follow ownership — no file writes outside its owned slice
- no hidden side effects — fetch calls live only in commands.js
- DataView derives from R.appState at render time — never caches derived state

## Architecture Invariants

- input → update → state → render — never reversed
- UINode tree is walked for hit testing — overlays outside the tree are checked manually first
- drag state is reset completely on every mouse release
- optimistic updates — R.appState mutates before fetch fires

## Shared Symbols

- R — global singleton
- commands — all state mutations
- UINode — base class for all interactive canvas elements
- CATEGORY_COLORS — shared color map, defined per file that needs it
- slotId format — "dayIndex_hour" e.g. "0_9" = Monday 9am

## Append Log


## Temporal Snapshot Shape

R.time = {
  now:               null,   // Date — set each frame by operator.js
  temporalSnapshot:  null,   // TemporalSnapshot — built by buildTemporalSnapshot(R)
}

TemporalSnapshot = {
  now:                Date,
  todayIndex:         number,          // 0=Mon … 6=Sun
  scrubberY01:        number,          // 0.0 (8am) → 1.0 (11pm)
  entries:            DecoratedEntry[],
  nextUpcomingSlotId: string | null,
}

DecoratedEntry = {
  slotId:    string,
  task:      Task,
  placement: Placement,
  dayIndex:  number,
  hour:      number,
  startDate: Date,
  endDate:   Date,
  state:     "future" | "upcoming" | "current" | "past",
  urgency01: number,   // 0.0–1.0, non-zero only when state === "upcoming"
}

## Ownership — temporal layer

- operator.js owns writes to R.time (sets now + temporalSnapshot each frame)
- temporalModel.js is pure derivation — reads R, writes nothing
- render modules consume R.time.temporalSnapshot read-only

## ReturnDelta Shape

ReturnDelta = {
  now:                Date,
  lastSeen:           Date | null,
  timeAwayMs:         number,
  crossedIntoPast:    slotId[],     // were future/upcoming, now past
  crossedIntoCurrent: slotId[],     // were future/upcoming, now current
  nowMissed:          slotId[],     // subset of crossedIntoPast with no review
  upcomingHotSlotId:  string | null,
  hasChanges:         boolean,
}

// Stored at R.time.sessionDelta — written once on boot by boot.js
// Read by Toaster and any return-delta UI consumers


## operator.js temporal integration

- R.time.now and R.time.temporalSnapshot are set at the top of updateFrame before captureInput
- timeScrubber and upcomingPulse are registered in UI_ELEMENTS and instantiated in initUI
- saveSessionSeenNow is wired to visibilitychange in initUI — fires once on page hide
- renderFrame must call timeScrubber.render(gOverlay, grid) and upcomingPulse.render(gOverlay, grid) — wiring belongs to render.js cycle