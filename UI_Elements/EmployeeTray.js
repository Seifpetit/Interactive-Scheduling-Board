import { EmployeeCard } from "./EmployeeCard.js";
import { R } from "../core/runtime.js";

export class EmployeeTray {
  constructor(employees, requestContextMenu) {

    this.employees = employees || [];
    this.requestContextMenu = requestContextMenu;
    // geometry
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;

    // scroll state
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.contentHeight = 0;
    this.scrollIndicatorAlpha = 0;

    // children
    this.stickers = [];

    this.buildStickers();
  }

  // ─────────────────────────────
  // BUILD
  // ─────────────────────────────

  buildStickers() {
    this.stickers = [];

    for (const emp of this.employees) {
      this.stickers.push(new EmployeeCard(emp, this.requestContextMenu));
    }
  }

  // ─────────────────────────────
  // GEOMETRY (CONTENT SPACE)
  // ─────────────────────────────

  setGeometry(x, y, w, h) {

    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    const padding = 12;
    const stickerH = 48;
    const spacing = 10;

    let currentY = padding;

    for (const sticker of this.stickers) {
      sticker.setGeometry(
        padding,                // relative to tray
        currentY,
        w - padding * 2,
        stickerH
      );

      currentY += stickerH + spacing;
    }

    this.contentHeight = currentY;
  }

  // ─────────────────────────────
  // SCROLL
  // ─────────────────────────────

  scroll(delta) {
    const maxScroll = Math.max(0, this.contentHeight - this.h);

    const proposed = this.targetScrollY + delta * 0.5;

    // If inside bounds → normal
    if (proposed >= 0 && proposed <= maxScroll) {
      this.targetScrollY = proposed;
    }
    else {
      // outside bounds → resistance
      this.targetScrollY += delta * 0.15;
    }
  }

  clampScroll() {
    const maxScroll = Math.max(0, this.contentHeight - this.h);

    // If content fits → reset
    if (maxScroll === 0) {
      this.targetScrollY = 0;
      this.scrollY = 0;
      return;
    }

    // If overshooting → gently pull back
    if (this.targetScrollY < 0) {
      this.targetScrollY *= 0.9;
    }

    if (this.targetScrollY > maxScroll) {
      const excess = this.targetScrollY - maxScroll;
      this.targetScrollY = maxScroll + excess * 0.9;
    }
  }

  // ─────────────────────────────
  // HOVER / HIT TEST
  // ─────────────────────────────

  isHovered(x, y) {
    return (
      x > this.x &&
      x < this.x + this.w &&
      y > this.y &&
      y < this.y + this.h
    );
  }

  hitTest(x, y) {

    if (!this.isHovered(x, y)) return null;

    // convert mouse to tray-local space
    const localX = x - this.x;
    const localY = y - this.y + this.scrollY;

    for (const sticker of this.stickers) {
      if (sticker.hitTest(localX, localY)) {
        return sticker;
      }
    }

    return null;
  }

  onHover(mouse) {

    // reset highlights
    for (const s of this.stickers) {
      s.highlighted = false;
    }

    if (!this.isHovered(mouse.x, mouse.y)) return;

    const localX = mouse.x - this.x;
    const localY = mouse.y - this.y + this.scrollY;

    for (const s of this.stickers) {
      if (s.hitTest(localX, localY)) {
        s.highlight();
        break;
      }
    }
  }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update(mouse) {

    // smooth interpolation
    
    this.clampScroll();
    this.scrollY += (this.targetScrollY - this.scrollY) * 0.12;

    // Snap Back When User Stops Scrolling
    const maxScroll = Math.max(0, this.contentHeight - this.h);

    // snap to bounds if very close
    if (this.scrollY < 0 && Math.abs(this.scrollY) < 0.5) {
      this.scrollY = 0;
      this.targetScrollY = 0;
    }

    if (this.scrollY > maxScroll && Math.abs(this.scrollY - maxScroll) < 0.5) {
      this.scrollY = maxScroll;
      this.targetScrollY = maxScroll;
    }

    // scroll indicator alpha logic
    const scrolling = Math.abs(this.targetScrollY - this.scrollY) > 0.5;
    if (scrolling) {  this.scrollIndicatorAlpha = 1;}
    else { this.scrollIndicatorAlpha *= 0.9; }

    for (const sticker of this.stickers) {
      sticker.update(mouse);
    }
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────
  renderScrubber(g) {
    let viewportRatio = this.h / this.contentHeight;
    let indicatorH = this.h * viewportRatio;
    let progress = this.scrollY / (this.contentHeight - this.h);
    let indicatorY = this.y + progress * (this.h - indicatorH);
    let indicatorX = this.x + this.w - 6;

    if (this.contentHeight > this.h) {

      const viewportRatio = this.h / this.contentHeight;
      const indicatorH = this.h * viewportRatio;

      const maxScroll = this.contentHeight - this.h;
      const progress = maxScroll > 0 ? this.scrollY / maxScroll : 0;

      let indicatorY = this.y + progress * (this.h - indicatorH);
        if (indicatorY < this.y) indicatorY = this.y;
        if (indicatorY + indicatorH > this.y + this.h) {
          indicatorY = this.y + this.h - indicatorH;
        }
      const indicatorX = this.x + this.w - 6;

      g.push();
      g.noStroke();
      g.fill(255, 255 * this.scrollIndicatorAlpha * 0.25); // subtle
      g.rect(indicatorX, indicatorY, 4, indicatorH, 4);
      g.pop();
    }

  }

  render(g, activeSticker = null) {

    
    g.push();
    
    // tray background
    g.fill("#1c1c1c");
    g.rect(this.x, this.y, this.w, this.h, 12);

    // clip to tray viewport
    g.drawingContext.save();
    g.drawingContext.beginPath();
    g.drawingContext.rect(this.x, this.y, this.w, this.h);
    g.drawingContext.clip();

    // translate into tray space
    g.translate(this.x, this.y - this.scrollY);

    for (const s of this.stickers) {
      if (activeSticker && s === activeSticker) continue;
      s.render(g);
    }

    g.drawingContext.restore();
    this.renderScrubber(g);
    g.pop();
  }

}