import { UINode }         from "../base/UINode.js";
import { UIButton }       from "../base/UIButton.js";
import { TextInput }      from "../base/TextInput.js";
import { renderMaterial } from "../../core/render/materials/materialRenderer.js";
import { R }              from "../../core/runtime.js";

const ACCENT = "#0dc3aa";
const BG     = "#1a1a2e";
const DARK   = "#0d0d1a";

// ─────────────────────────────────────────────────────────────────────────────
// CoachModal — step-based review modal using material system throughout
// ─────────────────────────────────────────────────────────────────────────────
export class CoachModal extends UINode {
  constructor() {
    super();

    this._step          = 0;
    this._answers       = {};
    this._canvas        = null;
    this._cachedStepKey = null;
    this._optionButtons = [];

    // text input for "Other"
    this._otherInput = new TextInput({ placeholder: "Tell me more..." });
    this._otherInput.onSubmit = () => this._confirmCurrent();

    // confirm UIButton
    this._confirmButton = new UIButton("Next →", () => this._confirmCurrent(), {
      color:      ACCENT,
      textColor:  "#dedede",
      hoverColor: ACCENT,
      hoverText:  "#dedede",
      radius:     8,
      textSize:   18,
    });

    // box material
    this.materialProgress = 0;
    this.materialVelocity = 0;
  }

  // ─────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────

  open(entry) {
    this._step          = 0;
    this._answers       = {};
    this._cachedStepKey = null;
    this._optionButtons = [];
    this._otherInput.clear();
    this._otherInput.hide?.();
    R.openModal("coach", { entry });
  }

  close() {
    this._otherInput.blur();
    this._otherInput.hide?.();
    R.closeModal();
  }

  _complete() {
    const cb = R.modal?.props?.onComplete;
    if (cb) cb(this._answers);
    this.close();
  }

  // ─────────────────────────────
  // STEP DEFINITIONS
  // ─────────────────────────────

  _getSteps() {
    const outcome = this._answers.outcome;
    if (!outcome)          return ["outcome"];
    if (outcome === "no")  return ["outcome", "why"];
    return ["outcome", "onTime", "duration", "effort"];
  }

  _getStepDef(stepKey) {
    const defs = {
      outcome: {
        question: "Did you do it?",
        options: [
          { label: "✓  Yes",     value: "yes"     },
          { label: "~  Partial", value: "partial"  },
          { label: "✗  No",      value: "no"       },
        ],
      },
      why: {
        question: "Why not?",
        options: [
          { label: "Too tired",         value: "too_tired" },
          { label: "Forgot",            value: "forgot"    },
          { label: "Something came up", value: "came_up"   },
          { label: "Avoided it",        value: "avoided"   },
          { label: "Other...",          value: "other"     },
        ],
      },
      onTime: {
        question: "Did you start on time?",
        options: [
          { label: "On time", value: "yes"   },
          { label: "Late",    value: "late"  },
          { label: "Early",   value: "early" },
        ],
      },
      duration: {
        question: "How long did it take?",
        options: [
          { label: "15m",  value: 15  },
          { label: "30m",  value: 30  },
          { label: "45m",  value: 45  },
          { label: "1h",   value: 60  },
          { label: "1.5h", value: 90  },
          { label: "2h+",  value: 120 },
        ],
      },
      effort: {
        question: "How much effort?",
        options: [
          { label: "1", value: 1 },
          { label: "2", value: 2 },
          { label: "3", value: 3 },
          { label: "4", value: 4 },
          { label: "5", value: 5 },
        ],
      },
    };
    return defs[stepKey] ?? null;
  }

  // ─────────────────────────────
  // OPTION BUTTON CACHE
  // ─────────────────────────────

  _rebuildOptions(stepKey, def) {
    if (this._cachedStepKey === stepKey) return;
    this._cachedStepKey = stepKey;

    this._optionButtons = def.options.map(opt => {
      const btn = new UIButton(opt.label, () => {
        const key = this._currentKey();
        this._answers[key] = opt.value;
        this._cachedStepKey = null; // refresh selected state next frame

        if (opt.value === "other") {
          if (!this._canvas) this._canvas = document.querySelector("canvas");
          this._otherInput.focus(this._canvas);
        } else {
          this._otherInput.blur();
          this._otherInput.hide?.();
        }
      }, {
        color:      DARK,
        textColor:  "#888888",
        hoverColor: ACCENT,
        hoverText:  "#000000",
        radius:     8,
        textSize:   14,
      });
      btn._value = opt.value;
      return btn;
    });
  }

  // ─────────────────────────────
  // STATE HELPERS
  // ─────────────────────────────

  _currentKey()       { return this._getSteps()[this._step]; }
  _currentSelection() { return this._answers[this._currentKey()]; }

  _canConfirm() {
    const sel = this._answers[this._currentKey()];
    if (!sel) return false;
    if (sel === "other") return this._otherInput.value.trim().length > 0;
    return true;
  }

