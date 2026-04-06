import { UINode }       from "../base/UINode.js";
import { renderMaterial } from "../../core/render/materials/materialRenderer.js";
import { R }            from "../../core/runtime.js";

// ─────────────────────────────────────────────────────────────────────────────
// UIButton
// A reusable button with material system, hover state, and flexible styling.
// ─────────────────────────────────────────────────────────────────────────────
export class UIButton extends UINode {
  constructor(label, onClick, opts = {}) {
    super();
    this.label     = label;
    this.onClick   = onClick;

    // style opts
    this.color      = opts.color      ?? "#2a2a4a";
    this.textColor  = opts.textColor  ?? "#8888aa";
    this.hoverColor = opts.hoverColor ?? "#4a90d9";
    this.hoverText  = opts.hoverText  ?? "#ffffff";
    this.textSize   = opts.textSize   ?? 18;
    this.radius     = opts.radius     ?? 10;
    this.selected   = opts.selected   ?? false;  // for toggleable option buttons

    this.isHovered  = false;
    this.disabled   = false;
  }

  layout() {}

  update(mouse) {
    if (!this.visible || this.disabled) return;
    this.isHovered = this.contains(mouse.x, mouse.y);
    this.updateMaterial(this.isHovered ? 0.5 : this.selected ? 0.3 : 0);

    if (mouse.justPressed && this.isHovered && !R.interaction.drag.active) {
      this.onClick?.();
    }
  }

  render(g) {
    if (!this.visible) return;

    // ── MATERIAL LAYER ──
    g.push();
    g.translate(this.x + this.w / 2, this.y + this.h / 2);
    renderMaterial(g, {
      ...this,
      w:               this.w,
      h:               this.h,
      color:           this.selected ? this.hoverColor : this.color,
      materialProgress: this.materialProgress,
      highlighted:     false,
    });
    g.pop();

    // ── BORDER ──
    g.push();
    g.noFill();
    g.stroke(
      this.selected  ? this.hoverColor :
      this.isHovered ? this.hoverColor :
      this.color
    );
    g.strokeWeight(1.5);
    g.rect(this.x, this.y, this.w, this.h, this.radius);
    g.pop();

    // ── LABEL ──
    g.push();
    g.noStroke();
    g.fill(
      this.selected  ? "#ffffff" :
      this.isHovered ? this.hoverText :
      this.textColor
    );
    g.textAlign(g.CENTER, g.CENTER);
    g.textSize(this.textSize);
    const font = R.assets?.fonts?.["Bold"];
    if (font) g.textFont(font);
    g.text(this.label, this.x + this.w / 2, this.y + this.h / 2 - 1);
    g.pop();

    this.isHovered = false;
  }
}
