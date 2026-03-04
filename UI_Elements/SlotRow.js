import { R } from "../core/runtime.js";

export class SlotRow {
  constructor(dayIndex, shiftType, slotIndex) {

    this.dayIndex = dayIndex;
    this.shiftType = shiftType;   // "lunch" | "dinner"
    this.slotIndex = slotIndex;

    // unique slot id
    this.slotId = `${dayIndex}_${shiftType}_${slotIndex}`;

    // geometry
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
    this.contextBox = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    };

    // interaction state
    this.highlight = false;
    this.pulse = 0;
    this.pulseTriggered = false;

    // V0 assignment
    this.assignedEmployeeId = null;
  }

  setGeometry(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    
    this.contextBox = {
      x: x + w - w * 0.16,
      y: y + h * 0.1,
      w: w * 0.12,
      h: h * 0.8,
    };
  }

  hitTest(x, y) {
    return (
      x > this.x &&
      x < this.x + this.w &&
      y > this.y &&
      y < this.y + this.h
    );
  }

  checkAssignemnt() {
    return R.appState.draft?.assignments?.[this.slotId];
  }

  getCenter() {
    return {
      x: this.x + this.w / 2,
      y: this.y + this.h / 2
    };
  }

  contextBoxHitTest(mx, my) {
    return (mx > this.contextBox.x && mx < this.contextBox.x + this.contextBox.w &&
            my > this.contextBox.y && my < this.contextBox.y + this.contextBox.h);
  }

  triggerPulse() {
    this.pulseTriggered = true;
    this.pulse = 1.0; // start pulse effect
  }

  update(mouse) {
    if(this.pulse > 0) {
      this.pulse *= 0.2;
      if(this.pulse < 0.01) {this.pulse = 0;
        this.pulseTriggered = false;
      }
    }
  } 

  renderContextBox(g) {

    g.fill(this.checkAssignemnt() ? "#333" : "#92ba00");  
    g.stroke(this.checkAssignemnt() ? "#333" : "#92ba00"); 
    g.strokeWeight(1.4);
    
    g.rect(this.contextBox.x, this.contextBox.y, this.contextBox.w, this.contextBox.h, 4);
    const pad = this.contextBox.h / 3;
    for (let i = 0; i < 3; i++) {
      g.fill(this.checkAssignemnt() ? "#92ba00" : "#333");
      g.circle(
        this.contextBox.x + this.contextBox.w / 2, 
        this.contextBox.y + pad * (i + 0.5), 4);
    }
  }


  drawPulseEffect(g) {
    if(this.pulse <= 0) return;

    const alpha = this.pulse * 180;
    const expand = this.pulse * 6;

    g.push();
    g.noFill();
    g.stroke("#00ffffbe");
    g.strokeWeight(2 + this.pulse * 2);
    g.rect(
      this.x - expand / 2,
      this.y - expand / 2,
      this.w + expand,
      this.h + expand,
      6
    );
    g.pop();
  }

  drawSlotBase(g) {
    g.fill(this.highlight ? "#58e6fc3b":"#333333");
    g.rect(this.x, this.y, this.w, this.h, 6);
  }

  drawAssignedEmployee(g, assigned) {
    g.fill(this.highlight ? "#6a32a67a" : "#92ba00");
      g.rect(this.x, this.y, this.w, this.h, 6);

      const emp = R.appState.employees.find(e => e.id === assigned);

      if (emp) {
        g.fill("#ffffff");
        const font = R.assets.fonts["Bold"];
        g.textSize(18);
        g.textFont(font);
        g.textAlign(g.LEFT, g.CENTER);
        g.text(
          emp.name,
          this.x + 4,
          this.y + this.h / 2 - 2
        );
      }
  }

  render(g) {
    
    g.push(); 
    const assigned =
      R.appState.draft?.assignments?.[this.slotId];
    
    this.drawSlotBase(g);
    if(assigned) this.drawAssignedEmployee(g, assigned);
    // context menu button (simple square on right side) 
    this.renderContextBox(g);

    if(this.highlight) this.drawPulseEffect(g);
    
    // reset highlight (important)
    this.highlight = false;
    g.pop();

  }

}