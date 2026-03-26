import { R }            from "../../core/runtime.js";
import { UI_ELEMENTS } from "../../core/operator.js";

const OPTIONS = [
  { id: "png", label: "Screenshot  (.png)" },
  { id: "csv", label: "Spreadsheet  (.csv)" },
];

const BTN_W  = 110;
const BTN_H  = 22;
const ITEM_H = 30;
const MENU_W = 160;

const DAYS   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHIFTS = ["lunch", "dinner"];

export class ExportButton {

  constructor() {
    this.x = 0; this.y = 0;
    this.w = BTN_W; this.h = BTN_H;

    this.hovered     = false;
    this.menuOpen    = false;
    this.menuHovered = null;

    this._p5 = null;
  }

  // ─────────────────────────────
  // GEOMETRY
  // ─────────────────────────────

  setGeometry(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; }

  // ─────────────────────────────
  // HIT TEST
  // ─────────────────────────────

  hitTest(mx, my) {
    if (mx > this.x && mx < this.x + this.w &&
        my > this.y && my < this.y + this.h) return true;
    if (this.menuOpen) return this._menuHitTest(mx, my);
    return false;
  }

  _menuHitTest(mx, my) {
    const mx0 = this.x + this.w - MENU_W;
    const my0 = this.y + this.h + 4;
    return mx > mx0 && mx < mx0 + MENU_W &&
           my > my0 && my < my0 + OPTIONS.length * ITEM_H;
  }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update(p5, mouse) {
    this._p5 = p5;
    this.setGeometry(p5.width - this.w - 12, 8, this.w, this.h);
    this.updateHover(mouse);
  }

  updateHover(mouse) {
    const mx = mouse.x;
    const my = mouse.y;

    this.hovered = mx > this.x && mx < this.x + this.w &&
                   my > this.y && my < this.y + this.h;

    this.menuHovered = null;
    if (this.menuOpen) {
      const mx0 = this.x + this.w - MENU_W;
      const my0 = this.y + this.h + 4;
      const i   = Math.floor((my - my0) / ITEM_H);
      if (mx > mx0 && mx < mx0 + MENU_W && i >= 0 && i < OPTIONS.length) {
        this.menuHovered = i;
      }
    }
  }

  // ─────────────────────────────
  // CLICK
  // ─────────────────────────────

  onClick(mx, my) {
    if (this.menuOpen && this._menuHitTest(mx, my)) {
      const i = this.menuHovered;
      if (i !== null) {
        this.menuOpen = false;
        this._runExport(OPTIONS[i].id);
      }
      return;
    }
    if (mx > this.x && mx < this.x + this.w &&
        my > this.y && my < this.y + this.h) {
      this.menuOpen = !this.menuOpen;
    } else {
      this.menuOpen = false;
    }
  }

  closeMenu() { this.menuOpen = false; }

  // ─────────────────────────────
  // EXPORT
  // ─────────────────────────────

  _runExport(id) {
    if (id === "png") this._exportPNG();
    if (id === "csv") this._exportCSV();
  }

