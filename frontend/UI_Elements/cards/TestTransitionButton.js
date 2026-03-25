import { R }               from "../../core/runtime.js";
import { beginTransition } from "../../core/operator.js";

const MODES = [
  { label: "Mode A  →", message: "Loading Mode B…", apply: (s) => { s._testMode = "B"; } },
  { label: "Mode B  →", message: "Loading Mode C…", apply: (s) => { s._testMode = "C"; } },
  { label: "Mode C  →", message: "Back to Mode A…", apply: (s) => { s._testMode = "A"; } },
];

let _modeIndex = 0;

export class TestTransitionButton {
  constructor() {
    this.x = 0; this.y = 0; this.w = 130; this.h = 20;
    this.hovered = false;
    this.scale   = 1;
    this._busy   = false;
  }

  setGeometry(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; }

  hitTest(x, y) {
    return x > this.x && x < this.x + this.w &&
           y > this.y && y < this.y + this.h;
  }

  onClick() {
    if (this._busy) return;
    this._busy = true;

    const mode = MODES[_modeIndex % MODES.length];

    beginTransition("FETCHING", async (setProgress) => {
      setProgress(0.2);  await _wait(400);
      setProgress(0.6);  await _wait(500);
      mode.apply(R.appState);
      setProgress(1.0);  await _wait(200);
    }, mode.message).finally(() => {
      _modeIndex++;
      this._busy = false;
    });
  }

  update(p5, mouse) {
    this.setGeometry(p5.width - this.w - 12, 8, this.w, this.h);
    this.hovered = this.hitTest(mouse.x, mouse.y) && !this._busy;
    const target = this.hovered ? 1.08 : 1;
    this.scale  += (target - this.scale) * 0.15;
  }

  render(g) {
    const label = this._busy ? "…" : MODES[_modeIndex % MODES.length].label;

    g.push();
    g.translate(this.x + this.w / 2, this.y + this.h / 2);
    g.scale(this.scale);
    g.noStroke();

    g.fill(this._busy ? "#333" : this.hovered ? "#e06a00" : "#fba700");
    g.rect(-this.w / 2, -this.h / 2, this.w, this.h, 6);

    g.fill(this._busy ? "#666" : "#111");
    g.textFont(R.assets.fonts["Medium"]);
    g.textSize(11);
    g.textAlign(g.CENTER, g.CENTER);
    g.text(label, 0, -1);

    g.fill(this._busy ? "#555" : "#11111188");
    g.textSize(8);
    g.textAlign(g.RIGHT, g.CENTER);
    g.text("DEV", this.w / 2 - 5, this.h / 2 - 5);

    g.pop();
  }
}

function _wait(ms) { return new Promise(r => setTimeout(r, ms)); }
