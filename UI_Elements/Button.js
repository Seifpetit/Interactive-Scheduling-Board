import { R } from "../core/runtime.js";

export class GenerateButton {
  constructor(command) { 
    this.x = 0;
    this.y = 0;
    this.w = 140;
    this.h = 20;

    this.hovered = false;
    this.command = command; // function to call on click

    this.scale = 1;
    this.targetScale = 1;
  }

  setGeometry(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  hitTest(x, y) {
    return x > this.x &&
          x < this.x + this.w &&
          y > this.y &&
          y < this.y + this.h;
  }

  onHover() {
    this.hovered = true;
  }

  onClick() {
    if (this.command) {
      this.command();
    }
  }

  update(p5, mouse) {

    this.setGeometry(p5.width / 2 - this.w / 2, this.y, this.w, this.h);
    
    this.hovered = this.hitTest(mouse.x, mouse.y);

    this.targetScale = this.hovered ? 1.1 : 1;

    // Smooth interpolation for scale
    const scaleSpeed = 0.15;
    this.scale += (this.targetScale - this.scale) * scaleSpeed;

  }

  renderText(g) {
    g.fill(this.hovered ? "#afe000" : "#92ba00");
    g.textAlign(g.CENTER, g.CENTER); g.textSize(22);
    const font = R.assets.fonts["ExtraBold"];
    g.textFont(font);
    g.text("Generate", this.x + this.w/2, this.y + this.h / 2 - 4);
  }

  render(g) {
    g.push();
    g.noStroke();

    g.translate(this.x + this.w / 2, this.y + this.h / 2);
    g.scale(this.scale);

    // outer rect (border)  #fba700ff 
    g.fill("#333");
    g.rect(-this.w/2, -this.h/2, this.w, this.h, 8);
    g.pop();
    //inner Rect for border effect
    this.renderText(g);
    
    
  }


}