import { R }                        from "./core/runtime.js";
import { initState }                from "./core/boot.js";
import { updateFrame, renderFrame } from "./core/operator.js";

new window.p5(p5 => {

  let gMain, gOverlay;

  // ─────────────────────────────────────────
  // PRELOAD
  // ─────────────────────────────────────────
  p5.preload = () => {
    R.assets.fonts["Thin"]      = p5.loadFont('./assets/font/MADE TOMMY Thin_PERSONAL USE.otf');
    R.assets.fonts["Light"]     = p5.loadFont('./assets/font/MADE TOMMY Light_PERSONAL USE.otf');
    R.assets.fonts["Regular"]   = p5.loadFont('./assets/font/MADE TOMMY Regular_PERSONAL USE.otf');
    R.assets.fonts["Medium"]    = p5.loadFont('./assets/font/MADE TOMMY Medium_PERSONAL USE.otf');
    R.assets.fonts["Bold"]      = p5.loadFont('./assets/font/MADE TOMMY Bold_PERSONAL USE.otf');
    R.assets.fonts["ExtraBold"] = p5.loadFont('./assets/font/MADE TOMMY ExtraBold_PERSONAL USE.otf');
  };

  // ─────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────
  p5.setup = () => { 
    p5.createCanvas(window.innerWidth, window.innerHeight);
    p5.noSmooth();
    p5.pixelDensity(1);
    p5.canvas.focus();

    gMain    = p5.createGraphics(p5.width, p5.height);
    gOverlay = p5.createGraphics(p5.width, p5.height);

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
    // Smooth progress bar
    const target = R.transition.progress;
    R.transition._displayProgress = R.transition._displayProgress ?? 0;
    R.transition._displayProgress +=
      (target - R.transition._displayProgress) * 0.06;

    const cx = p5.width  / 2;
    const cy = p5.height / 2;
    const barW = Math.min(p5.width * 0.6, 600);

    p5.background("#1c1c1c");
    p5.noStroke();

    // Label
    p5.fill("#92ba00");
    p5.textSize(26);
    p5.textAlign(p5.CENTER, p5.CENTER);
    p5.text("LOADING", cx, cy - 30);

    // Track
    p5.fill("#333");
    p5.rect(cx - barW / 2, cy - 6, barW, 12, 6);

    // Fill
    p5.fill("#92ba00");
    p5.rect(cx - barW / 2, cy - 6,
            R.transition._displayProgress * barW, 12, 6);
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
