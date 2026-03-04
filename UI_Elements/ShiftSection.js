import { SlotRow } from "./SlotRow.js";
import { R } from "../core/runtime.js";

export class ShiftSection {
  constructor(dayIndex, type) {

    this.dayIndex = dayIndex;     // 0–6
    this.type = type;             // "lunch" | "dinner"

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

    // children
    this.slots = [];

    // V0: fixed capacity
    this.capacity = 6;

    this.buildSlots();
  }

  buildSlots() {
    this.slots = [];

    for (let i = 0; i < this.capacity; i++) {
      this.slots.push(
        new SlotRow(this.dayIndex, this.type, i)
      );
    }
  } 

  getLabel() {
    return this.type === "lunch"
      ? "Lunch "
      : "Dinner ";
  }

  setGeometry(x, y, w, h) {

    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    const labelH = 24;
    const slotAreaH = h - labelH;
    const slotH = slotAreaH / this.slots.length;

    this.contextBox = {
      x: this.x + this.w - 20,
      y: this.y + 4,
      w: 16,
      h: 15
    };

    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].setGeometry(
        x + 8,
        y + labelH + i * slotH,
        w - 16,
        slotH - 8
      );
    }
  }

  contextBoxHitTest(mx, my) {
    return (mx > this.contextBox.x && mx < this.contextBox.x + this.contextBox.w &&
            my > this.contextBox.y && my < this.contextBox.y + this.contextBox.h);
  }


  update(mouse) {
    for (const slot of this.slots) {
      slot.update(mouse);
    }
  }

  render(g) {

    g.push();

    // shift container background
    g.fill("#1f1f1f");  g.stroke("#92ba00"); g.strokeWeight(1);
    g.rect(this.x, this.y, this.w, this.h, 8);
    g.noStroke();
    // shift label
    g.fill("#ffffff");
    g.textAlign(g.LEFT, g.CENTER);
    const font = R.assets.fonts["Medium"];
    g.textFont(font);
    g.text(
      this.getLabel(),
      this.x + 8,
      this.y + 12
    );

    // context menu button (simple square on right side) 
    g.fill("#333333");  g.stroke("#fba700ff"); g.strokeWeight(1.4);
    g.rect(this.contextBox.x, this.contextBox.y, this.contextBox.w, this.contextBox.h, 4);
    

    g.pop();

    for (const slot of this.slots) {
      slot.render(g); 
    }
  }




}