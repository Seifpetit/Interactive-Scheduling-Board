export class UINode {

  constructor() {
    this.x = 0; this.y = 0; this.w = 0; this.h = 0;
    this.children = [];
    this.visible  = true;
    this.hitType  = null;

    // 🧊 Material system
    this.materialProgress = 0;
    this.materialVelocity = 0;

    // 🧠 Depth system
    this.elevation = 0;
    this.elevationVelocity = 0;
  }

  // ─────────────────────────────
  // GEOMETRY
  // ─────────────────────────────

  setGeometry(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.layout();
  }

  layout() {}

  // ─────────────────────────────
  // BOUNDS
  // ─────────────────────────────

  contains(gx, gy) {
    return gx > this.x && gx < this.x + this.w &&
           gy > this.y && gy < this.y + this.h;
  }

  // ─────────────────────────────
  // HIT TEST
  // ─────────────────────────────

  hitTest(gx, gy) {
    if (!this.visible || !this.contains(gx, gy)) return null;

    for (let i = this.children.length - 1; i >= 0; i--) {
      const hit = this.children[i].hitTest(gx, gy);
      if (hit) return hit;
    }

    return this.hitType ? { node: this, type: this.hitType } : null;
  }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update(mouse) {
    if (!this.visible) return;
    for (const child of this.children) child.update(mouse);
  }

  // 🧊 Smooth material (with physics feel)
  updateMaterial(target) {
    const stiffness = 0.2;
    const damping   = 0.3;

    this.materialVelocity =
      this.materialVelocity * damping +
      (target - this.materialProgress) * stiffness;

    this.materialProgress += this.materialVelocity;
  }

  // 🧠 Elevation (depth)
  updateElevation(target) {
    const stiffness = 0.25;
    const damping   = 0.7;

    this.elevationVelocity =
      this.elevationVelocity * damping +
      (target - this.elevation) * stiffness;

    this.elevation += this.elevationVelocity;
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(g) {
    if (!this.visible) return;

    for (const child of this.children) {
      child.render(g);
    }
  }
}