import { R }                        from "./core/runtime.js";
import { initState }                from "./core/boot.js";
import { updateFrame, renderFrame } from "./core/operator.js";

new window.p5(p5 => {

  let gMain, gOverlay;

  // ─────────────────────────────────────────
  // PRELOAD
  // ─────────────────────────────────────────
  p5.preload = () => {
    R.assets.fonts["Bold"]   = p5.loadFont('./assets/font/UbuntuMono-Bold.ttf');
    R.assets.fonts["Italic"] = p5.loadFont('./assets/font/UbuntuMono-Italic.ttf');
  };

  // ─────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────
  p5.setup = () => { 
    p5.createCanvas(window.innerWidth, window.innerHeight);
    p5.noSmooth();
    p5.pixelDensity(1);
    p5.canvas.focus();

    // Create graphics layers
    gMain    = p5.createGraphics(p5.width, p5.height);
    gOverlay = p5.createGraphics(p5.width, p5.height);
    //CREATE NOISE TEXTURE
    if (!R.render.noiseTex) {
      const tex = p5.createGraphics(64, 64);

      tex.loadPixels();
      for (let i = 0; i < tex.pixels.length; i += 4) {
        const v = Math.random() * 255;
        tex.pixels[i]     = v;
        tex.pixels[i + 1] = v;
        tex.pixels[i + 2] = v;
        tex.pixels[i + 3] = 20;
      }
      tex.updatePixels();

      R.render.noiseTex = tex;
    }
    R.render.bg = {
      time: 0
    };

    initState();   // async — draw loop reads R.transition.phase
  };

  // ─────────────────────────────────────────
  // DRAW LOOP
  // ─────────────────────────────────────────
  p5.draw = () => {
    if (!gMain || !gOverlay) return;

    p5.clear();

    const phase = R.transition.phase;

    // ── Blocking phases — skip normal render ─
    if (phase === "BOOTING") {
      _drawBootingScreen(p5);
      return;
    }

    if (phase === "ERROR") {
      _drawErrorScreen(p5);
      return;
    }

    // ── Normal frame ─────────────────────────
    updateFrame(p5);

    gMain.clear();
    gOverlay.clear();

    renderFrame(p5, { gMain, gOverlay });

    p5.background("#394457");
    p5.image(gMain,    0, 0);
    p5.image(gOverlay, 0, 0);

    // ── FETCHING overlay — UI stays visible ──
    if (phase === "FETCHING") {
      _drawFetchingOverlay(p5);
    }

    // ── Fade-in after any transition ─────────
    if (R.transition.fadeAlpha > 0) {
      p5.noStroke();
      p5.fill(0, R.transition.fadeAlpha * 220);
      p5.rect(0, 0, p5.width, p5.height);
    }

    // Consume wheel delta
    R.input.mouse.wheelDelta = 0;
  };

  // ─────────────────────────────────────────
  // BOOTING SCREEN
  // ─────────────────────────────────────────
  function _drawBootingScreen(p5) {
    const target = R.transition.progress ?? 0;
    R.transition._displayProgress = R.transition._displayProgress ?? 0;
    R.transition._displayProgress += (target - R.transition._displayProgress) * 0.08;

    const t = R.transition._displayProgress;

    p5.background("#111315");
    p5.noStroke();

    const W = p5.width;
    const H = p5.height;

    // Layout
    const boardX = W * 0.16;
    const boardY = H * 0.14;
    const boardW = W * 0.72;
    const boardH = H * 0.72;

    const trayW  = boardW * 0.18;
    const gridX  = boardX + trayW + 18;
    const gridY  = boardY + 56;
    const gridW  = boardW - trayW - 30;
    const gridH  = boardH - 76;

    // --- helpers ---
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const ease = (x) => {
      x = clamp01(x);
      return x * x * (3 - 2 * x);
    };
    const phase = (a, b) => ease((t - a) / (b - a));

    const shellP   = phase(0.00, 0.22);
    const headerP  = phase(0.10, 0.38);
    const columnP  = phase(0.22, 0.70);
    const lineP    = phase(0.34, 0.82);
    const sweepP   = phase(0.78, 1.00);

    // --- backdrop veil ---
    p5.fill(255, 255, 255, 8);
    p5.rect(0, 0, W, H);

    // --- outer board shell ---
    p5.push();
    p5.translate(0, (1 - shellP) * 10);
    p5.fill(28, 32, 36, 220 * shellP);
    p5.rect(boardX, boardY, boardW, boardH, 24);

    p5.fill(255, 255, 255, 10 * shellP);
    p5.rect(boardX + 1, boardY + 1, boardW - 2, boardH - 2, 24);
    p5.pop();

    // --- tray silhouette ---
    p5.push();
    p5.translate(0, (1 - shellP) * 8);
    p5.fill(34, 39, 44, 210 * shellP);
    p5.rect(boardX + 14, boardY + 14, trayW - 8, boardH - 28, 20);

    // ghost task cards
    const cardCount = 4;
    for (let i = 0; i < cardCount; i++) {
      const yy = boardY + 34 + i * 86;
      const a = 32 + i * 10;
      p5.fill(110, 170, 255, a * shellP);
      p5.rect(boardX + 28, yy, trayW - 36, 54, 14);
    }
    p5.pop();

    // --- top pills / headers ---
    const pillCount = 7;
    const gap = 10;
    const pillW = (gridW - gap * (pillCount - 1)) / pillCount;
    const pillY = boardY + 16;

    for (let i = 0; i < pillCount; i++) {
      const local = ease((headerP * 1.15) - i * 0.06);
      if (local <= 0) continue;

      const x = gridX + i * (pillW + gap);
      const y = pillY + (1 - local) * 6;

      if (i === 2) {
        p5.fill(120, 170, 255, 150 * local);
      } else {
        p5.fill(255, 255, 255, 18 * local);
      }
      p5.rect(x, y, pillW, 24, 12);
    }

    // --- day columns ---
    const cols = 7;
    const colGap = 10;
    const colW = (gridW - colGap * (cols - 1)) / cols;

    for (let i = 0; i < cols; i++) {
      const local = ease((columnP * 1.2) - i * 0.08);
      if (local <= 0) continue;

      const x = gridX + i * (colW + colGap);
      const y = gridY + (1 - local) * 10;
      const h = gridH;

      p5.fill(255, 255, 255, 7 * local);
      p5.rect(x, y, colW, h, 16);
    }

    // --- slot rhythm lines ---
    const rows = 10;
    for (let r = 0; r < rows; r++) {
      const local = ease((lineP * 1.15) - r * 0.07);
      if (local <= 0) continue;

      const yy = gridY + 18 + r * ((gridH - 36) / rows);

      p5.fill(255, 255, 255, 18 * local);
      p5.rect(gridX + 10, yy, gridW - 20, 2, 1);
    }

    // --- soft focused blocks inside some columns ---
    if (t > 0.45) {
      const blockAlpha = 55 * phase(0.45, 0.85);
      p5.fill(110, 170, 255, blockAlpha);
      p5.rect(gridX + colW * 0.15, gridY + 90, colW * 0.72, 42, 12);
      p5.rect(gridX + (colW + colGap) * 2 + colW * 0.12, gridY + 180, colW * 0.75, 54, 12);
      p5.rect(gridX + (colW + colGap) * 5 + colW * 0.10, gridY + 130, colW * 0.78, 36, 12);
    }

    // --- final activation sweep ---
    if (sweepP > 0) {
      const sweepX = boardX - 120 + (boardW + 240) * sweepP;
      for (let i = 0; i < 7; i++) {
        p5.fill(255, 255, 255, (18 - i * 2) * sweepP);
        p5.rect(sweepX - i * 18, boardY + 8, 16, boardH - 16, 10);
      }
    }

    // --- subtle loading label ---
    p5.fill(255, 255, 255, 90);
    p5.textAlign(p5.CENTER, p5.CENTER);
    p5.textSize(12);
    p5.text("Preparing your board", W * 0.5, H * 0.88);
  }

  // ─────────────────────────────────────────
  // FETCHING OVERLAY  (non-blocking — UI visible underneath)
  // ─────────────────────────────────────────
  function _drawFetchingOverlay(p5) {
    const cx = p5.width  / 2;
    const cy = p5.height / 2;

    // Dim
    p5.noStroke();
    p5.fill(0, 160);
    p5.rect(0, 0, p5.width, p5.height);

    // Spinner — rotating arc
    const t     = Date.now() / 1000;
    const r     = 28;
    const start = t * 3;
    const end   = start + 2.2;
    p5.noFill();
    p5.stroke("#92ba00");
    p5.strokeWeight(3);
    p5.arc(cx, cy - 20, r * 2, r * 2, start, end);
    p5.noStroke();

    // Message
    if (R.transition.message) {
      p5.fill("#ccc");
      p5.textSize(13);
      p5.textAlign(p5.CENTER, p5.CENTER);
      p5.text(R.transition.message, cx, cy + 22);
    }

    // Progress bar
    const barW = 200;
    p5.fill("#333");
    p5.rect(cx - barW / 2, cy + 44, barW, 4, 2);
    p5.fill("#92ba00");
    p5.rect(cx - barW / 2, cy + 44, R.transition.progress * barW, 4, 2);
  }

  // ─────────────────────────────────────────
  // ERROR SCREEN
  // ─────────────────────────────────────────
  function _drawErrorScreen(p5) {
    p5.background("#1c1c1c");
    p5.noStroke();

    p5.fill("#e05555");
    p5.textSize(18);
    p5.textAlign(p5.CENTER, p5.CENTER);
    p5.text("SOMETHING WENT WRONG", p5.width / 2, p5.height / 2 - 24);

    p5.fill("#888");
    p5.textSize(13);
    p5.text(R.transition.error, p5.width / 2, p5.height / 2 + 10);
  }

  // ─────────────────────────────────────────
  // LOAGING / RETRY EVENT
  // ─────────────────────────────────────────
  window.addEventListener("retry_load", async () => {
    console.log("[auth] retrying state load...");
    await loadState();
  });
  // ─────────────────────────────────────────
  // WINDOW RESIZE
  // ─────────────────────────────────────────
  p5.windowResized = () => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    gMain?.resizeCanvas(p5.width, p5.height);
    gOverlay?.resizeCanvas(p5.width, p5.height);
  };

  // ─────────────────────────────────────────
  // MOUSE WHEEL
  // ─────────────────────────────────────────
  p5.mouseWheel = (event) => {
    R.input.mouse.wheelDelta = (R.input.mouse.wheelDelta ?? 0) + event.deltaY;
  };

  // ─────────────────────────────────────────
  // EVENT GUARDS
  // ─────────────────────────────────────────
  window.addEventListener("keydown",     (e) => { if (e.code === "Space") e.preventDefault(); });
  window.addEventListener("contextmenu", (e) => e.preventDefault());

});
