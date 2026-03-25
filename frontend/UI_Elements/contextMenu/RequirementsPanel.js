import { R } from "../../core/runtime.js";

// ─────────────────────────────────────────────────────────────────────────────
// RequirementsPanel
// Owned by ContextMenuController. Handles the "requirements" mode —
// a three-field number panel for kitchen / bicycle / motor counts.
//
// The controller calls:
//   panel.open(target, x, y, w, itemH)  → pre-fills values, clears hover
//   panel.onHover(mx, my)               → called every frame to track hover
//   panel.handleClick(mx, my)           → +/- buttons, field focus, Validate/Cancel
//   panel.handleKey(kb)                 → digits, Backspace, Enter, Escape
//   panel.height()                      → current panel pixel height
//   panel.render(g)                     → draws the panel
//
// Callbacks passed at construction:
//   onSubmit(ref, values)  → controller calls commands.setShiftRequirements
//   onClose()              → controller closes the menu
// ─────────────────────────────────────────────────────────────────────────────

const REQ_FIELDS = [
  { key: "kitchen", label: "Kitchen", color: "#e2621d" },
  { key: "bicycle", label: "Bicycle", color: "#3a9bd5" },
  { key: "motor",   label: "Motor",   color: "#9b59b6" },
];

const PANEL_PAD = 12;
const FIELD_H   = 52;
const BTN_ROW_H = 36;
const BTN_W     = 28;
const BTN_H     = 28;

export class RequirementsPanel {

  constructor({ onSubmit, onClose }) {
    this.onSubmit = onSubmit;
    this.onClose  = onClose;

    // Geometry — set by open()
    this.x     = 0; this.y = 0;
    this.w     = 0;
    this.itemH = 32;

    // State
    this._target  = null;
    this._values  = { kitchen: 0, bicycle: 0, motor: 0 };
    this._focused = null;   // key of focused field | null

    // Hover — { kind: "minus"|"plus"|"validate"|"cancel", key? } | null
    // Reset to null at the top of onHover each frame.
    this._hover   = null;
  }

  // ─────────────────────────────
  // OPEN
  // ─────────────────────────────

  open(target, x, y, w, itemH) {
    this._target  = target;
    this.x        = x;  this.y = y;
    this.w        = w;
    this.itemH    = itemH;
    this._focused = null;
    this._hover   = null;

    const existing = R.appState.shiftRequirements?.[target?.ref?.key] ?? {};
    this._values = {
      kitchen: existing.kitchen ?? 0,
      bicycle: existing.bicycle ?? 0,
      motor:   existing.motor   ?? 0,
    };
  }

  // ─────────────────────────────
  // HEIGHT
  // ─────────────────────────────

  height() {
    return this.itemH + PANEL_PAD + FIELD_H * REQ_FIELDS.length + PANEL_PAD + BTN_ROW_H + PANEL_PAD;
  }

  // ─────────────────────────────
  // HIT TEST
  // ─────────────────────────────

  hitTest(mx, my) {
    return mx > this.x && mx < this.x + this.w &&
           my > this.y && my < this.y + this.height();
  }

  // ─────────────────────────────
  // HOVER  — called every frame by controller when mode === "requirements"
  // ─────────────────────────────

  onHover(mx, my) {
    this._hover = null;

    // +/- buttons per field
    let fieldY = this.y + this.itemH + PANEL_PAD;
    for (const field of REQ_FIELDS) {
      const midY    = fieldY + FIELD_H / 2;
      const btnBy   = midY - BTN_H / 2;
      const minusBx = this.x + PANEL_PAD;
      const plusBx  = this.x + this.w - PANEL_PAD - BTN_W;

      if (this._inBtn(mx, my, minusBx, btnBy)) {
        this._hover = { kind: "minus", key: field.key }; return;
      }
      if (this._inBtn(mx, my, plusBx, btnBy)) {
        this._hover = { kind: "plus",  key: field.key }; return;
      }
      fieldY += FIELD_H;
    }

    // Validate / Cancel
    const { valX, canX, btnRowY, halfW, btnH } = this._actionBtnGeom();
    if (mx > valX && mx < valX + halfW && my > btnRowY && my < btnRowY + btnH) {
      this._hover = { kind: "validate" }; return;
    }
    if (mx > canX && mx < canX + halfW && my > btnRowY && my < btnRowY + btnH) {
      this._hover = { kind: "cancel" };
    }
  }

