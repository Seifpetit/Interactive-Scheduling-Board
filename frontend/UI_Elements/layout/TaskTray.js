import { UINode }   from "../base/UINode.js";
import { TaskCard }     from "../cards/TaskCard.js";
import { AddTaskInput } from "../overlays/AddTaskInput.js";
import { R }            from "../../core/runtime.js";

const PADDING = 12;
const CARD_H  = 56;
const SPACING = 10;
const BTN_H   = 40;

// ─────────────────────────────────────────────────────────────────────────────
// AddButton  — dashed (+) rect at the bottom of the tray
// hitType: "addTaskButton"
// ─────────────────────────────────────────────────────────────────────────────

class AddButton extends UINode {
  constructor() {
    super();
    this.hitType   = "addTaskButton";
    this.isHovered = false;
  }

  layout() {} // leaf

  render(g) {
    if (!this.visible) return;
    g.push();

    g.noStroke();
    g.fill(this.isHovered ? "#4a90d915" : "#00000000");
    g.rect(this.x, this.y, this.w, this.h, 8);

    // dashed border
    g.drawingContext.save();
    g.drawingContext.setLineDash([6, 4]);
    g.drawingContext.strokeStyle = this.isHovered ? "#4a90d9" : "#2a2a4a";
    g.drawingContext.lineWidth   = 1.5;
    g.drawingContext.beginPath();
    g.drawingContext.roundRect(this.x, this.y, this.w, this.h, 8);
    g.drawingContext.stroke();
    g.drawingContext.restore();

    g.noStroke();
    g.fill(this.isHovered ? "#4a90d9" : "#555577");
    g.textSize(20);
    g.textAlign(g.CENTER, g.CENTER);
    g.text("+", this.x + this.w / 2, this.y + this.h / 2 - 1);

    g.pop();
    this.isHovered = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskTray  — left sidebar, scrollable list of TaskCards + AddButton
// hitType: "taskTray"  (fallback if nothing inside matched)
// ─────────────────────────────────────────────────────────────────────────────

export class TaskTray extends UINode {
  constructor(tasks, commands) {
    super();
    this.hitType  = "taskTray";
    this.tasks    = tasks || [];
    this.commands = commands;

    // scroll
    this.scrollY              = 0;
    this.targetScrollY        = 0;
    this.contentHeight        = 0;
    this.scrollIndicatorAlpha = 0;

    // overlapping DOM input for (+) button
    this.addInput = new AddTaskInput(commands);

    // children: cards + addBtn (addBtn last = topmost z)
    this.addBtn = new AddButton();
    this._buildCards();
  }

  // ─────────────────────────────
  // BUILD
  // ─────────────────────────────

  _buildCards() {
    this.children = [];

    for (const task of this.tasks) {
      const card = new TaskCard(task);

      // 🧊 MATERIAL ASSIGNMENT
      // Start simple: all glass
      card.material = "solid";

      // OPTIONAL: category-based materials (uncomment later)
      
      if (task.category === "work")   card.material = "glass";
      if (task.category === "study")  card.material = "frost";
      if (task.category === "gym")    card.material = "glow";
      if (task.category === "social") card.material = "tint";
      
      card.parent = this;
      this.children.push(card);
    }

    this.children.push(this.addBtn);
  }

  get cards() { return this.children.filter(c => c instanceof TaskCard); }

  // ─────────────────────────────
  // LAYOUT  — called by setGeometry via UINode
  // ─────────────────────────────

  layout() {
    let curY = PADDING + 40; // 40 = header label

    for (const card of this.cards) {
      card.setGeometry(PADDING, curY, this.w - PADDING * 2, CARD_H);
      curY += CARD_H + SPACING;
    }

    this.addBtn.setGeometry(PADDING, curY, this.w - PADDING * 2, BTN_H);
    curY += BTN_H + PADDING;

    this.contentHeight = curY;
  }

  // ─────────────────────────────
  // SCROLL
  // ─────────────────────────────

  scroll(delta) {
    const max      = Math.max(0, this.contentHeight - this.h);
    const proposed = this.targetScrollY + delta * 0.5;
    if (proposed >= 0 && proposed <= max) this.targetScrollY = proposed;
    else                                  this.targetScrollY += delta * 0.15;
  }

  _clampScroll() {
    const max = Math.max(0, this.contentHeight - this.h);
    if (max === 0) { this.targetScrollY = 0; this.scrollY = 0; return; }
    if (this.targetScrollY < 0)   this.targetScrollY *= 0.9;
    if (this.targetScrollY > max) this.targetScrollY = max + (this.targetScrollY - max) * 0.9;
  }

  // ─────────────────────────────
  // HIT TEST  — translates to local+scroll space before walking children
  // ─────────────────────────────

  hitTest(gx, gy) {
    if (!this.visible || !this.contains(gx, gy)) return null;

    // convert to local scroll space
    const lx = gx - this.x;
    const ly = gy - this.y + this.scrollY;

    // walk children in local space (cards + addBtn)
    for (let i = this.children.length - 1; i >= 0; i--) {
      const hit = this.children[i].hitTest(lx, ly);
      if (hit) return hit;
    }

    return { node: this, type: this.hitType };
  }

  // ─────────────────────────────
  // EVENTS  — called by routeInput
  // ─────────────────────────────

  onHoverCard(node) {
    node.highlighted = true;
    R.interaction.hoveredTaskId = node.task.id;
  }

  onHoverAddBtn(node) { node.isHovered = true; }

  openAddInput() {
    this.addInput.open(this.addBtn, this.x, this.y, this.scrollY);
  }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update(mouse) {
    if (!this.visible) return;

    // clear hover highlight every frame — routeInput sets it again if still hovered
    R.interaction.hoveredTaskId = null;

    // sync tasks from state
    const tasks = R.appState?.tasks;
 
    if (tasks && tasks.length !== this.tasks.length) {
      this.tasks = tasks;
      this._buildCards();
      this.layout();
    }

    for (const card of this.cards) card.update(mouse);

    // smooth scroll
    this._clampScroll();
    this.scrollY += (this.targetScrollY - this.scrollY) * 0.12;
    const max = Math.max(0, this.contentHeight - this.h);
    if (this.scrollY < 0       && Math.abs(this.scrollY) < 0.5) { this.scrollY = 0;   this.targetScrollY = 0; }
    if (this.scrollY > max     && Math.abs(this.scrollY - max) < 0.5) { this.scrollY = max; this.targetScrollY = max; }

    const scrolling = Math.abs(this.targetScrollY - this.scrollY) > 0.5;
    if (scrolling) this.scrollIndicatorAlpha = 1;
    else           this.scrollIndicatorAlpha *= 0.9;
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  _renderScrubber(g) {
    if (this.contentHeight <= this.h) return;
    const ratio    = this.h / this.contentHeight;
    const indH     = this.h * ratio;
    const max      = this.contentHeight - this.h;
    const progress = max > 0 ? this.scrollY / max : 0;
    let   indY     = this.y + progress * (this.h - indH);
    indY = Math.max(this.y, Math.min(indY, this.y + this.h - indH));

    g.push();
    g.noStroke();
    g.fill(255, 255 * this.scrollIndicatorAlpha * 0.25);
    g.rect(this.x + this.w - 6, indY, 4, indH, 4);
    g.pop();
  }

  render(g, activeCard = null) {
    if (!this.visible) return;
    g.push();

    // tray background
    g.fill("#1a1a2e");
    g.stroke("#4a90d9");
    g.strokeWeight(1);
    g.rect(this.x, this.y, this.w, this.h, 12);
    g.noStroke();

    // header
    g.fill("#4a90d9");
    g.textSize(13);
    g.textAlign(g.CENTER, g.CENTER);
    const font = R.assets?.fonts?.["Bold"];
    if (font) g.textFont(font);
    g.text("TASKS", this.x + this.w / 2, this.y + 20);

    // clip to content area
    g.drawingContext.save();
    g.drawingContext.beginPath();
    g.drawingContext.rect(this.x, this.y + 36, this.w, this.h - 36);
    g.drawingContext.clip();

    // translate into scroll space for children
    g.translate(this.x, this.y - this.scrollY);

    for (const card of this.cards) {
      if (activeCard && card === activeCard) continue;
      card.render(g);
    }
    this.addBtn.render(g);

    g.drawingContext.restore();
    this._renderScrubber(g);
    g.pop();
  }

  // called on gOverlay by Planner
  renderOverlay(g) {
    this.addInput.render(g);
  }
}
