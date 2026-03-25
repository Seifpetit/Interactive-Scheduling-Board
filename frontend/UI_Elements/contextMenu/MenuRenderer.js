import { R } from "../../core/runtime.js";

// ─────────────────────────────────────────────────────────────────────────────
// MenuRenderer
// Stateless renderer for ContextMenuController.
// Receives the controller as an argument — reads its geometry and state,
// writes nothing back.
//
// Usage (inside ContextMenuController.render):
//   this._renderer.renderMenu(g, this);
//   this._renderer.renderInput(g, this);
// ─────────────────────────────────────────────────────────────────────────────

export class MenuRenderer {

  renderMenu(g, ctrl) {
    if (ctrl.actions.length === 0) return;
    const { x, y, w, itemH, actions, mode } = ctrl;
    const isSubmenu = mode === "submenu";
    const h = actions.length * itemH;

    g.noStroke(); g.fill(0, 80);
    g.rect(x + 3, y + 3, w, h, 6);
    g.fill("#1e1e1e"); g.stroke("#333"); g.strokeWeight(1);
    g.rect(x, y, w, h, 6);

    if (isSubmenu) {
      g.noStroke(); g.fill("#ffffff08");
      g.rect(x, y, w, itemH, 6, 6, 0, 0);
    }

    actions.forEach((action, i) => this._renderAction(g, ctrl, action, i));
  }

  renderInput(g, ctrl) {
    const { x, y, w, itemH, pendingAction, textInput } = ctrl;
    const pad    = 8;
    const totalH = itemH + 8 + 28 + 8;

    g.noStroke(); g.fill(0, 80);
    g.rect(x + 3, y + 3, w, totalH, 6);
    g.fill("#1e1e1e"); g.stroke("#333"); g.strokeWeight(1);
    g.rect(x, y, w, totalH, 6);

    // Green title strip
    g.noStroke(); g.fill("#92ba00");
    g.rect(x, y, w, itemH, 6);
    g.rect(x, y + itemH / 2, w, itemH / 2);

    g.fill("#fff");
    g.textFont(R.assets.fonts["Medium"]);
    g.textAlign(g.LEFT, g.CENTER); g.textSize(13);
    g.text(pendingAction?.label ?? "", x + 10, y + itemH / 2);

    textInput.setGeometry(x + pad, y + itemH + pad / 2, w - pad * 2, 28);
    textInput.render(g);

    g.noStroke(); g.fill("#ffffff40");
    g.textSize(11); g.textAlign(g.RIGHT, g.CENTER);
    g.text("Enter ↵", x + w - pad, y + itemH + 14 + pad / 2);
  }

  _renderAction(g, ctrl, action, index) {
    const { x, y, w, itemH, highlighted, actions, mode } = ctrl;
    const isHov     = highlighted === index;
    const itemY     = y + index * itemH;
    const isFirst   = index === 0;
    const isLast    = index === actions.length - 1;
    const isSubmenu = mode === "submenu";

    g.push(); g.noStroke();

    // Hover highlight
    if (isHov) {
      g.fill("#92ba00");
      if (isFirst)     g.rect(x + 1, itemY + 1, w - 2, itemH - 1, 5, 5, 0, 0);
      else if (isLast) g.rect(x + 1, itemY, w - 2, itemH - 1, 0, 0, 5, 5);
      else             g.rect(x + 1, itemY, w - 2, itemH);
    }

    // Divider
    if (!isLast) {
      g.stroke("#333"); g.strokeWeight(1);
      g.line(x + 8, itemY + itemH, x + w - 8, itemY + itemH);
      g.noStroke();
    }

    // Back arrow on first row of submenu
    if (isSubmenu && isFirst) {
      g.fill(isHov ? "#ffffff90" : "#ffffff30");
      g.textAlign(g.LEFT, g.CENTER); g.textSize(13);
      g.text("‹", x + 10, itemY + itemH / 2);
    }

    // Label
    const labelX = (isSubmenu && isFirst) ? x + 22 : x + 12;
    g.fill(isHov ? "#fff" : (isSubmenu && isFirst ? "#888" : "#ccc"));
    g.textFont(R.assets.fonts["Medium"]);
    g.textAlign(g.LEFT, g.CENTER); g.textSize(13);
    g.text(action.label, labelX, itemY + itemH / 2);

    // › indicator for expandable actions
    if (action.options || action.input || action.requirements) {
      g.fill(isHov ? "#ffffff90" : "#ffffff40");
      g.textAlign(g.RIGHT, g.CENTER);
      g.text("›", x + w - 10, itemY + itemH / 2);
    }

    g.pop();
  }
}
