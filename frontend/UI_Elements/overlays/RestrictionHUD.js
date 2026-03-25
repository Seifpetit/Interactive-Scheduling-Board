import { R }        from "../../core/runtime.js";

// ─────────────────────────────────────────────────────────────────────────────
// RestrictionHUD
// Floating overlay panel shown while restrictMode is active.
// Renders above everything. Two buttons: Validate and Cancel.
// Owned by Schedule, rendered on gOverlay.
// ─────────────────────────────────────────────────────────────────────────────

const W        = 320;
const H        = 60;
const BTN_W    = 100;
const BTN_H    = 30;
const PAD      = 10;

export class RestrictionHUD {
  constructor() {
    this.x = window.innerWidth  / 4 - W / 2;
    this.y = 16;   // set each frame from canvas size

    const vx = this.x + W - BTN_W * 2 - PAD * 2;
    const by = this.y + H - BTN_H - 6;
    this._validateBox = { x: vx, y: by, w: BTN_W, h: BTN_H , isHovered: false };

    const cx = this.x + W - BTN_W - PAD;
    this._cancelBox   = { x: cx, y: by, w: BTN_W, h: BTN_H , isHovered: false };
  }

  // ─────────────────────────────
  // HIT TEST
  // ─────────────────────────────

  hitTestValidate(mx, my) { return this._inBox(mx, my, this._validateBox); }
  hitTestCancel(mx, my)   { return this._inBox(mx, my, this._cancelBox);   }
  hitTest(mx, my) {
    return mx > this.x && mx < this.x + W &&
           my > this.y && my < this.y + H;  }

  highlightValidate() {this._validateBox.isHovered = true;}
  highlightCancel() {this._cancelBox.isHovered = true;}
  
  _inBox(mx, my, b) {
    return mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h;
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(g) {
    const rm = R.interaction.restrictMode;
    if (!rm.active) return;

    // Pin to top-center of canvas

    const emp = R.appState.employees.find(e => e.id === rm.employeeId);
    const count = rm.selected?.size ?? 0;
    g.background("#33333328");
    // Shadow
    g.push();
    g.noStroke();
    g.fill("#56a3388e");
    g.rect(this.x + 3, this.y + 3, W, H, 10);

    // Background
    g.fill("#1e1e1e");
    g.stroke("#fba700"); g.strokeWeight(1.5);
    g.rect(this.x, this.y, W, H, 10);
    g.noStroke();

    // Label
    g.fill("#fba700");
    g.textFont(R.assets.fonts["Medium"]);
    g.textSize(12);
    g.textAlign(g.LEFT, g.CENTER);
    const label = emp
      ? `Restricting ${emp.name} — select slots (${count} selected)`
      : `Select slots to restrict (${count} selected)`;
    g.text(label, this.x + PAD, this.y + H / 3 - 8);

    // Validate button
    const vx = this._validateBox.x; const by = this._validateBox.y;
    g.fill(this._validateBox.isHovered ? "#a1cd00" : "#92ba00");
    g.rect(vx, by, BTN_W, BTN_H, 6);
    g.fill("#111");
    g.textFont(R.assets.fonts["Bold"]);
    g.textSize(12);
    g.textAlign(g.CENTER, g.CENTER);
    g.text("Validate", vx + BTN_W / 2, by + BTN_H / 2);

    // Cancel button
    const cx = this._cancelBox.x;
    g.fill(this._cancelBox.isHovered ? "#555" :"#444");
    g.rect(cx, by, BTN_W, BTN_H, 6);
    g.fill("#ccc");
    g.text("Cancel", cx + BTN_W / 2, by + BTN_H / 2);

    g.pop();
    this._validateBox.isHovered = false;
    this._cancelBox.isHovered = false;
  }
}