  // ─────────────────────────────
  // CLICK
  // ─────────────────────────────

  handleClick(mx, my) {
    let fieldY = this.y + this.itemH + PANEL_PAD;

    for (const field of REQ_FIELDS) {
      const midY    = fieldY + FIELD_H / 2;
      const btnBy   = midY - BTN_H / 2;
      const minusBx = this.x + PANEL_PAD;
      const plusBx  = this.x + this.w - PANEL_PAD - BTN_W;

      if (this._inBtn(mx, my, minusBx, btnBy)) {
        this._values[field.key] = Math.max(0,  (this._values[field.key] ?? 0) - 1); return;
      }
      if (this._inBtn(mx, my, plusBx,  btnBy)) {
        this._values[field.key] = Math.min(99, (this._values[field.key] ?? 0) + 1); return;
      }
      if (my > fieldY && my < fieldY + FIELD_H) {
        this._focused = field.key; return;
      }
      fieldY += FIELD_H;
    }

    const { valX, canX, btnRowY, halfW, btnH } = this._actionBtnGeom();
    if (mx > valX && mx < valX + halfW && my > btnRowY && my < btnRowY + btnH) {
      this._submit(); return;
    }
    if (mx > canX && mx < canX + halfW && my > btnRowY && my < btnRowY + btnH) {
      this.onClose();
    }
  }

  // ─────────────────────────────
  // KEYBOARD
  // ─────────────────────────────

  handleKey(kb) {
    if (kb.key === "Escape") { this.onClose(); return; }
    if (kb.key === "Enter")  { this._submit(); return; }

    if (this._focused) {
      const cur = String(this._values[this._focused] ?? 0);
      if (kb.key === "Backspace") {
        this._values[this._focused] = parseInt(cur.slice(0, -1)) || 0;
      } else if (/^\d$/.test(kb.key)) {
        this._values[this._focused] = Math.min(99, parseInt(cur + kb.key));
      }
    }
  }

  // ─────────────────────────────
  // INTERNAL
  // ─────────────────────────────

  _submit() {
    this.onSubmit(this._target?.ref, { ...this._values });
  }

  _inBtn(mx, my, bx, by) {
    return mx > bx && mx < bx + BTN_W && my > by && my < by + BTN_H;
  }

