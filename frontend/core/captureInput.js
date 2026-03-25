import { R } from "./runtime.js";

// ─────────────────────────────────────────────────────────────────────────────
// captureInput
// Responsibility: read raw browser/p5 state → write into R.input
// Called once per frame, before resolveHit and routeInput.
// ─────────────────────────────────────────────────────────────────────────────

export function captureInput(p5) {

  // ── Mouse ────────────────────────────────
  const mouse = R.input.mouse;

  // wheelDelta is written by main.js p5.mouseWheel and consumed+reset there.
  // Do NOT overwrite it here — p5._mouseWheelDeltaY races with the event handler.
  mouse.x = p5.mouseX;
  mouse.y = p5.mouseY;

  // Left button only
  const mouseDown = p5.mouseIsPressed && 
                   (p5.mouseButton === p5.LEFT || p5.mouseButton === p5.RIGHT);
  mouse.prevPressed  = mouse.pressed;
  mouse.pressed      = mouseDown;
  mouse.justPressed  = mouse.pressed  && !mouse.prevPressed;
  mouse.justReleased = !mouse.pressed &&  mouse.prevPressed;

  // Right button
  const rightDown = p5.mouseIsPressed && p5.mouseButton === p5.RIGHT;
  mouse.prevRightPressed = mouse.rightPressed;
  mouse.rightPressed     = rightDown;
  mouse.justRightClicked = mouse.rightPressed && !mouse.prevRightPressed;

  // ── Keyboard ─────────────────────────────
  const kb = R.input.keyboard;

  kb.prevPressed = kb.pressed;
  kb.pressed     = p5.keyIsPressed;

  kb.justPressed  = kb.pressed  && !kb.prevPressed;
  kb.justReleased = !kb.pressed &&  kb.prevPressed;

  // Suppress keyboard capture while a DOM input has focus
  // — the DOM input handles its own keys via addEventListener
  const activeEl = document.activeElement;
  const domInputFocused = activeEl && activeEl.tagName === "INPUT";

  if (!domInputFocused) {
    if (kb.justPressed) {
      kb.key   = p5.key;
      kb.code  = p5.keyCode;
      kb.shift = p5.keyIsDown(p5.SHIFT);
      kb.ctrl  = p5.keyIsDown(p5.CONTROL);
      kb.alt   = p5.keyIsDown(p5.ALT);
    }
  } else {
    // While DOM input focused: zero out justPressed so routeInput ignores keys
    kb.justPressed  = false;
    kb.justReleased = false;
  }

  // ── Touch ────────────────────────────────
  R.input.touch.active = p5.touches && p5.touches.length > 0;

}