  _exportPNG() {
    // Wait one full frame so the canvas has the composited image.
    requestAnimationFrame(() => {
      const src = document.querySelector("canvas");
      if (!src) return;

      // Crop to the grid bounds if available, otherwise full canvas
      const grid = UI_ELEMENTS.schedule?.grid;
      const pad  = 12;
      const sx   = grid ? Math.max(0, grid.x - pad)              : 0;
      const sy   = grid ? Math.max(0, grid.y - pad)              : 0;
      const sw   = grid ? Math.min(grid.w + pad * 2, src.width)  : src.width;
      const sh   = grid ? Math.min(grid.h + pad * 2, src.height) : src.height;

      const tmp    = document.createElement("canvas");
      tmp.width    = sw;
      tmp.height   = sh;
      const ctx    = tmp.getContext("2d");
      ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);

      tmp.toBlob(blob => {
        _triggerDownload(URL.createObjectURL(blob), `schedule_${_stamp()}.png`);
      }, "image/png");
    });
  }

  _exportCSV() {
    const assignments = R.appState.draft?.assignments ?? {};
    const employees   = R.appState.employees          ?? [];
    const slotCounts  = R.appState.config?.slotCounts ?? {};
    const empMap      = Object.fromEntries(employees.map(e => [e.id, e.name]));

    // Max slots across all shifts
    let maxSlots = 3;
    for (let d = 0; d < 7; d++) {
      for (const shift of SHIFTS) {
        const n = slotCounts[`${d}_${shift}`] ?? 3;
        if (n > maxSlots) maxSlots = n;
      }
    }
    for (const slotId of Object.keys(assignments)) {
      const idx = parseInt(slotId.split("_")[2]);
      if (!isNaN(idx) && idx + 1 > maxSlots) maxSlots = idx + 1;
    }

    // Layout: rows = Shift + Slot, columns = days
    // Row 0: header  — "" | "" | Mon | Tue | Wed | Thu | Fri | Sat | Sun
    // Then per shift, one row per slot:
    //   "Lunch" | "Slot 1" | emp... | emp...
    //   ""      | "Slot 2" | emp... | emp...

    const header = ["Shift", "Slot", ...DAYS];
    const rows   = [header];

    for (const shift of SHIFTS) {
      for (let s = 0; s < maxSlots; s++) {
        const row = [
          s === 0 ? _cap(shift) : "",   // shift label only on first slot row
          `Slot ${s + 1}`,
        ];
        for (let d = 0; d < 7; d++) {
          const capacity = slotCounts[`${d}_${shift}`] ?? 3;
          if (s >= capacity) { row.push(""); continue; }
          const empId = assignments[`${d}_${shift}_${s}`];
          row.push(empId ? (empMap[empId] ?? "") : "");
        }
        rows.push(row);
      }
      // Blank separator row between shifts
      rows.push(Array(2 + DAYS.length).fill(""));
    }

    const bom  = "\uFEFF";
    const csv  = bom + rows.map(r => r.map(_cell).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    _triggerDownload(URL.createObjectURL(blob), `schedule_${_stamp()}.csv`);
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(g) {
    g.push();
    g.noStroke();
    g.fill(this.hovered ? "#e06a00" : "#fba700");
    g.rect(this.x, this.y, this.w, this.h, 5);

    g.fill("#111");
    g.textFont(R.assets.fonts["Bold"]);
    g.textSize(11);
    g.textAlign(g.LEFT, g.CENTER);
    g.text("⬇  Export", this.x + 10, this.y + this.h / 2 - 1);

    g.fill(this.menuOpen ? "#111" : "#11111188");
    g.textAlign(g.RIGHT, g.CENTER);
    g.text(this.menuOpen ? "▲" : "▼", this.x + this.w - 8, this.y + this.h / 2 - 1);
    g.pop();

    if (this.menuOpen) this._renderMenu(g);
  }

  _renderMenu(g) {
    const mx0  = this.x + this.w - MENU_W;
    const my0  = this.y + this.h + 4;
    const totH = OPTIONS.length * ITEM_H;

    g.push();
    g.noStroke(); g.fill(0, 80);
    g.rect(mx0 + 3, my0 + 3, MENU_W, totH, 6);
    g.fill("#1e1e1e"); g.stroke("#444"); g.strokeWeight(1);
    g.rect(mx0, my0, MENU_W, totH, 6);

    OPTIONS.forEach((opt, i) => {
      const iy  = my0 + i * ITEM_H;
      const hov = this.menuHovered === i;

      g.noStroke();
      if (hov) {
        g.fill("#fba700");
        if (i === 0)                       g.rect(mx0 + 1, iy + 1, MENU_W - 2, ITEM_H - 1, 5, 5, 0, 0);
        else if (i === OPTIONS.length - 1) g.rect(mx0 + 1, iy,     MENU_W - 2, ITEM_H - 1, 0, 0, 5, 5);
        else                               g.rect(mx0 + 1, iy,     MENU_W - 2, ITEM_H);
      }

      if (i < OPTIONS.length - 1) {
        g.stroke("#333"); g.strokeWeight(1);
        g.line(mx0 + 8, iy + ITEM_H, mx0 + MENU_W - 8, iy + ITEM_H);
      }

      g.noStroke();
      g.fill(hov ? "#111" : "#ccc");
      g.textFont(R.assets.fonts["Medium"]); g.textSize(12);
      g.textAlign(g.LEFT, g.CENTER);
      g.text(opt.label, mx0 + 12, iy + ITEM_H / 2);
    });

    g.pop();
  }
}

// ─────────────────────────────
// HELPERS
// ─────────────────────────────

function _pad(n)  { return String(n).padStart(2, "0"); }
function _cap(s)  { return s.charAt(0).toUpperCase() + s.slice(1); }
function _stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${_pad(d.getMonth() + 1)}-${_pad(d.getDate())}`;
}

// Semicolon separator — Excel in European locales uses ; not ,
// Quotes the cell if it contains ; " or newline
function _cell(v) {
  const s = String(v ?? "");
  return s.includes(";") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function _triggerDownload(url, filename) {
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
