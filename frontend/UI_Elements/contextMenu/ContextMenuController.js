import { MENU_SCHEMAS }       from "./menuSchema.js";
import { TextInput }          from "../base/TextInput.js";
import { MenuRenderer }       from "./MenuRenderer.js";
import { RequirementsPanel }  from "./RequirementsPanel.js";

// ─────────────────────────────────────────────────────────────────────────────
// ContextMenuController
// State machine for the context menu. Owns:
//   - open / close / mode transitions
//   - hit testing and hover tracking
//   - click and keyboard routing
//   - action dispatch (emit → commands)
//
// Rendering is fully delegated:
//   MenuRenderer       → menu / submenu / input modes
//   RequirementsPanel  → requirements mode
// ─────────────────────────────────────────────────────────────────────────────

export class ContextMenuController {

  constructor(commands) {
    this.commands = commands;

    // Geometry
    this.x = 0; this.y = 0;
    this.w = 220; this.h = 0;
    this.itemH = 32;

    // State
    this.actions        = [];
    this.visible        = false;
    this.target         = null;    // { type, ref }
    this.highlighted    = null;    // hovered action index
    this.mode           = "menu";  // "menu" | "submenu" | "input" | "requirements"
    this.pendingAction  = null;    // action waiting for text input
    this._parentActions = null;    // saved when entering submenu

    // Sub-components
    this.textInput = new TextInput({
      placeholder: "Enter value…",
      onSubmit: (val) => this._submitInput(val),
      onCancel: ()    => this.close(),
    });

    this._renderer = new MenuRenderer();

    this._reqPanel = new RequirementsPanel({
      onSubmit: (ref, values) => {
        this.commands.setShiftRequirements(ref, values);
        this.close();
      },
      onClose: () => this.close(),
    });
  }

  // ─────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────

  open(payload) {
    const { x, y, type, ref } = payload;
    this.x = x; this.y = y;
    this.visible        = true;
    this.mode           = "menu";
    this.target         = { type, ref };
    this.actions        = MENU_SCHEMAS[type] ?? [];
    this.highlighted    = null;
    this.pendingAction  = null;
    this._parentActions = null;
    this.textInput.blur();
    this.textInput.clear();
  }

  openInput(payload) {
    this.open(payload);
    const action = this.actions.find(a => a.input);
    if (action) this._selectAction(action);
  }

  close() {
    this.visible        = false;
    this.target         = null;
    this.actions        = [];
    this.mode           = "menu";
    this.pendingAction  = null;
    this._parentActions = null;
    this.highlighted    = null;
    this.textInput.blur();
    this.textInput.clear();
  }

  // ─────────────────────────────
  // HIT TEST
  // ─────────────────────────────

  hitTest(mx, my) {
    if (!this.visible) return false;
    const h = this.mode === "input"        ? this.itemH + 8 + 28 + 8
            : this.mode === "requirements" ? this._reqPanel.height()
            : this.actions.length * this.itemH;
    return mx > this.x && mx < this.x + this.w &&
           my > this.y && my < this.y + h;
  }

  // ─────────────────────────────
  // HOVER
  // ─────────────────────────────

  onHover(mx, my) {
    this.highlighted = null;
    if (this.mode === "menu" || this.mode === "submenu") {
      const i = Math.floor((my - this.y) / this.itemH);
      if (i >= 0 && i < this.actions.length) this.highlighted = i;
    }
    if (this.mode === "input") {
      this.textInput.isHovered = this.textInput.hitTest(mx, my);
    }
    if (this.mode === "requirements") {
      this._reqPanel.onHover(mx, my);
    }
  }

  // ─────────────────────────────
  // CLICK
  // ─────────────────────────────

  onClick(mx, my) {
    if (!this.visible) return;

    if (this.mode === "menu" || this.mode === "submenu") {
      const action = this.actions[Math.floor((my - this.y) / this.itemH)];
      if (action) this._selectAction(action);
      return;
    }
    if (this.mode === "requirements") {
      this._reqPanel.handleClick(mx, my);
      return;
    }
    if (this.mode === "input") {
      if (!this.hitTest(mx, my)) this.close();
    }
  }

  // ─────────────────────────────
  // KEYBOARD
  // ─────────────────────────────

  handleKey(kb) {
    if (!this.visible) return;

    if (this.mode === "requirements") {
      this._reqPanel.handleKey(kb);
      return;
    }

    if (kb.key === "Escape") {
      if (this.mode === "submenu") {
        this.actions        = this._parentActions;
        this._parentActions = null;
        this.mode           = "menu";
        this.highlighted    = null;
      } else {
        this.close();
      }
    }
  }

  update() {}

  // ─────────────────────────────
  // ACTION DISPATCH
  // ─────────────────────────────

  _selectAction(action) {
    if (action.requirements) {
      this.mode = "requirements";
      this._reqPanel.open(this.target, this.x, this.y, this.w, this.itemH);
      return;
    }

    if (action.options) {
      this._parentActions = this.actions;
      this.actions        = action.options;
      this.mode           = "submenu";
      this.highlighted    = null;
      return;
    }

    if (action.input) {
      this.mode          = "input";
      this.pendingAction = action;
      this.textInput.clear();
      const pad    = 8;
      const canvas = document.querySelector("canvas");
      this.textInput.setGeometry(
        this.x + pad, this.y + this.itemH + pad / 2,
        this.w - pad * 2, 28, canvas
      );
      this.textInput.focus(canvas);
      return;
    }

    this._emit(action, null);
  }

  _submitInput(val) {
    const trimmed = val?.trim();
    if (!this.pendingAction || !trimmed) return;
    this._emit(this.pendingAction, trimmed);
  }

  _emit(action, payload) {
    if (action.id === "_back") {
      this.actions        = this._parentActions;
      this._parentActions = null;
      this.mode           = "menu";
      this.highlighted    = null;
      return;
    }
    const fn = this.commands[action.id];
    if (typeof fn !== "function") {
      console.warn("ContextMenu: no command for id:", action.id);
      this.close();
      return;
    }
    fn.call(this.commands, this.target.ref, payload);
    this.close();
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(g) {
    if (!this.visible) return;
    g.push();
    if (this.mode === "menu" || this.mode === "submenu") this._renderer.renderMenu(g, this);
    if (this.mode === "input")                           this._renderer.renderInput(g, this);
    if (this.mode === "requirements")                    this._reqPanel.render(g);
    g.pop();
  }
}
