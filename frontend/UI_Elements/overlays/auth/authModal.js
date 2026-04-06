import { R }            from "../../../core/runtime.js";
import { UINode }       from "../../base/UINode.js";
import { TextInput }    from "../../base/TextInput.js";
import { AuthButtons }  from "./authButtons.js";

export class AuthModal extends UINode {

  constructor() {
    super();

    this.mode = "signup";
    this.error = "";

    this.emailInput = new TextInput({ placeholder: "Email" });
    this.passwordInput = new TextInput({ placeholder: "Password", type: "password" });

    this.buttons = new AuthButtons(this);

    this._canvas = null;
    this._didFocus = false;
  }

  // ───────────────
  // LAYOUT
  // ───────────────

  layout() {
    const boxW = 320;
    const boxH = 220;

    const W = this._canvas?.width || window.innerWidth;
    const H = this._canvas?.height || window.innerHeight;

    this.boxX = W / 2 - boxW / 2;
    this.boxY = H / 2 - boxH / 2;
    this.boxW = boxW;
    this.boxH = boxH;

    const inputX = this.boxX + 30;

    this.emailInput.setGeometry(inputX, this.boxY + 70, 260, 32, this._canvas);
    this.passwordInput.setGeometry(inputX, this.boxY + 120, 260, 32, this._canvas);
  }

  // ───────────────
  // STATE
  // ───────────────

  open(props = {}) {
    this.mode = props.mode || "login";
    this.error = "";

    this.emailInput.clear();
    this.passwordInput.clear();

    R.openModal("auth", props);
    this._didFocus = false;
  }

  close() {
    this.emailInput.blur();
      this.emailInput.hide();
    this.passwordInput.blur();
      this.passwordInput.hide();
    this._didFocus = false;
    this.emailInput.clear();
    this.passwordInput.clear();
    R.closeModal();
  }

  setMode(mode) {
    if (this.mode === mode) return;

    this.mode = mode;
    this.error = "";

    this.emailInput.clear();
    this.passwordInput.clear();

    this._didFocus = false;
  }
  // ───────────────
  // INPUT
  // ───────────────

  handleClick(gx, gy) {

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

    if (this.buttons.handleClick(gx, gy)) return;

    // click outside
    const inside =
      gx > this.boxX && gx < this.boxX + this.boxW &&
      gy > this.boxY && gy < this.boxY + this.boxH;

    if (!inside) this.close();
  }

  // ───────────────
  // ACTIONS
  // ───────────────

  async submit() {
    const endpoint = this.mode === "login" ? "/login" : "/signup";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: this.emailInput.value,
          password: this.passwordInput.value
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AUTH ERROR:", data); 
        this.error = data.detail || JSON.stringify(data);
        return;
      }

      localStorage.setItem("planner_token", data.token);
      R.auth.token = data.token;
      R.auth.email = this.emailInput.value;  // ← add this
      localStorage.setItem("planner_email", this.emailInput.value);

      this.close();
      window.dispatchEvent(new Event("retry_load"));

    } catch (e) {
      this.error = "Network error";
    }
  }

  // ───────────────
  // RENDER
  // ───────────────

  render(g) {
    if (!R.modal.open || R.modal.type !== "auth") return;

    if (!this._canvas) {
      this._canvas = document.querySelector("canvas");
    }

    this.layout();

    if (!this._didFocus) {
      this.emailInput.focus(this._canvas);
      this._didFocus = true;
    }

    const W = g.width;
    const H = g.height;

    // BACKDROP
    g.push();
    g.fill(0, 130);
    g.noStroke();
    g.rect(0, 0, W, H);
    g.pop();

    // BOX
    g.push();
    g.fill("#1e1e1e");
    g.stroke("#444");
    g.rect(this.boxX, this.boxY, this.boxW, this.boxH, 10);
    g.pop();

    // INPUTS
    this.emailInput.render(g);
    this.passwordInput.render(g);

    // BUTTON
    this.buttons.render(g);

    // ERROR
    if (this.error) {
      g.push();
      g.fill("#ff4d4d");
      g.textAlign(g.CENTER);
      g.textSize(12);
      g.text(this.error, W / 2, this.boxY + 155);
      g.pop();
    }

    // MODE SWITCH
    g.push();
    g.fill("#888");
    g.textAlign(g.CENTER);
    g.textSize(11);

    g.pop();
  }
}