  _confirmCurrent() {
    if (!this._canConfirm()) return;

    const key = this._currentKey();
    if (this._answers[key] === "other") {
      this._answers[key] = this._otherInput.value.trim();
    }

    const steps = this._getSteps();
    if (this._step < steps.length - 1) {
      this._step++;
      this._cachedStepKey = null;
      this._otherInput.clear();
      this._otherInput.hide?.();
    } else {
      this._complete();
    }
  }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update(mouse) {
    if (!R.modal.open || R.modal.type !== "coach") return;

    const stepKey = this._currentKey();
    const def     = this._getStepDef(stepKey);
    if (!def) return;

    this._rebuildOptions(stepKey, def);

    const sel = this._currentSelection();

    for (const btn of this._optionButtons) {
      btn.selected = btn._value === sel;
      btn.update(mouse);
    }

    const canGo = this._canConfirm();
    this._confirmButton.disabled  = !canGo;
    this._confirmButton.color     = canGo ? ACCENT : "#2a2a2a";
    this._confirmButton.textColor = canGo ? "#000"  : "#444";
    this._confirmButton.update(mouse);

    // smooth box material in
    const stiffness = 0.18, damping = 0.35;
    this.materialVelocity =
      this.materialVelocity * damping + (0.4 - this.materialProgress) * stiffness;
    this.materialProgress += this.materialVelocity;
  }

  // ─────────────────────────────
  // HANDLE CLICK (fallback)
  // ─────────────────────────────

  handleClick(gx, gy) {
    if (!R.modal.open || R.modal.type !== "coach") return;
    // UIButton.update handles clicks via justPressed — this is a safety fallback
    if (this._confirmButton?.contains(gx, gy)) this._confirmCurrent();
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(g) {
    if (!R.modal.open || R.modal.type !== "coach") return;
    if (!this._canvas) this._canvas = document.querySelector("canvas");

    const W       = g.width;
    const H       = g.height;
    const entry   = R.modal.props?.entry;
    const stepKey = this._currentKey();
    const def     = this._getStepDef(stepKey);
    const steps   = this._getSteps();
    if (!def) return;

    // ── BACKDROP ──
    g.push();
    g.fill(0, 200);
    g.noStroke();
    g.rect(0, 0, W, H);
    g.pop();

    // ── BOX via material system ──
    const boxW = 400;
    const boxH = 340;
    const boxX = W / 2 - boxW / 2;
    const boxY = H / 2 - boxH / 2;

    g.push();
    g.translate(W / 2, H / 2);
    renderMaterial(g, {
      w:               boxW,
      h:               boxH,
      color:           BG,
      materialProgress: this.materialProgress,
      highlighted:     false,
    });
    g.pop();

    // ── STEP DOTS ──
    g.push();
    g.noStroke();
    const dotGap = 16;
    const dotsW  = steps.length * dotGap;
    let dx = W / 2 - dotsW / 2 + dotGap / 2;
    for (let i = 0; i < steps.length; i++) {
      const active = i === this._step;
      g.fill(active ? ACCENT : "#333");
      g.circle(dx, boxY + 20, active ? 8 : 5);
      dx += dotGap;
    }
    g.pop();

    // ── TASK NAME ──
    if (entry?.task?.name) {
      g.push();
      g.noStroke();
      g.fill("#ffffff33");
      g.textSize(10);
      g.textAlign(g.CENTER, g.CENTER);
      const italic = R.assets?.fonts?.["Italic"];
      if (italic) g.textFont(italic);
      g.text(entry.task.name, W / 2, boxY + 40);
      g.pop();
    }

    // ── QUESTION ──
    g.push();
    g.noStroke();
    g.fill("#ffffff");
    g.textSize(24);
    g.textAlign(g.CENTER, g.CENTER);
    const bold = R.assets?.fonts?.["Bold"];
    if (bold) g.textFont(bold);
    g.text(def.question, W / 2, boxY + 62);
    g.pop();

    // ── OPTION BUTTONS — layout + render ──
    const opts   = def.options;
    const optW   = stepKey === "effort" ? 46 : stepKey === "duration" ? 56 : 104;
    const optH   = 36;
    const optGap = 8;
    const perRow = stepKey === "effort" ? 5 : stepKey === "duration" ? 3 : Math.min(3, opts.length);
    const rows   = Math.ceil(opts.length / perRow);
    const totalW = perRow * optW + (perRow - 1) * optGap;
    const startX = W / 2 - totalW / 2;
    const startY = boxY + 88;

    this._optionButtons.forEach((btn, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      btn.setGeometry(
        startX + col * (optW + optGap),
        startY + row * (optH + optGap),
        optW, optH
      );
      btn.render(g);
    });

    // ── OTHER TEXT INPUT ──
    const sel      = this._currentSelection();
    const inputY   = startY + rows * (optH + optGap) + 6;
    if (sel === "other") {
      this._otherInput.setGeometry(boxX + 20, inputY, boxW - 40, 32, this._canvas);
      this._otherInput.render(g);
    } else {
      this._otherInput.hide?.();
    }

    // ── CONFIRM BUTTON ──
    const confirmW = 130;
    const confirmX = W / 2 - confirmW / 2;
    const confirmY = boxY + boxH - 50;
    this._confirmButton.label = steps.length - 1 === this._step ? "Done" : "Next →";
    this._confirmButton.setGeometry(confirmX, confirmY, confirmW, 34);
    this._confirmButton.render(g);
  }
}
