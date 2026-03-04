import { R } from "./runtime.js";
import { UI_ELEMENTS } from "./operator.js";

const DOUBLE_CLICK_TIME = 300; // ms

let lastPressed = false;
let lastClickTime = 0;

// ─────────────────────────────────────────────
// INPUT ROUTER SERVICE
// ─────────────────────────────────────────────


export function routeInput(INPUT) {

  if (R.enginePhase !== "ready") return;

  routeMouse(INPUT.mouse);

}


function routeMouse(m) {

  // ALWAYS ROUTE HOVER
  routeHOVER(m);

  if (!m.pressed && lastPressed) {
    routeRelease(m);
  }

  if(m.pressed && !lastPressed) { 
    const now = Date.now(); 

    if(now - lastClickTime < DOUBLE_CLICK_TIME) {
      routeDoubleClick(m);
      lastClickTime = 0; // <-- reset after double click
    } else {
      routeClick(m);    
      lastClickTime = now; // <-- store first click timestamp
    }

  }
  lastPressed = m.pressed;

}
  
function routeRelease(m) {

  if (!UI_ELEMENTS.schedule?.onHit(m.x, m.y)) {
    return false;
  }

  UI_ELEMENTS.schedule.onMouseRelease(m);
}
  
  
function routeHOVER(m) {
    
  if(UI_ELEMENTS.schedule?.onHit(m.x, m.y)) {
    UI_ELEMENTS.schedule.onMouseHover(m);
  } 
  if (UI_ELEMENTS.button?.hitTest(m.x, m.y)) {
    UI_ELEMENTS.button.onHover();
  }

  //UI_ELEMENTS.schedule.onMouseHover(m);
}
  

function routeClick(m) {

  if (UI_ELEMENTS.schedule?.onHit(m.x, m.y)) {
    UI_ELEMENTS.schedule.onMousePress(m);
  }
  if (UI_ELEMENTS.button?.hitTest(m.x, m.y)) {
    UI_ELEMENTS.button.onClick();
  }
  return false;

  
}

function routeDoubleClick(m) {

 
  if(!UI_ELEMENTS.schedule.onHit(m.x, m.y)) {
    return false;
  }


}