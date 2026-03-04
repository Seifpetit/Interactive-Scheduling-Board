import { R } from "../core/runtime.js";
import { MENU_SCHEMAS } from "./menuSchema.js";
import { commands } from "../core/commands.js";
// ───────────────────────────────────────────────────────────────────────────
// CONTEXT MENU CONTROLLER
// ───────────────────────────────────────────────────────────────────────────  
const MENU_DATA = MENU_SCHEMAS; // can be extended with dynamic data if needed

export class ContextMenuController {

  constructor(operator) {
    this.operator = operator;

    this.x = 0; this.y = 0; this.w = 180; this.h = 0;
    this.itemH = 28;
    
    this.actions = [];
    this.visible = false;
    this.target = false;

    this.mode = "menu"; // "menu" | "input";
    this.inputValue = "";
    this.pendingAction = null;

    this.highlighted = false;

    this.inputBox = {
      x: 0,
      y: 0,
      w: this.w * 0.97,
      h: this.itemH * 0.8,
      isHovered: false,
    }

  }   

  open(payload) {

    this.payload = payload;
    console.log("Opening context menu with payload:", payload);

    const {x, y, type, ref} = payload;
    
    this.x = x;
    this.y = y;
    this.inputBox.x = this.x + (this.w - this.inputBox.w)/2;
    this.inputBox.y = this.y + (this.itemH - this.inputBox.h)/2;

    this.visible = true;
    this.target = {type, ref};
    this.actions = this.initActions(type, ref);
    
  }

  close() {
    this.visible = false;
    this.target = null;
    this.actions = [];
    this.mode = "menu";
    this.inputValue = "";
    this.pendingAction = null;
  }

  initActions(type, ref) {
    
    const schema = MENU_DATA[type];
    if(!schema) return [];
    
    return schema;
  }

  selectAction(action) {
    if(action.input) {
      this.mode = "input";
      this.pendingAction = action;
      this.inputValue = "";
      console.log("requires input");
      return;
    }

    this.emitCommand(action, null); 
  }

  emitCommand(actionType, payload) {

    const element = this.target.ref; 

    if(element.employee) {
        console.log("Emitting command:", actionType," from target: ", 
        element.employee.name, " with payload:", payload);
    
      if(actionType.id === "renameEmployee") 
        this.operator.rename(element.employee.id, payload);
    }
    
    
  }

  submitInput() {
    if(!this.pendingAction) return;
    console.log(this.inputValue);
    if(Number(this.inputValue)) {const value = Number(this.inputValue);}

    this.emitCommand( this.pendingAction, this.inputValue);

    // TODO ------
    //
    //this.operator.handleCommand({
    //  type: action.type,
    //  target: this.target,
    //  payload
    //});
    // ------------

    this.close();

  }

  handleKey(key) {
    if(this.mode !== "input") return;
    if(key === "Enter") {
      this.submitInput();
      return;
    }
    if(key === "Backspace") {
      this.inputValue = this.inputValue.slice(0, -1);
      return;
    }

    if(/^\[0-9]$/.test(key)) {
      this.inputValue += key;
    }

  }

  hitTest(mx, my) {
    if(!this.visible || !this.actions || this.actions.length === 0) return false;

    const width = 180;
    const itemH = 28;

    if(this.mode === "menu") {
      const height = this.actions.length * itemH;
      return (mx > this.x && mx < this.x + width &&
              my > this.y && my < this.y + height);
    }

    if(this.mode === "input") {
      return (mx > this.x && mx < this.x + width &&
              my > this.y && my < this.y + 60);
    }
  
  
  }

  onHover(mx, my) {
    if(this.mode === "menu") {
      this.actions.forEach((action, index) => {
        this.hitTestAction(mx, my, action, index);
      });
    }
    if(this.mode === "input") {
      if(this.hitTestInputBox(mx, my)) {
        this.inputBox.isHovered = true;
      }
    }
  }

  hitTestAction(mx, my, action, index) {

      const itemX = this.x;
      const itemY = this.y + index * this.itemH;
      const itemW = this.w;
      const itemH = this.itemH;

      if (mx > itemX && mx < itemX + itemW &&
          my > itemY && my < itemY + itemH) {
        this.highlighted = index; 
        return;
      }
    
  }

  hitTestInputBox(mx, my) {
    if (mx > this.inputBox.x && mx < this.inputBox.x + this.inputBox.w &&
        my > this.inputBox.y && my < this.inputBox.y + this.inputBox.h) {
      return true;
    } return false;
  }

  onClick(mx, my) {
    if(!this.visible) return;

    const itemH = 28;

    if(this.mode === "menu") {
      const index = Math.floor((my - this.y) / itemH);
      const action = this.actions[index];
      if(action) {
        this.selectAction(action);
      }
      return;
    }

    if(this.mode === "input") {
      // click outside input box should close menu
      if(this.hitTestInputBox(mx, my)) {
        this.triggerInputIntent(); 
        return;
      }

      this.close();
      
    }
  }

  triggerInputIntent(){
    // TO DO
  }

  renderAction(g, action, index) {
    g.push();
    const pad = 2;
      g.stroke("#000000ff"); g.strokeWeight(1); // #fba700ff #555555ff
      g.fill(this.highlighted === index ? "#fba700" : "rgba(85, 85, 85, 0.5)");
      g.rect(this.x + pad, this.y + index * 28 + pad, this.w - 2 * pad, this.itemH - 2 * pad, 4);

      const font = R.assets.fonts["Medium"];
      g.textFont(font);
      g.textAlign(g.LEFT, g.CENTER);  g.textSize(14);  g.fill("#fff");  g.noStroke();
      g.text(action.label, this.x + 10, this.y + this.itemH / 2 + index * this.itemH - 2);
    g.pop();
  }

  render(g) {

    if(!this.visible || !this.actions || this.actions.length === 0) return;

    g.push();
    this.h = this.actions.length * this.itemH; 

    

    if(this.mode === "menu") {
      // Background rect
      g.fill("#92ba00e0"); 
      g.rect(this.x, this.y, this.w, this.h, 4);
      this.actions.forEach((action, index) => {
        this.renderAction(g, action, index);
      });
    }
    
    if(this.mode === "input") {
      // Background rect
      g.fill("#92ba00"); 
      g.rect(this.x, this.y, this.w, this.itemH, 4);

      // Input box rect
      g.stroke(this.inputBox.isHovered ? "#0dc3aac9" : "#333");
      g.fill("#333");
      g.rect(this.inputBox.x, this.inputBox.y, this.inputBox.w, this.inputBox.h, 4);
      g.noStroke();
      // Default text
      if(!this.inputValue) {
        g.fill(this.inputBox.isHovered ? "#ffffffc9" : "#ffffff87");
        g.textAlign(g.LEFT, g.CENTER); g.textSize(14);
        g.text("Enter value: ", this.x + 10, this.y + this.itemH / 2 - 2);
      }
      
      // Captured Input 
      const KB = R.input.keyboard;
      if(KB.justPressed) {
        if(KB.key === "Enter") { 
          this.submitInput();
        }
        if(KB.key === "Backspace") {
          this.inputValue = this.inputValue.slice(0, -1);
        }
        else {this.inputValue += KB.key;}
      }

      g.fill("#fff");
      g.textAlign(g.LEFT, g.CENTER); g.textSize(14);
      g.text(this.inputValue, this.x + 10, this.y + this.itemH / 2 - 2);
    }

    g.pop();
    this.inputBox.isHovered = false;
    this.highlighted = null;
  }

  

}
