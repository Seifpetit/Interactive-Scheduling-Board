// ─────────────────────────────────────────────────────────────────────────────
// TextInput
// A real DOM <input> element positioned over the p5 canvas.
// The DOM handles: cursor, selection, copy/paste, IME, mobile keyboard.
// We draw our own decorative box in p5 around where the input sits.
// ─────────────────────────────────────────────────────────────────────────────

export class TextInput {
  constructor(opts = {}) {
    this.x = 0; this.y = 0; this.w = 0; this.h = 0;

    this.placeholder = opts.placeholder ?? "Enter value…";
    this.numeric     = opts.numeric     ?? false;

    this.focused     = false;
    this.isHovered   = false;

    // Callbacks
    this.onSubmit    = opts.onSubmit ?? null;   // called with value on Enter
    this.onCancel    = opts.onCancel ?? null;   // called on Escape

    this._el = null;
    this._canvas = null;
    this._createDOM();
  }

  // ─────────────────────────────
  // DOM SETUP
  // ─────────────────────────────

  _createDOM() {
    const el = document.createElement("input");
    el.type        = this.numeric ? "number" : "text";
    el.placeholder = this.placeholder;

    Object.assign(el.style, {
      position:        "fixed",
      zIndex:          "1000",
      border:          "none",
      outline:         "none",
      background:      "transparent",
      color:           "#ffffff",
      fontFamily:      "sans-serif",   // replaced once font loads
      fontSize:        "14px",
      padding:         "0 8px",
      boxSizing:       "border-box",
      caretColor:      "#0dc3aa",
      display:         "none",         // hidden until focused
    });

    // Enter → submit, Escape → cancel
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter")  { e.preventDefault(); this.onSubmit?.(this.value); }
      if (e.key === "Escape") { e.preventDefault(); this.onCancel?.(); }
      // Stop p5 from seeing keydown while input is focused
      e.stopPropagation();
    });

    el.addEventListener("blur", () => {
      this.focused = false;
      // Do NOT hide here — InlineInput.cancel() controls visibility
      // Hiding on blur causes double-hide race when cancel() also calls blur()
    });

    document.body.appendChild(el);
    this._el = el;
  }

  // ─────────────────────────────
  // GEOMETRY  — call whenever the context menu repositions
  // ─────────────────────────────

  setGeometry(x, y, w, h, canvas) {
    this.x = x; this.y = y; this.w = w; this.h = h;

    if (canvas) this._canvas = canvas;

    if (this._el && this._canvas) {
      const rect = this._canvas.getBoundingClientRect();
      Object.assign(this._el.style, {
        left:   (rect.left + x) + "px",
        top:    (rect.top  + y) + "px",
        width:  w + "px",
        height: h + "px",
      });
    }
  }

  // ─────────────────────────────
  // STATE
  // ─────────────────────────────

  get value() { return this._el?.value ?? ""; }

  focus(canvas) {
    if (canvas) this._canvas = canvas;
    if (!this._el) return;

    // Reposition before showing
    if (this._canvas) this.setGeometry(this.x, this.y, this.w, this.h, this._canvas);

    this._el.style.display = "block";
    this.focused = true;
    // rAF ensures the element is visible before focus — fixes re-focus after cancel
    requestAnimationFrame(() => {
      if (this._el && this.focused) {
        this._el.focus();
        this._el.select();
      }
    });
  }

  blur() {
    this._el?.blur();
    this.focused = false;
    if (this._el) this._el.style.display = "none";
  }

  clear() {
    if (this._el) this._el.value = "";
  }

  setValue(v) {
    if (this._el) {
      this._el.value = String(v);
      this._el.select();
    }
  }

  destroy() {
    this._el?.remove();
    this._el = null;
  }

  // ─────────────────────────────
  // HIT TEST  (p5 canvas coords)
  // ─────────────────────────────

  hitTest(gx, gy) {
    return gx > this.x && gx < this.x + this.w &&
           gy > this.y && gy < this.y + this.h;
  }

  // ─────────────────────────────
  // RENDER  — draws the decorative box only; the real input floats on top
  // ─────────────────────────────

  render(g) {
    g.push();
    g.stroke(this.focused  ? "#0dc3aa" :
             this.isHovered ? "#666"   : "#444");
    g.strokeWeight(this.focused ? 1.5 : 1);
    g.fill("#1a1a1a");
    g.rect(this.x, this.y, this.w, this.h, 4);
    g.pop();

    // When not focused, draw placeholder text inside the p5 box
    if (!this.focused && this.value === "") {
      g.push();
      g.noStroke();
      g.fill("#ffffff45");
      g.textSize(14);
      g.textAlign(g.LEFT, g.CENTER);
      //g.text(this.placeholder, this.x + 8, this.y + this.h / 2 + 2);
      g.pop();
    }

    this.isHovered = false;
  }
}
