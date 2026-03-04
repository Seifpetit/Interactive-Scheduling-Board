import { R } from "./runtime.js";

export function updateInput(p5) {
  //__________________________________________________________
  // MOUSE
  //__________________________________________________________
  const mouse = R.input.mouse;

  // mouse wheel (for future use)
  mouse.wheelDelta = p5._mouseWheelDeltaY || 0;

  // store previous
  mouse.prevPressed = mouse.pressed;

  // update current
  mouse.x = p5.mouseX;
  mouse.y = p5.mouseY;
  mouse.pressed = p5.mouseIsPressed;

  // detect transitions
  mouse.justPressed = mouse.pressed && !mouse.prevPressed;
  mouse.justReleased = !mouse.pressed && mouse.prevPressed;

  //__________________________________________________________
  // KEYBOARD
  //__________________________________________________________

  const keyboard = R.input.keyboard;

  // store previous state
  keyboard.prevPressed = keyboard.pressed;

  // update current state
  keyboard.pressed = p5.keyIsPressed;

  // detect transitions
  keyboard.justPressed = keyboard.pressed && !keyboard.prevPressed;
  keyboard.justReleased = !keyboard.pressed && keyboard.prevPressed;

  //store key data if (keyboard.justPressed) 
  if (keyboard.justPressed) {
    keyboard.key = p5.key;
    keyboard.code = p5.keyCode;

    keyboard.shift = p5.keyIsDown(p5.SHIFT);
    keyboard.ctrl = p5.keyIsDown(p5.CONTROL);
    keyboard.alt = p5.keyIsDown(p5.ALT);
  }

  //__________________________________________________________
  // TOUCH
  //__________________________________________________________
  R.input.touch.active = p5.touches && p5.touches.length > 0;
}

