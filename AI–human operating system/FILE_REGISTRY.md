# File Registry

## Entry Format

### file: <path>

- responsibility:
- imports:
- exports:
- reads:
- writes:
- key_symbols:
- dependencies:

---

## Entries

### file: core/runtime.js

- responsibility: global singleton R — all shared state, input, interaction, assets, modal
- imports: none
- exports: R
- reads: nothing
- writes: initial shape only at module load
- key_symbols: R, R.appState, R.interaction, R.input, R.assets, R.modal, R.toast
- dependencies: none

---

### file: core/commands.js

- responsibility: all mutations of R.appState, all fetch calls to backend
- imports: R
- exports: commands
- reads: R.appState.tasks, R.appState.placements
- writes: R.appState.tasks, R.appState.placements
- key_symbols: addTask, removeTask, renameTask, place, unplace, movePlacement, clearDay, clearWeek
- dependencies: runtime.js

---

### file: core/routeInput.js

- responsibility: routes input events to correct handlers based on hovered node type and drag state
- imports: R, UI_ELEMENTS, commands
- exports: routeInput
- reads: R.interaction.hovered, R.interaction.drag, R.input.mouse
- writes: R.interaction.drag, R.interaction.hoveredTaskId
- key_symbols: routeInput, _onClick, _onRightClick, _onHover, _onRelease
- dependencies: runtime.js, operator.js, commands.js

---

### file: core/loadState.js

- responsibility: fetches /state on boot, populates R.appState
- imports: R
- exports: loadState
- reads: nothing
- writes: R.appState.tasks, R.appState.placements
- key_symbols: loadState
- dependencies: runtime.js

---

### file: planner/Planner.js

- responsibility: root UINode — owns tray, grid, context menu, toaster, layout, drag highlight logic
- imports: UINode, TaskTray, WeekGrid, HourSlot, ContextMenuController, Toaster, R
- exports: Planner
- reads: R.interaction.drag, R.appState
- writes: slot.highlight, slot.highlightState, drag._nearestSlot, R.toast
- key_symbols: Planner, layout, update, render
- dependencies: TaskTray.js, WeekGrid.js, HourSlot.js, ContextMenuController.js, Toaster.js

---

### file: UI_Elements/cards/HourSlot.js

- responsibility: one hour block — renders placed task block with duration spanning, handles hit testing
- imports: UINode, R
- exports: HourSlot
- reads: R.appState.placements, R.appState.tasks, R.interaction.drag, R.interaction.hoveredTaskId
- writes: this.hitType, this._startSlot
- key_symbols: HourSlot, getPlacement, _getOwningPlacement, _blockHeight, renderDragGhost
- dependencies: UINode.js, runtime.js

---

### file: UI_Elements/overlays/DataView.js

- responsibility: full-screen stats overlay — derives and renders weekly analytics from R.appState
- imports: UINode, R
- exports: DataView
- reads: R.appState.tasks, R.appState.placements, R.assets.fonts
- writes: nothing
- key_symbols: DataView, derive, render, _renderStats, _renderBarChart
- dependencies: UINode.js, runtime.js

---

### file: UI_Elements/overlays/CoachModal.js

- responsibility: step-based task review modal — driven by R.modal state
- imports: UINode, UIButton, TextInput, materialRenderer, R
- exports: CoachModal
- reads: R.modal.open, R.modal.type, R.modal.props
- writes: nothing — calls R.openModal, R.closeModal
- key_symbols: CoachModal, open, close, _getSteps, _confirmCurrent
- dependencies: UINode.js, UIButton.js, TextInput.js, materialRenderer.js, runtime.js

---

### file: UI_Elements/overlays/Toaster.js

- responsibility: bottom-right toast notification queue — timed and persistent modes
- imports: R
- exports: Toaster
- reads: R.assets.fonts
- writes: this.toasts
- key_symbols: Toaster, add, update, render, hitTestClose
- dependencies: runtime.js

---

### file: backend/app.py

- responsibility: FastAPI server — REST endpoints for tasks and placements, PostgreSQL persistence, serves frontend
- imports: fastapi, psycopg2, os
- exports: app
- reads: DATABASE_URL env var
- writes: tasks table, placements table
- key_symbols: get_state, create_task, update_task, delete_task, create_placement, delete_placement, move_placement
- dependencies: psycopg2-binary, python-dotenv


### file: core/time/temporalModel.js

- responsibility: pure temporal derivation — builds a snapshot classifying every placement by time-relative state
- imports: timeSignals.js
- exports: buildTemporalSnapshot
- reads: R.appState.tasks, R.appState.placements (passed in via R argument)
- writes: nothing
- key_symbols: buildTemporalSnapshot, _getTemporalState, _getScrubberProgress, _getTodayColumnIndex
- dependencies: core/time/timeSignals.js

### file: core/time/timeSignals.js

- responsibility: pure math utilities for urgency derivation and temporal animation feel
- imports: none
- exports: getUrgency01, easeOutCubic, easeInOutSine, getPulseScale, getGlowAlpha, getScrubberGlow, isApproaching
- reads: nothing
- writes: nothing
- key_symbols: getUrgency01, getPulseScale, getGlowAlpha, getScrubberGlow, isApproaching
- dependencies: none

### file: core/time/sessionDelta.js

- responsibility: session-to-session memory — detects what temporal categories changed while user was away
- imports: none
- exports: loadLastSeenAt, saveSessionSeenNow, computeReturnDelta
- reads: localStorage key "planner_last_seen_at_v1"
- writes: localStorage key "planner_last_seen_at_v1"
- key_symbols: computeReturnDelta, saveSessionSeenNow, loadLastSeenAt, ReturnDelta
- dependencies: none

### file: UI_Elements/overlay/TimeScrubberOverlay.js

- responsibility: render-only overlay — draws the continuous time scrubber line on today's column
- imports: R, timeSignals.js
- exports: TimeScrubberOverlay
- reads: R.time.temporalSnapshot, R.assets.fonts
- writes: nothing
- key_symbols: TimeScrubberOverlay, render
- dependencies: core/runtime.js, core/time/timeSignals.js


### file: UI_Elements/feedback/UpcomingTaskPulse.js

- responsibility: render-only feedback — draws breathing glow and scale pulse on the single most urgent upcoming task block
- imports: R, timeSignals.js
- exports: UpcomingTaskPulse
- reads: R.time.temporalSnapshot, R.assets.fonts
- writes: nothing
- key_symbols: UpcomingTaskPulse, render, _renderSoonChip
- dependencies: core/runtime.js, core/time/timeSignals.js