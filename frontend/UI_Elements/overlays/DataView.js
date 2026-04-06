import { UINode } from "../base/UINode.js";
import { R }      from "../../core/runtime.js";

const CATEGORY_COLORS = {
  study:   "#4a90d9",
  gym:     "#e2621d",
  errands: "#f5a623",
  work:    "#9b59b6",
  health:  "#27ae60",
  social:  "#e91e8c",
  other:   "#92ba00",
};

const ENERGY_COLORS = {
  high:   "#ff4444",
  medium: "#ffa500",
  low:    "#44cc44",
};

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─────────────────────────────────────────────────────────────────────────────
// derive — compute all stats from R.appState
// ─────────────────────────────────────────────────────────────────────────────
function derive() {
  const tasks      = R.appState?.tasks      ?? [];
  const placements = R.appState?.placements ?? {};

  const hoursPerCategory = {};
  const hoursPerEnergy   = { high: 0, medium: 0, low: 0 };
  const hoursPerDay      = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const dayNames         = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const [slotId, placement] of Object.entries(placements)) {
    const task     = tasks.find(t => t.id === placement.taskId);
    if (!task) continue;

    const duration = placement.customDuration ?? task.duration ?? 1;
    const cat      = task.category ?? "other";
    const energy   = task.energy   ?? "medium";
    const day      = dayNames[new Date(slotId).getDay()];

    hoursPerCategory[cat]  = (hoursPerCategory[cat] ?? 0) + duration;
    hoursPerEnergy[energy] = (hoursPerEnergy[energy] ?? 0) + duration;
    if (hoursPerDay[day] !== undefined) hoursPerDay[day] += duration;
  }

  const placedTaskIds  = new Set(Object.values(placements).map(p => p.taskId));
  const totalHours     = Object.values(hoursPerCategory).reduce((a, b) => a + b, 0);
  const placedCount    = placedTaskIds.size;
  const unplacedCount  = tasks.length - placedCount;

  return { tasks, placements, hoursPerCategory, hoursPerEnergy, hoursPerDay, totalHours, placedCount, unplacedCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// DataView — UINode
// ─────────────────────────────────────────────────────────────────────────────
export class DataView extends UINode {
  constructor() {
    super();
    this.visible = false;
  }

  layout() {}

  update(mouse) {
    if (!this.visible) return;
  }

  render(g) {
    if (!this.visible) return;

    const d    = derive();
    const pad  = 16;
    const gap  = 12;

    // 4 equal sections: 2 top, 2 bottom
    const halfW = (this.w - pad * 2 - gap) / 2;
    const halfH = (this.h - pad * 2 - gap) / 2;

    const sections = [
      { x: this.x + pad,            y: this.y + pad,             w: halfW, h: halfH }, // top left
      { x: this.x + pad + halfW + gap, y: this.y + pad,          w: halfW, h: halfH }, // top right
      { x: this.x + pad,            y: this.y + pad + halfH + gap, w: halfW, h: halfH }, // bot left
      { x: this.x + pad + halfW + gap, y: this.y + pad + halfH + gap, w: halfW, h: halfH }, // bot right
    ];

    // ── BACKGROUND ──
    g.push();
    g.fill("#0d0d1af0");
    g.noStroke();
    g.rect(this.x, this.y, this.w, this.h, 16);
    g.pop();

    // ── SECTION 0: STAT PILLS ──
    this._renderStats(g, sections[0], d);

    // ── SECTION 1: HOURS BY CATEGORY ──
    this._renderBarChart(g, sections[1], "Hours by Category", d.hoursPerCategory, CATEGORY_COLORS);

    // ── SECTION 2: LOAD BY DAY ──
    const dayColors = {};
    DAY_ORDER.forEach(day => { dayColors[day] = day === "Sat" || day === "Sun" ? "#9b59b6" : "#4a90d9"; });
    this._renderBarChart(g, sections[2], "Load by Day", d.hoursPerDay, dayColors, DAY_ORDER);

    // ── SECTION 3: ENERGY DISTRIBUTION ──
    this._renderBarChart(g, sections[3], "Energy Distribution", d.hoursPerEnergy, ENERGY_COLORS);
  }

  // ─────────────────────────────
  // SECTION CARD WRAPPER
  // ─────────────────────────────
  _card(g, s) {
    g.push();
    g.fill("#13131f");
    g.stroke("#ffffff11");
    g.strokeWeight(1);
    g.rect(s.x, s.y, s.w, s.h, 12);
    g.pop();
  }

  _sectionTitle(g, s, title) {
    g.push();
    g.noStroke();
    g.fill("#ffffff44");
    g.textSize(10);
    g.textAlign(g.LEFT, g.TOP);
    const font = R.assets?.fonts?.["Bold"];
    if (font) g.textFont(font);
    g.text(title.toUpperCase(), s.x + 12, s.y + 10);
    g.pop();
  }

  // ─────────────────────────────
  // STAT PILLS
  // ─────────────────────────────
  _renderStats(g, s, d) {
    this._card(g, s);
    this._sectionTitle(g, s, "Overview");

    const stats = [
      { label: "Total Hours",  value: d.totalHours,       color: "#4a90d9" },
      { label: "Placed Tasks", value: d.placedCount,      color: "#0dc3aa" },
      { label: "Unplaced",     value: d.unplacedCount,    color: "#f5a623" },
      { label: "Total Tasks",  value: d.tasks.length,     color: "#9b59b6" },
    ];

    const pillW = (s.w - 24 - 8 * 3) / 4;
    const pillH = s.h - 50;
    const pillY = s.y + 32;

    stats.forEach((stat, i) => {
      const px = s.x + 12 + i * (pillW + 8);

      g.push();
      g.fill("#0d0d1a");
      g.stroke(stat.color + "44");
      g.strokeWeight(1);
      g.rect(px, pillY, pillW, pillH, 8);

      g.noStroke();
      g.fill(stat.color);
      g.textSize(22);
      g.textAlign(g.CENTER, g.CENTER);
      const font = R.assets?.fonts?.["Bold"];
      if (font) g.textFont(font);
      g.text(stat.value, px + pillW / 2, pillY + pillH / 2 - 8);

      g.fill("#ffffff55");
      g.textSize(9);
      g.text(stat.label, px + pillW / 2, pillY + pillH / 2 + 12);
      g.pop();
    });
  }

  // ─────────────────────────────
  // BAR CHART
  // ─────────────────────────────
  _renderBarChart(g, s, title, data, colors, order) {
    this._card(g, s);
    this._sectionTitle(g, s, title);

    const keys   = order ?? Object.keys(data);
    const values = keys.map(k => data[k] ?? 0);
    const max    = Math.max(...values, 1);

    const innerPad = 12;
    const topOff   = 28;
    const rowH     = (s.h - topOff - innerPad * 2) / keys.length;
    const barMaxW  = s.w - innerPad * 2 - 50; // leave room for label + value

    keys.forEach((key, i) => {
      const val  = values[i];
      const barW = (val / max) * barMaxW;
      const ry   = s.y + topOff + innerPad + i * rowH + rowH * 0.15;
      const rh   = rowH * 0.7;
      const rx   = s.x + innerPad + 36;
      const color = colors?.[key] ?? "#4a90d9";

      // label
      g.push();
      g.noStroke();
      g.fill("#ffffff66");
      g.textSize(9);
      g.textAlign(g.RIGHT, g.CENTER);
      const font = R.assets?.fonts?.["Bold"];
      if (font) g.textFont(font);
      g.text(key, s.x + innerPad + 32, ry + rh / 2);
      g.pop();

      // bar track
      g.push();
      g.noStroke();
      g.fill("#1a1a2e");
      g.rect(rx, ry, barMaxW, rh, 4);

      // bar fill
      if (barW > 0) {
        g.fill(color);
        g.rect(rx, ry, barW, rh, 4);
      }

      // value
      g.fill("#ffffff88");
      g.textSize(9);
      g.textAlign(g.LEFT, g.CENTER);
      g.text(`${val}h`, rx + barMaxW + 6, ry + rh / 2);
      g.pop();
    });
  }
}
