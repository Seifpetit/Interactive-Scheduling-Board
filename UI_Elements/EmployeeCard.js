import { R } from "../core/runtime.js";

export class EmployeeCard {
  constructor(employee, requestContextMenu) {

    this.employee = employee;
    this.requestContextMenu = requestContextMenu;
    // geometry
    this.x = 0;   // local OR global depending on state
    this.y = 0;
    this.w = 0;
    this.h = 0;
    this.contextBox = {
      x: 0,
      y: 0,
      w: 0,
      h: 0
    };

    // interaction state
    this.highlighted = false;
    this.dragging = false;

    // drag offsets (global space)
    this.offsetX = 0;
    this.offsetY = 0;

    // original tray position (for reset)
    this.localX = 0;
    this.localY = 0;

    

    // tiltle effect while dragging
    this.rotation = 0;
    this.targetRotation = 0;
    this.prevX = 0;
  }

  // ─────────────────────────────
  // GEOMETRY
  // ─────────────────────────────

  setGeometry(x, y, w, h) {
    this.localX = x;
    this.localY = y;

    // only apply if not dragging
    if (!this.dragging) {
      this.x = x;
      this.y = y;
    }

    this.w = w;
    this.h = h;

    this.contextBox = {
      x: this.x + this.w - 20,
      y: this.y + (this.h - this.h * 0.8) / 2,
      w: 15,
      h: this.h * 0.8,
      isHovered: false,
    };
  }

  // ─────────────────────────────
  // HIT TEST (LOCAL SPACE)
  // ─────────────────────────────

  contextBoxHitTest(mx, my) {
    // simple hit test for context menu button in left side of card
    return (
      mx > this.contextBox.x &&
      mx < this.contextBox.x + this.contextBox.w  &&
      my > this.contextBox.y &&
      my < this.contextBox.y + this.contextBox.h 
    );
  }

  hitTest(x, y) {
    return (
      x > this.localX &&
      x < this.localX + this.w &&
      y > this.localY &&
      y < this.localY + this.h
    );
  }

  highlight() {
    this.highlighted = true;
  }

  clearHighlight() {
    this.highlighted = false;
  }

  onHover(mx, my) {console.log(this.contextBoxHitTest(mx, my));
    if(!this.contextBoxHitTest(mx, my)) return;
    console.log(this.contextBox.isHovered);
    this.contextBox.isHovered = true;
    console.log(this.contextBox.isHovered);
  }

  // ─────────────────────────────
  // DRAG
  // ─────────────────────────────

  /**
   * IMPORTANT:
   * This expects x/y already converted to global space
   * BEFORE calling startDrag.
   */
  startDrag(mouse) {

    this.dragging = true;

    this.offsetX = mouse.x - this.x;
    this.offsetY = mouse.y - this.y;

  }

  dragTo(mouse) {
    if (!this.dragging) return;

    const newX = mouse.x - this.offsetX;

    // compute velocity
    const velocityX = newX - this.x;

    this.prevX = this.x;
    this.x = newX;
    this.y = mouse.y - this.offsetY;

    // map velocity to rotation
    const maxTilt = 0.1; // radians
    this.targetRotation = Math.max(-maxTilt, Math.min(maxTilt, velocityX * 0.02));
  }

  stopDrag() {
    this.dragging = false;
    this.targetRotation = 0;
    
  }

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────

  update(mouse) {
    const speed = 0.15;
    this.rotation += (this.targetRotation - this.rotation) * speed;

    if (this.snapActive) {
      this.x += (this.targetX - this.x) * 0.15;
      this.y += (this.targetY - this.y) * 0.15;
      if (Math.abs(this.x - this.targetX) < 0.5 && Math.abs(this.y - this.targetY) < 0.5) {
      
        this.snapActive = false;
      } 
    }
  

  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  render(g) {

    g.push();
    g.translate(this.x + this.w / 2, this.y + this.h / 2);
    g.rotate(this.rotation);

    g.fill(this.highlighted ? "#afe000" : "#92ba00");
    if(this.dragging) g.fill("#afe000a0")
    g.rect(-this.w / 2, -this.h / 2, this.w, this.h, 10);

    g.fill("#ffffff"); g.textSize(18); 
    g.textAlign(g.LEFT, g.CENTER); g.stroke("#000000"); g.strokeWeight(2);
    const font = R.assets.fonts["Bold"];
    g.textFont(font);
    g.text(
      this.employee.name,
      -this.w / 2 + 10,
      -this.h / 2 + this.h / 2 - 4
    );
    g.noStroke();

    g.pop();

    if(this.dragging) return;
    // context menu button (simple square on right side)
    g.push(); //console.log(this.contextBox.isHovered);
    g.fill(this.contextBox.isHovered ? "#6c6c6c" : "#333333");  g.stroke("#fba700ff"); g.strokeWeight(1.4);
    g.rotate(this.rotation);
    g.rect(this.contextBox.x, this.contextBox.y, this.contextBox.w, this.contextBox.h, 10);

    g.pop();

    //this.contextBox.isHovered = false;
  }
}