  _actionBtnGeom() {
    const totalH  = this.height();
    const btnRowY = this.y + totalH - BTN_ROW_H - PANEL_PAD;
    const halfW   = (this.w - PANEL_PAD * 3) / 2;
    const btnH    = BTN_ROW_H - 6;
    const valX    = this.x + PANEL_PAD;
    const canX    = this.x + PANEL_PAD * 2 + halfW;
    return { btnRowY, halfW, btnH, valX, canX };
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(g) {
    const totalH = this.height();

    // Shadow + bg
    g.noStroke(); g.fill(0, 80);
    g.rect(this.x + 3, this.y + 3, this.w, totalH, 6);
    g.fill("#1e1e1e"); g.stroke("#333"); g.strokeWeight(1);
    g.rect(this.x, this.y, this.w, totalH, 6);

    // Title strip
    g.noStroke(); g.fill("#333");
    g.rect(this.x, this.y, this.w, this.itemH, 6, 6, 0, 0);
    g.fill("#aaa");
    g.textFont(R.assets.fonts["Medium"]); g.textSize(12);
    g.textAlign(g.LEFT, g.CENTER);
    g.text("Set requirements", this.x + 12, this.y + this.itemH / 2);

    // Fields
    let fieldY = this.y + this.itemH + PANEL_PAD;
    for (const field of REQ_FIELDS) {
      this._renderField(g, field, fieldY);
      fieldY += FIELD_H;
    }

    // Action buttons
    this._renderActionButtons(g);
  }

  _renderField(g, field, fieldY) {
    const isFocused = this._focused === field.key;
    const val       = this._values[field.key] ?? 0;
    const midY      = fieldY + FIELD_H / 2;
    const btnBy     = midY - BTN_H / 2;
    const minusBx   = this.x + PANEL_PAD;
    const plusBx    = this.x + this.w - PANEL_PAD - BTN_W;
    const valX      = this.x + this.w / 2;

    const minusHov  = this._hover?.kind === "minus" && this._hover.key === field.key;
    const plusHov   = this._hover?.kind === "plus"  && this._hover.key === field.key;

    // Divider
    g.stroke("#2a2a2a"); g.strokeWeight(1);
    g.line(this.x + 8, fieldY, this.x + this.w - 8, fieldY);
    g.noStroke();

    // Focus bg
    if (isFocused) {
      g.fill("#ffffff08");
      g.rect(this.x + 1, fieldY, this.w - 2, FIELD_H);
    }

    // Colored dot + label
    g.fill(field.color);
    g.circle(this.x + PANEL_PAD + 6, midY, 8);
    g.fill(isFocused ? "#fff" : "#ccc");
    g.textFont(R.assets.fonts["Medium"]); g.textSize(13);
    g.textAlign(g.CENTER, g.CENTER);
    g.text(field.label, valX, midY - FIELD_H / 4);

    // Minus button
    g.fill(minusHov ? "#444" : "#2a2a2a");
    g.stroke(minusHov ? "#888" : "#444"); g.strokeWeight(1);
    g.rect(minusBx, btnBy, BTN_W, BTN_H, 5);
    g.fill(minusHov ? "#fff" : "#aaa"); g.noStroke();
    g.textFont(R.assets.fonts["Bold"]); g.textSize(16);
    g.textAlign(g.CENTER, g.CENTER);
    g.text("−", minusBx + BTN_W / 2, btnBy + BTN_H / 2 - 1);

    // Value
    g.fill(isFocused ? field.color : "#fff");
    g.textFont(R.assets.fonts["Bold"]); g.textSize(18);
    g.textAlign(g.CENTER, g.CENTER);
    g.text(String(val), valX, midY + FIELD_H / 4 - 4);

    // Plus button
    g.fill(plusHov ? "#444" : "#2a2a2a");
    g.stroke(plusHov ? "#888" : "#444"); g.strokeWeight(1);
    g.rect(plusBx, btnBy, BTN_W, BTN_H, 5);
    g.fill(plusHov ? "#fff" : "#aaa"); g.noStroke();
    g.textFont(R.assets.fonts["Bold"]); g.textSize(16);
    g.textAlign(g.CENTER, g.CENTER);
    g.text("+", plusBx + BTN_W / 2, btnBy + BTN_H / 2 - 1);
  }

  _renderActionButtons(g) {
    const { btnRowY, halfW, btnH, valX, canX } = this._actionBtnGeom();
    const valHov = this._hover?.kind === "validate";
    const canHov = this._hover?.kind === "cancel";

    g.fill(valHov ? "#a1cd00" : "#92ba00"); g.noStroke();
    g.rect(valX, btnRowY, halfW, btnH, 5);
    g.fill(valHov ? "#000" : "#111");
    g.textFont(R.assets.fonts["Bold"]); g.textSize(12);
    g.textAlign(g.CENTER, g.CENTER);
    g.text("Validate", valX + halfW / 2, btnRowY + btnH / 2);

    g.fill(canHov ? "#555" : "#333"); g.noStroke();
    g.rect(canX, btnRowY, halfW, btnH, 5);
    g.fill(canHov ? "#fff" : "#ccc");
    g.text("Cancel", canX + halfW / 2, btnRowY + btnH / 2);
  }
}
