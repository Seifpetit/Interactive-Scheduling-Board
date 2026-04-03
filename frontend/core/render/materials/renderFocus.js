export function renderFocus(g, node, t = 1) {
  const { w, h } = node;

  // glow
  g.noFill();
  g.stroke(120, 180, 255, 120 * t);
  g.strokeWeight(2 + t * 2);
  g.rect(-w/2, -h/2, w, h, 10);

  // subtle fill boost
  g.fill(255, 255, 255, 10 * t);
  g.noStroke();
  g.rect(-w/2, -h/2, w, h, 10);
}