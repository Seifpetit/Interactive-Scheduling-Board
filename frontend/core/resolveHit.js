import { R }           from "./runtime.js";
import { UI_ELEMENTS } from "./operator.js";

// ─────────────────────────────────────────────────────────────────────────────
// resolveHit
// Asks the UI tree to walk itself. Each node returns { node, type } for the
// deepest match. resolveHit just records the result and classifies the click.
// No manual tree walking here — the tree knows its own shape.
// ─────────────────────────────────────────────────────────────────────────────

const DOUBLE_CLICK_MS = 300;
let _lastClickTime = 0;

export function resolveHit() {
  const mouse = R.input.mouse;

  // Ask the tree — button checked first (sits above schedule in z)
  R.interaction.hovered = _findHit(mouse.x, mouse.y);

  R.interaction.released = mouse.justReleased;
  R.interaction.click    = null;

  if (mouse.justPressed) {
    const now = Date.now();
    if (now - _lastClickTime < DOUBLE_CLICK_MS) {
      R.interaction.click = "double";
      _lastClickTime = 0;
    } else {
      R.interaction.click = "single"; 
      if(mouse.justRightClicked) R.interaction.click = "right";
      _lastClickTime = now;
    }
  }
}

function _findHit(gx, gy) {
  // Button (floating above everything)
  if (UI_ELEMENTS.button?.hitTest(gx, gy)) {
    return { node: UI_ELEMENTS.button, type: "button" };
  }

  // Export button (top-right)
  if (UI_ELEMENTS.exportButton?.hitTest(gx, gy)) {
    return { node: UI_ELEMENTS.exportButton, type: "exportButton" };
  }

  // Test button (dev)
  if (UI_ELEMENTS.testButton?.hitTest(gx, gy)) {
    return { node: UI_ELEMENTS.testButton, type: "testButton" };
  }

  // Schedule — walks its own tree, returns deepest { node, type }
  return UI_ELEMENTS.planner?.hitTest(gx, gy) ?? null;
}
