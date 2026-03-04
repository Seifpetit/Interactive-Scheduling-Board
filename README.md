# 🍔 BurgerMe Scheduler

Drag-and-drop weekly scheduling board built for real restaurant managers.

This tool replaces messy WhatsApp scheduling with a visual, fast, and editor-style workflow.

## 🎥 Demo

![Demo](./docs/demo2.gif)


# 🧠 The Problem

Small restaurants often create weekly schedules using:

WhatsApp messages

Static images

Manual Excel sheets

Last-minute edits

This leads to:

Confusion

Manual corrections

No validation

Repeated back-and-forth

BurgerMe Scheduler explores a better workflow:

Immediate visual assignment with direct manipulation.



# 🚀 What It Currently Does (V0)

Drag & drop employee cards

Weekly grid layout (Mon–Sun)

Shift sections (Lunch / Dinner)

Scrollable employee tray

Smooth inertial scrolling

Elastic overscroll behavior

Layered rendering (main + overlay buffers)

Command-based interaction routing

Draft assignment state

This is not a form-based app.
It behaves like a lightweight editor.



# 🏗 Architecture

The system is structured around a small interaction engine.

core/
  runtime.js
  operator.js
  routeInput.js
  commands.js
  updateInput.js

UI_Elements/
  EmployeeTray.js
  EmployeeCard.js
  WeekGrid.js
  DayColumn.js
  SlotRow.js
  ShiftSection.js
  Button.js
  Schedule.js
Design Principles

State-driven rendering

Geometry recalculated every frame

Interaction routed through a central operator

Separation of layout, interaction, and rendering layers

Offscreen rendering buffers (gMain, gOverlay)

No DOM layout dependency

This allows the board to behave like a mini editor rather than a typical CRUD UI. 



# 🛠 Tech Stack

JavaScript

p5.js (custom render loop)

Modular UI component architecture

No React.
No framework UI abstractions.
Rendering is manually controlled.


# 📈 Roadmap

V0.5 — Stable Editor Core

Context menus (sticker / slot / shift)

Slot count editing

Drop validation preview

Interaction stabilization

Initialization barrier refinement

V1 — Business-Ready Tool

Constraint validation (availability / capacity)

Schedule export (image / PDF)

Save & load draft state

Undo stack

Cleaned UX polish

Deterministic interaction (no race instabilities)


# 🎯 Why This Project Exists

This project is both:

A real workflow experiment for small restaurant scheduling

A personal exploration into building interaction systems and editor-like interfaces

It focuses on:

Input routing

State discipline

Visual-first workflows

Tooling architecture



# ▶ How To Run

#Example (adjust if needed)
npm install
npm run dev

Or open with Live Server if using static setup.



# 🧩 Next Steps

Immediate development focus:

Add context menus to stickers and slots

Implement dynamic slot resizing

Add basic validation rules

Prepare export-ready schedule view

📌 Status

Current version: V0 — Interactive Scheduling Board
Development stage: Entering V0.5 stabilization