export class AuthButtons {
  constructor(modal) {
    this.modal = modal;

    this.sliderX = 0; // animated position
  }

  // ─────────────
  // GEOMETRY
  // ─────────────

  getTabContainer() {
    const w = 260;
    const h = 34;

    return {
      x: this.modal.boxX + (this.modal.boxW - w) / 2,
      y: this.modal.boxY + 20,
      w,
      h
    };
  }

  getPrimaryRect() {
    return {
      x: this.modal.boxX + 30,
      y: this.modal.boxY + 170,
      w: 260,
      h: 30
    };
  }

  // ─────────────
  // CLICK
  // ─────────────

  handleClick(gx, gy) {
    const tab = this.getTabContainer();

    const half = tab.w / 2;

    const inside =
      gx > tab.x && gx < tab.x + tab.w &&
      gy > tab.y && gy < tab.y + tab.h;

    if (inside) {
      const clickedLeft = gx < tab.x + half;
      this.modal.setMode(clickedLeft ? "login" : "signup");
      return true;
    }

    // submit
    const p = this.getPrimaryRect();

    if (
      gx > p.x && gx < p.x + p.w &&
      gy > p.y && gy < p.y + p.h
    ) {
      this.modal.submit();
      return true;
    }

    return false;
  }

  // ─────────────
  // RENDER
  // ─────────────

  render(g) {
    const tab = this.getTabContainer();

    const half = tab.w / 2;

    // 🔥 target position
    const targetX =
      this.modal.mode === "login"
        ? tab.x
        : tab.x + half;

    // 🔥 smooth interpolation
    this.sliderX += (targetX - this.sliderX) * 0.2;

    // BACKGROUND
    g.push();
    g.fill("#2a2a2a");
    g.noStroke();
    g.rect(tab.x, tab.y, tab.w, tab.h, 8);
    g.pop();

    // 🔥 SLIDER
    g.push();
    g.fill("#0dc3aa");
    g.noStroke();
    g.rect(this.sliderX, tab.y, half, tab.h, 8);
    g.pop();

    // TEXT
    g.push();
    g.textAlign(g.CENTER, g.CENTER);

    // login
    g.fill(this.modal.mode === "login" ? 0 : "#aaa");
    g.text("Login", tab.x + half / 2, tab.y + tab.h / 2);

    // signup
    g.fill(this.modal.mode === "signup" ? 0 : "#aaa");
    g.text("Sign Up", tab.x + half + half / 2, tab.y + tab.h / 2);

    g.pop();

    // PRIMARY BUTTON
    const p = this.getPrimaryRect();

    g.push();
    g.fill("#0dc3aa");
    g.noStroke();
    g.rect(p.x, p.y, p.w, p.h, 6);

    g.fill(0);
    g.textAlign(g.CENTER, g.CENTER);
    g.text(
      "SUBMIT",
      p.x + p.w / 2,
      p.y + p.h / 2
    );
    g.pop();
  }
}