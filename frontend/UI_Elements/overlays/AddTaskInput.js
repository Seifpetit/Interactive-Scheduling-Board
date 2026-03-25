import { TextInput } from "../base/TextInput.js";

// ─────────────────────────────────────────────────────────────────────────────
// AddTaskInput
// DOM TextInput positioned over the (+) AddButton in the TaskTray.
// On submit → commands.addTask(name).
// Pattern mirrors InlineInput from the restaurant scheduler.
// ─────────────────────────────────────────────────────────────────────────────

export class AddTaskInput {
  constructor(commands) {
    this.commands = commands;
    this.active   = false;

    this.textInput = new TextInput({
      placeholder: "Task name…",
      onSubmit: (val) => this._commit(val),
      onCancel: ()    => this.cancel(),
    });
  }

  // ─────────────────────────────
  // OPEN
  // btn      — AddButton (local tray coords: .x .y .w .h)
  // trayX/Y  — global tray origin
  // scrollY  — current tray scroll offset
  // ─────────────────────────────

  open(btn, trayX, trayY, scrollY) {
    if (this.active) this.cancel();

    const canvas = document.querySelector("canvas");
    const pad    = 6;

    this.textInput.setGeometry(
      trayX + btn.x + pad,
      trayY + btn.y - scrollY + pad,
      btn.w - pad * 2,
      btn.h - pad * 2,
      canvas
    );

    this.textInput.setValue("");
    this.textInput.focus(canvas);
    this.active = true;
  }

  // ─────────────────────────────
  // COMMIT / CANCEL
  // ─────────────────────────────

  _commit(val) {
    const name = val?.trim();
    if (name) this.commands.addTask(name);
    this._cleanup();
  }

  cancel() { this._cleanup(); }

  _cleanup() {
    this.textInput.blur();
    this.textInput.clear();
    this.active = false;
  }

  // ─────────────────────────────
  // RENDER — highlight box on gOverlay while active
  // ─────────────────────────────

  render(g) {
    if (!this.active) return;
    const t = this.textInput;
    g.push();
    g.noStroke();
    g.fill("#0d0d1a");
    g.rect(t.x - 2, t.y - 2, t.w + 4, t.h + 4, 6);
    g.noFill();
    g.stroke("#4a90d9");
    g.strokeWeight(1.5);
    g.rect(t.x - 2, t.y - 2, t.w + 4, t.h + 4, 6);
    g.pop();
  }
}
