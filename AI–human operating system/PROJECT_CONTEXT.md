# Project Context

## Purpose

A canvas-based personal weekly planner built on a custom p5.js runtime. The user creates tasks, drags them onto a weekly calendar grid, and reviews weekly analytics via a stats overlay. A FastAPI backend persists tasks and placements to PostgreSQL on Railway.

The project has three layers:
- A custom p5.js canvas runtime owning all interaction, drag, state, and rendering
- A stats overlay (DataView) rendered as a UINode over the grid area
- A FastAPI backend serving the frontend and persisting state to PostgreSQL

## Architecture Law

input → update → state → render

## Folder Structure

```
frontend/
  core/
    runtime.js
    boot.js
    operator.js
    captureInput.js
    resolveHit.js
    routeInput.js
    reactionFeedback.js
    render.js
    loadState.js
    commands.js
    validator.js
  UI_Elements/
    base/
      UINode.js
      UIButton.js
      TextInput.js
    cards/
      TaskCard.js
      HourSlot.js
    overlays/
      auth/
      AddTaskInput.js
      CoachModal.js
      DataView.js
      dataViewMount.js
      Toaster.js
    contextMenu/
      ContextMenuController.js
      MenuRenderer.js
      menuSchema.js
  planner/
    Planner.js
    TaskTray.js
    WeekGrid.js
    DayColumn.js
  render/
    materials/
      materialRenderer.js
backend/
  app.py
```

## Core Invariants

- R is the global singleton — all shared state lives there
- commands.js is the only file that writes to R.appState
- render is read-only — no mutations inside any render call
- every command mutates R.appState first then fires fetch — optimistic updates
- hit testing walks the UINode tree — deepest match wins
- overlays outside the UINode tree (context menu, toaster) are checked manually first in routeInput
- DataView derives stats from R.appState at render time — it does not own or cache state
- CoachModal is driven by R.modal — open/close goes through R.openModal / R.closeModal

## Philosophy

explicit ownership over implicit magic
canvas for interaction, UINode for structure
one responsibility per file
optimistic updates — UI never waits for the network
derive don't store — stats are computed from state, not cached separately
append-only registries
