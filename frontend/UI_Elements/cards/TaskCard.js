import { UINode }   from "../base/UINode.js";
import { R }      from "../../core/runtime.js";
import { renderMaterial } from "../../core/render/materials/materialRenderer.js";

const CATEGORY_COLORS = {
  study:   "#4a90d9",
  gym:     "#e2621d",
  errands: "#f5a623",
  work:    "#9b59b6",
  health:  "#27ae60",
  social:  "#e91e8c",
  other:   "#92ba00",
};

// ─────────────────────────────────────────────────────────────────────────────
// TaskCard  — draggable card in the TaskTray
// hitType: "taskCard"
// ─────────────────────────────────────────────────────────────────────────────

export class TaskCard extends UINode {
  constructor(task) {
    super();
    this.hitType = "taskCard";
    this.task    = task;

    // tray-local position (for hit testing inside tray)
    this.localX = 0;
    this.localY = 0;

    // global drag position
    this.dragX = 0;
    this.dragY = 0;
    this.dragging = false;

    this.highlighted = false;

    // tilt
    this.rotation       = 0;
    this.targetRotation = 0;
    this._prevDragX     = 0;

    // drag offsets
    this.offsetX = 0;
    this.offsetY = 0;
  }

  get color() {
    return CATEGORY_COLORS[this.task.category] ?? CATEGORY_COLORS.other;
  }

  // ─────────────────────────────
  // GEOMETRY  — local tray space
  // ─────────────────────────────

  setGeometry(x, y, w, h) {
    this.localX = x;
    this.localY = y;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.layout();
  }

  layout() {} // leaf

  // hitTest uses localX/localY (tray-local coords passed in)
  hitTest(lx, ly) {
    if (!this.visible) return null;
    if (lx > this.localX && lx < this.localX + this.w &&
        ly > this.localY && ly < this.localY + this.h) {
      return { node: this, type: this.hitType };
    }
    return null;
  }

  // ─────────────────────────────
  // DRAG
  // ─────────────────────────────

  startDrag(mouse, trayX, trayY, scrollY) {
    this.dragging = true;
    this.dragX    = trayX + this.localX;
    this.dragY    = trayY + this.localY - scrollY;
    this.offsetX  = mouse.x - this.dragX;
    this.offsetY  = mouse.y - this.dragY;
    this._prevDragX = this.dragX;
  }

  updateDrag(mouse) {
    if (!this.dragging) return;

    const targetX = mouse.x - this.offsetX;
    const targetY = mouse.y - this.offsetY;

    // 🧠 add lag → feels physical
    this.dragX += (targetX - this.dragX) * 0.25;
    this.dragY += (targetY - this.dragY) * 0.25;

    const velocityX = this.dragX - this._prevDragX;
    this._prevDragX = this.dragX;

    const maxTilt = 0.1;
    this.targetRotation = Math.max(-maxTilt, Math.min(maxTilt, velocityX * 0.02));
  }

  stopDrag() {
    this.dragging       = false;
    this.targetRotation = 0;
  }

  getDragX() { return this.dragX; }
  getDragY() { return this.dragY; }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update(mouse) {
    if (!this.parent) return;

    const tray = this.parent;

    const globalX = tray.x + this.localX;
    const globalY = tray.y + this.localY - tray.scrollY;

    const isHovered =
      mouse.x > globalX &&
      mouse.x < globalX + this.w &&
      mouse.y > globalY &&
      mouse.y < globalY + this.h;

    // 🧠 rotation smoothing
    this.rotation += (this.targetRotation - this.rotation) * 0.15;

    // 🧊 material
    const materialTarget = this.dragging ? 1 : isHovered ? 0.6 : 0;
    this.updateMaterial(materialTarget);

    // 🧠 elevation
    const elevationTarget = this.dragging ? 1 : isHovered ? 0.4 : 0;
    this.updateElevation(elevationTarget);
  }

  highlight() { this.highlighted = true; }
  clearHighlight() { this.highlighted = false; }

  // ─────────────────────────────
  // RENDER  — called in tray-translated space (already offset by tray x/y-scroll)
  // ─────────────────────────────

  render(g) {
    if (!this.visible) return;

    const rx = this.localX;
    const ry = this.localY;

    g.push();

    // 🧠 elevation shift
    g.translate(rx + this.w / 2, ry + this.h / 2 - this.elevation * 6);

    // 🧠 subtle scale
    const scale = 1 + this.elevation * 0.03;
    g.scale(scale);

    g.rotate(this.rotation);

    // 🧠 shadow (depth)
    if (this.elevation > 0.01) {
      g.push();
      g.noStroke();
      g.fill(0, 0, 0, 50 * this.elevation);
      g.rect(-this.w/2 + 2, -this.h/2 + 4, this.w, this.h, 10);
      g.pop();
    }

    // 🧊 MATERIAL
    renderMaterial(g, {
      ...this,
      x: this.dragging ? this.dragX : this.x,
      y: this.dragging ? this.dragY : this.y,
      w: this.w,
      h: this.h,
      color: this.color
    });

    // ───────────────── CONTENT ─────────────────

    const ec = { high: "#ff4444", medium: "#ffa500", low: "#44cc44" };
    g.fill(ec[this.task.energy] ?? "#888");
    g.circle(this.w/2 - 10, -this.h/2 + 10, 8);

    g.fill("#fff");
    g.textSize(14);
    g.textAlign(g.LEFT, g.CENTER);

    const f1 = R.assets?.fonts?.["Bold"];
    if (f1) g.textFont(f1);
    g.text(this.task.name, -this.w/2 + 8, -4);

    g.fill("#ffffffaa");
    g.textSize(11);

    const f2 = R.assets?.fonts?.["Medium"];
    if (f2) g.textFont(f2);
    g.text(`${this.task.duration}h · ${this.task.category}`, -this.w/2 + 8, 10);

    g.pop();
  }

  // ─────────────────────────────
  // GHOST RENDER  — called on overlay while dragging (global coords)
  // ─────────────────────────────

  renderDrag(g, tilt) {
    if (!this.dragging) return;
    g.push();
    g.translate(this.dragX + this.w/2, this.dragY + this.h/2);
    g.rotate(tilt ?? this.rotation);


    renderMaterial(g, {
      ...this,
      x: this.dragging ? this.dragX : this.x,
      y: this.dragging ? this.dragY : this.y,
      w: this.w,
      h: this.h,
      color: this.color
    });

    //g.fill(this.color + "bb");
    //g.noStroke();
    //g.rect(-this.w/2, -this.h/2, this.w, this.h, 10);

    g.fill("#fff");
    g.textSize(14);
    g.textAlign(g.CENTER, g.CENTER);
    
    const f = R.assets?.fonts?.["Bold"];
    if (f) g.textFont(f);
    g.text(this.task.name, 0, 0);
    g.noStroke();

    g.pop();
  }
}
