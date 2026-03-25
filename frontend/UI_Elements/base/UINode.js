// ─────────────────────────────────────────────────────────────────────────────
// UINode  — base class for every element in the UI tree
//
// Contract every node must follow:
//   hitType   — string identifying this node kind for resolveHit / routeInput
//   layout()  — recompute children geometry from own x/y/w/h (called by setGeometry)
//   render(g) — draw self, then call super.render(g) to walk children
//
// Traversal (update, hitTest) is handled here — nodes only override
// what is unique to them.
// ─────────────────────────────────────────────────────────────────────────────

export class UINode {

  constructor() {
    this.x = 0; this.y = 0; this.w = 0; this.h = 0;
    this.children = [];   // ordered: last = topmost z
    this.visible  = true;
    this.hitType  = null; // set by each subclass, e.g. "slot", "trayCard"
  }

  // ─────────────────────────────
  // GEOMETRY
  // ─────────────────────────────

  setGeometry(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.layout();
  }

  // Override to distribute geometry to children
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
  // Walks children last→first (topmost z first).
  // Returns { node, type } of the deepest match, or null.
  // Subclasses with sub-regions (contextBox, nameBox) override this
  // to return more specific types before calling super.
  // ─────────────────────────────

  hitTest(gx, gy) {
    if (!this.visible || !this.contains(gx, gy)) return null;

    // Walk children top-down (last child = highest z)
    for (let i = this.children.length - 1; i >= 0; i--) {
      const hit = this.children[i].hitTest(gx, gy);
      if (hit) return hit;
    }

    // No child matched — this node is the hit
    return this.hitType ? { node: this, type: this.hitType } : null;
  }

  // ─────────────────────────────
  // UPDATE  — walks children, override to add own logic before/after
  // ─────────────────────────────

  update(mouse) {
    if (!this.visible) return;
    for (const child of this.children) child.update(mouse);
  }

  // ─────────────────────────────
  // RENDER  — subclass draws self first, then calls super.render(g)
  // ─────────────────────────────

  render(g) {
    if (!this.visible) return;
    for (const child of this.children) child.render(g);
  }
}
