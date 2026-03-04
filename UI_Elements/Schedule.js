import { R } from "../core/runtime.js";

import { EmployeeTray } from "./EmployeeTray.js";
import { WeekGrid } from "./WeekGrid.js";
import { ContextMenuController } from "./ContextMenuController.js";


export class Schedule {
  constructor(state, commands) {
    // geometry
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;

    // children
    this.contextMenu = new ContextMenuController(commands);
    this.requestContextMenu = (payload) => {
      this.contextMenu.open(payload); 
    }
    this.tray = new EmployeeTray(state.employees, this.requestContextMenu);
    this.grid = new WeekGrid(state.demand);
    


    // app references
    this.state = state;         // R.state
    this.commands = commands;   // cmdAssign, cmdGenerate...

    // drag session
    this.activeSticker = null;
    this.hoverSlot = null;
  }

  setGeometry(x, y, w, h) {

    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    const padding = 20;

    // Layout proportions
    const trayWidth = w * 0.16;      // 16-22% left panel
    const gridWidth = w - trayWidth - padding * 2;

    const trayX = x + padding;
    const trayY = y + padding;
    const trayH = h - padding * 2;

    const gridX = trayX + trayWidth + padding;
    const gridY = trayY;
    const gridH = trayH;

    // Apply to children
    if (this.tray) {
      this.tray.setGeometry(
        trayX,
        trayY,
        trayWidth,
        trayH
      );
    }

    if (this.grid) {
      this.grid.setGeometry(
        gridX,
        gridY,
        gridWidth - padding,
        gridH
      );
    }

  
  }

  findSlotUnder(x, y) {
    if (!this.grid) return null;
    for (const shift of this.grid.shifts) {
      for (const slot of shift.slots) {
        if (slot.hitTest(x, y)) {
          return slot;
        }
      }

    }
    return null;
  }

  onHit(x, y) {
    return x > this.x && x < this.x + this.w &&
           y > this.y && y < this.y + this.h; 
  }

  onMouseHover(mouse) {

    // 1. Context Menu
    if (this.contextMenu.visible) {
      if (this.contextMenu.hitTest(mouse.x, mouse.y)) {
        this.contextMenu.onHover(mouse.x, mouse.y);
        return;
      }
    }

    // 2. Tray sticker
    if (!this.tray) return;
    const sticker = this.tray.hitTest(mouse.x, mouse.y);

    if (sticker) {
      sticker.highlight();
      const localX = mouse.x - this.tray.x;
      const localY = mouse.y - this.tray.y + this.tray.scrollY;
      sticker.onHover(localX, localY);
      return;
    } for (const s of this.tray.stickers) {
      s.highlighted = false;
    }


    // 3. Grid
    if(!this.grid) return;
    this.grid.days.forEach(day => {
        day.shifts.forEach(shift => {
          shift.slots.forEach(slot => {
            if (slot.hitTest(mouse.x, mouse.y)) {
              if(!slot.pulseTrgiggered){slot.triggerPulse();}
              
            }
    });});
    })
  }

  onMousePress(mouse) {

    // 1. Context Menu
    if (this.contextMenu.visible) {
      if (this.contextMenu.hitTest(mouse.x, mouse.y)) {
        this.contextMenu.onClick(mouse.x, mouse.y);
        return;
      }
      this.contextMenu.close();
    }

    // 2. Tray sticker
    const sticker = this.tray.hitTest(mouse.x, mouse.y);
    if (sticker) {

      const localX = mouse.x - this.tray.x;
      const localY = mouse.y - this.tray.y + this.tray.scrollY;

      if (sticker.contextBoxHitTest(localX, localY)) {  
        this.requestContextMenu({
          x: sticker.contextBox.x + this.tray.x,
          y: sticker.contextBox.y + this.tray.y - this.tray.scrollY,
          type: "EMPLOYEE",
          ref: sticker,
        });
      }

      this.activeSticker = sticker;

      // Compute current rendered position
      const renderedX = this.tray.x + sticker.localX;
      const renderedY = this.tray.y + sticker.localY - this.tray.scrollY;

      // Force sticker into global space
      sticker.x = renderedX;
      sticker.y = renderedY;

      // Now start drag
      sticker.startDrag(mouse);
      return;

    }

    // 3. Week grid
    if (!this.grid) return;
      this.grid.days.forEach(day => {
        day.shifts.forEach(shift => {
          if (shift.contextBoxHitTest(mouse.x, mouse.y)) {
            this.requestContextMenu({
              x: shift.contextBox.x,
              y: shift.contextBox.y,
              type: "SHIFT",
              ref: shift,
            });
          }
          shift.slots.forEach(slot => {
            if (slot.contextBoxHitTest(mouse.x, mouse.y)) {

              const requestType = slot.checkAssignemnt() ? "ASSIGNMENT" : "SLOT";
              console.log("Requesting context menu with type:", requestType, "for slot:", slot.slotId);
              this.requestContextMenu({
                x: slot.contextBox.x,
                y: slot.contextBox.y,
                type: requestType,
                ref: slot,
              });

            }
          });

        }

      );});

  }

  onMouseRelease(mouse) {

    if (!this.activeSticker) return;

    const sticker = this.activeSticker;
    const slot = this.hoverSlot;

    if (slot && this.commands?.assign) {

      // emit structural command
      this.commands.assign(
        sticker.employee.id,
        slot.slotId
      );

      // update local state immediately for snappy UI
      slot.triggerPulse();

    }

    this.activeSticker.stopDrag();

    this.activeSticker = null;
    this.hoverSlot = null;
  }

  update(p5, mouse) {

    // Safety: This ensures stale drag doesn’t survive
    if (!this.activeSticker) {
      for (const s of this.tray.stickers) {
        s.dragging = false;
      }
    }

    // Layout (simple centered board)
    this.setGeometry(40, 40, p5.width - 80, p5.height - 80);

    // Delegate
    if (this.tray) this.tray.update(mouse);
    if (this.grid) this.grid.update(mouse);

    // Scroll logic (only if not dragging a sticker)
    if (this.tray.isHovered(mouse.x, mouse.y) && !this.activeSticker) {
      if (mouse.wheel !== 0) {
          this.tray.scroll(mouse.wheel);
      }
    }

    // Drag logic
    if (this.activeSticker) {

      this.activeSticker.dragTo(mouse);

      const slot = this.grid.findNearestSlot(mouse.x, mouse.y);

      this.hoverSlot = slot;

      if (slot) {
        slot.highlight = true;
      }
    }
    R.ui.activeEmployeeCard = this.activeSticker;
    mouse.wheel = 0; // reset after use
  }

  render(gMain, gOverlay) {
    if (!gMain || !gOverlay) return;

    gMain.push();

    gMain.fill("#5c2890234");
    gMain.rect(this.x, this.y, this.w, this.h, 16);

    gMain.pop(); 

    if (this.grid) this.grid.render(gMain);

    if (this.tray) this.tray.render(gMain, this.activeSticker);
    
    if (this.activeSticker) this.activeSticker.render(gOverlay);

    if (this.contextMenu) this.contextMenu.render(gOverlay);
    
  }

}