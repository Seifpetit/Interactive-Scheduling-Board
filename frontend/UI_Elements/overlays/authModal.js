import { R } from "../../core/runtime.js";
import { UINode } from "../base/UINode.js";
import { TextInput } from "../base/TextInput.js";

export class AuthModal extends UINode {

  constructor() {
    super();

    this.mode = "login";
    this.error = "";

    this.emailInput = new TextInput({
      placeholder: "Email"
    });

    this.passwordInput = new TextInput({
      placeholder: "Password",
      type: "password"
    });

    this._canvas = null;
    this._didFocus = false; // 🔥 prevent refocus spam
  }

  // ─────────────────────────────
  // LAYOUT
  // ─────────────────────────────

  layout() {
    const boxW = 320;
    const boxH = 220;

    const W = this._canvas?.width || window.innerWidth;
    const H = this._canvas?.height || window.innerHeight;

    this.boxX = W / 2 - boxW / 2;
    this.boxY = H / 2 - boxH / 2;

    this.boxW = boxW;
    this.boxH = boxH;

    const inputW = 260;
    const inputH = 32;
    const inputX = this.boxX + 30;

    this.emailInput.setGeometry(
      inputX,
      this.boxY + 70,
      inputW,
      inputH,
      this._canvas
    );

    this.passwordInput.setGeometry(
      inputX,
      this.boxY + 120,
      inputW,
      inputH,
      this._canvas
    );
  }

  // ─────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────

  open(props = {}) {
    this.mode = props.mode || "login";
    this.error = "";

    this.emailInput.clear();
    this.passwordInput.clear();

    R.openModal("auth", props);

    this._didFocus = false; // 🔥 allow focus next render
  }

  close() {
    this.emailInput.blur();
    this.passwordInput.blur();

    this._didFocus = false;

    R.closeModal();
  }

  // ─────────────────────────────
  // SUBMIT
  // ─────────────────────────────

  async submit() {
    const endpoint = this.mode === "login" ? "/login" : "/signup";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: this.emailInput.value,
          password: this.passwordInput.value,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        this.error = data.detail || "Auth failed";
        return;
      }

      localStorage.setItem("planner_token", data.token);
      R.auth.token = data.token;

      this.close();

      window.dispatchEvent(new Event("retry_load"));

    } catch (e) {
      this.error = "Network error";
      console.error(e);
    }
  }

  toggleMode() {
    this.mode = this.mode === "login" ? "signup" : "login";
    this.error = "";
  }

  // ─────────────────────────────
  // INPUT HANDLING
  // ─────────────────────────────

  handleClick(gx, gy) {
    // 🔥 FIRST: check inputs

    if (this.emailInput.hitTest(gx, gy)) {
      this.passwordInput.blur();
      this.emailInput.focus(this._canvas);
      return;
    }

    if (this.passwordInput.hitTest(gx, gy)) {
      this.emailInput.blur();
      this.passwordInput.focus(this._canvas);
      return;
    }
    // 🔥 BUTTON
    const btnX = this.boxX + 30;
    const btnY = this.boxY + 170;
    const btnW = 260;
    const btnH = 30;

    const insideBtn =
      gx > btnX && gx < btnX + btnW &&
      gy > btnY && gy < btnY + btnH;

    if (insideBtn) {
      this.submit();
      return;
    }

    // 🔥 OUTSIDE CLICK
    const insideBox =
      gx > this.boxX && gx < this.boxX + this.boxW &&
      gy > this.boxY && gy < this.boxY + this.boxH;

    if (!insideBox) {
      this.close();
    }
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(g) {
    if (!R.modal.open || R.modal.type !== "auth") return;

    // 🔥 CRITICAL FIX: use REAL canvas, not g.canvas
    if (!this._canvas) {
      this._canvas = document.querySelector("canvas");
    }

    this.layout();

    // 🔥 Focus ONCE when modal opens
    if (!this._didFocus) {
      this.emailInput.focus(this._canvas);
      this._didFocus = true;
    }

    const W = g.width;
    const H = g.height;

    // BACKDROP
    g.push();
    g.noStroke();
    g.fill(0, 180);
    g.rect(0, 0, W, H);
    g.pop();

    // MODAL BOX
    g.push();
    g.fill("#1e1e1e");
    g.stroke("#444");
    g.rect(this.boxX, this.boxY, this.boxW, this.boxH, 10);
    g.pop();

    // TITLE
    g.push();
    g.fill(255);
    g.textAlign(g.CENTER);
    g.textSize(16);
    g.text(
      this.mode === "login" ? "Login" : "Create Account",
      W / 2,
      this.boxY + 30
    );
    g.pop();

    // INPUT DECORATION
    this.emailInput.render(g);
    this.passwordInput.render(g);

    // BUTTON
    g.push();
    g.fill("#0dc3aa");
    g.noStroke();
    g.rect(this.boxX + 30, this.boxY + 170, 260, 30, 6);

    g.fill(0);
    g.textAlign(g.CENTER, g.CENTER);
    g.text(
      this.mode === "login" ? "Login" : "Sign Up",
      W / 2,
      this.boxY + 185
    );
    g.pop();

    // ERROR
    if (this.error) {
      g.push();
      g.fill("#ff4d4d");
      g.textAlign(g.CENTER);
      g.textSize(12);
      g.text(this.error, W / 2, this.boxY + 155);
      g.pop();
    }

    // SWITCH MODE
    g.push();
    g.fill("#888");
    g.textAlign(g.CENTER);
    g.textSize(11);
    g.text(
      this.mode === "login"
        ? "Press TAB to create account"
        : "Press TAB to login",
      W / 2,
      this.boxY + 210
    );
    g.pop();
  }
}