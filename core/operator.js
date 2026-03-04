import { R } from './runtime.js';
import { updateInput} from './updateInput.js';
import { routeInput } from './routeInput.js';
import { Schedule } from '../UI_Elements/Schedule.js';
import { GenerateButton } from '../UI_Elements/Button.js';
import { commands } from './commands.js';

export const UI_ELEMENTS = {
  
  schedule: null,

}

export function initUI() {  
  R.ui.activeEmployeeCard = null;
  UI_ELEMENTS.schedule = new Schedule(R.appState, commands);
  UI_ELEMENTS.button = new GenerateButton(commands.generate);
}

export function initGeometry(p5) {
  
  const WINDOW_W = window.innerWidth;
  const WINDOW_H = window.innerHeight;

  R.geometry.window = {w: window.innerWidth, h: window.innerHeight};
  R.geometry.schedule = {x: 50, y: 50, w: WINDOW_W - 100, h: WINDOW_H - 100}; 

  UI_ELEMENTS.schedule?.setGeometry(50, 50, WINDOW_W - 100, WINDOW_H - 100);
  UI_ELEMENTS.button?.setGeometry(WINDOW_W / 2 - 70, 10, 140, 25);

  R.enginePhase = "ready";
}


export function updateFrame(p5) {

  // ─────────────────────────────────────────
  // INPUTs Handling
  // ─────────────────────────────────────────
  
  updateInput(p5);  routeInput(R.input);


  // ─────────────────────────────────────────
  // UI ELEMENTS UPDATE
  // ─────────────────────────────────────────
  UI_ELEMENTS.schedule?.update(p5, R.input.mouse);
  UI_ELEMENTS.button?.update(p5, R.input.mouse);
  
}

export function renderFrame(p5, {gMain, gOverlay}) {
  
  gOverlay.clear();
  
  UI_ELEMENTS.schedule?.render(gMain, gOverlay);
  UI_ELEMENTS.button?.render(gOverlay);

  
}