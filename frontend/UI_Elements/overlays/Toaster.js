import { R } from "../../core/runtime.js";

// ─────────────────────────────────────────────────────────────────────────────
// Toaster
// Bottom-right stacking toast notifications.
//
// Two modes:
//   "timed"      — disappears after 3000ms (default)
//   "persistent" — stays until user clicks X
//
// Four types:
//   "info"    — blue
//   "success" — green
//   "warning" — orange
//   "error"   — red
//
// API (attached to R in runtime):
//   R.toast("message")                        → info, timed
//   R.toast("message", "warning")             → warning, timed
//   R.toast("message", "error", "persistent") → error, persistent
// ─────────────────────────────────────────────────────────────────────────────

const TOAST_W     = 260;
const TOAST_H     = 48;
const TOAST_PAD   = 10;
const STACK_GAP   = 8;
const SLIDE_SPEED = 0.18;
const MARGIN_R    = 20;
const MARGIN_B    = 20;

const TYPE_COLORS = {
  info:    { bar: "#4a90d9", bg: "#1a1a2e", text: "#a0c4ff" },
  success: { bar: "#27ae60", bg: "#0f1f18", text: "#7effc0" },
  warning: { bar: "#f5a623", bg: "#1f1800", text: "#ffd080" },
  error:   { bar: "#e2621d", bg: "#1f0a00", text: "#ffaa80" },
};

let _nextId = 0;

export class Toaster {
  constructor() {
    this.toasts = []; // array of toast objects, newest last
  }

  // ─────────────────────────────
  // ADD
  // ─────────────────────────────

  add(message, type = "info", mode = "timed") {
    const id = _nextId++;
    const toast = {
      id,
      message,
      type,
      mode,
      slideY:       TOAST_H + STACK_GAP,
      targetSlideY: 0,
      alpha:        0.04,     // start just above removal threshold
      framesAlive:  0,       // incremented every update() call
      dying:        false,
      _closeBox:    null,
    };
    this.toasts.push(toast);
  }

  // ─────────────────────────────
  // REMOVE
  // ─────────────────────────────

  _remove(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // ─────────────────────────────
  // HIT TEST  — called by routeInput on left click
  // ─────────────────────────────

  hitTestClose(mx, my) {
    for (const toast of this.toasts) {
      if (!toast._closeBox) continue;
      const b = toast._closeBox;
      if (mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h) {
        this._remove(toast.id);
        return true;
      }
    }
    return false;
  }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update() {
    const EXPIRE_FRAMES = 180; // ~3s at 60fps

    for (const toast of this.toasts) {
      toast.framesAlive++;

      // slide in
      toast.slideY += (toast.targetSlideY - toast.slideY) * SLIDE_SPEED;

      // mark timed toasts as dying after expiry
      if (toast.mode === "timed" && !toast.dying && toast.framesAlive >= EXPIRE_FRAMES) {
        toast.dying = true;
      }

      if (!toast.dying) {
        // fade in
        toast.alpha += (1 - toast.alpha) * 0.2;
      } else {
        // linear fade out — guaranteed to reach 0
        toast.alpha -= 0.05;
      }
    }

    // remove anything fully faded
    this.toasts = this.toasts.filter(t => t.alpha > 0);
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(g) {
    if (this.toasts.length === 0) return;

    const canvasW = g.width;
    const canvasH = g.height;

    g.push();

    // render bottom-up — newest at bottom
    let stackY = canvasH - MARGIN_B;

    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const toast  = this.toasts[i];
      const colors = TYPE_COLORS[toast.type] ?? TYPE_COLORS.info;
      const alpha  = toast.alpha;

      stackY -= TOAST_H;
      const x = canvasW - MARGIN_R - TOAST_W;
      const y = stackY + toast.slideY;

      // shadow
      g.noStroke();
      g.fill(0, 60 * alpha);
      g.rect(x + 3, y + 3, TOAST_W, TOAST_H, 8);

      // background
      g.fill(_hex(colors.bg, alpha));
      g.stroke(_hex("#333333", alpha));
      g.strokeWeight(1);
      g.rect(x, y, TOAST_W, TOAST_H, 8);

      // left color bar
      g.noStroke();
      g.fill(_hex(colors.bar, alpha));
      g.rect(x, y, 4, TOAST_H, 8, 0, 0, 8);

      // message text
      g.fill(_hex(colors.text, alpha));
      g.textSize(13);
      g.textAlign(g.LEFT, g.CENTER);
      const font = R.assets?.fonts?.["Medium"];
      if (font) g.textFont(font);

      // clip text to available width
      const maxW    = TOAST_W - TOAST_PAD * 2 - 4 - (toast.mode === "persistent" ? 24 : 0);
      const textX   = x + 4 + TOAST_PAD;
      const textY   = y ;
      g.text(toast.message, textX, textY, maxW, TOAST_H);

      // X button for persistent toasts
      if (toast.mode === "persistent") {
        const bx = x + TOAST_W - 28;
        const by = y + TOAST_H / 2 - 10;
        const bw = 20;
        const bh = 20;

        toast._closeBox = { x: bx, y: by, w: bw, h: bh };

        g.fill(_hex("#ffffff", alpha * 0.15));
        g.rect(bx, by, bw, bh, 4);
        g.fill(_hex("#ffffff", alpha * 0.6));
        g.textSize(14);
        g.textAlign(g.CENTER, g.CENTER);
        g.text("×", bx + bw / 2, by + bh / 2 - 1);
      } else {
        toast._closeBox = null;
      }

      stackY -= STACK_GAP;
    }

    g.pop();
  }
}

// ─────────────────────────────
// hex color with alpha override
// accepts "#rrggbb" and appends alpha as 0-255 hex
// ─────────────────────────────

function _hex(color, alpha) {
  // strip existing alpha if present
  const base = color.slice(0, 7);
  const a    = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16).padStart(2, "0");
  return base + a;
}
