export function renderFrost(g, node, t = 1) {
  const { w, h } = node;

  // base translucent layer
  g.fill(255, 255, 255, 10 * t);
  g.noStroke();
  g.rect(-w/2, -h/2, w, h, 10);

  // soft top light
  g.fill(255, 255, 255, 30 * t);
  g.rect(-w/2, -h/2, w, h * 0.3, 10, 10, 0, 0);

  // subtle inner glow
  g.stroke(255, 255, 255, 40 * t);
  g.strokeWeight(1);
  g.noFill();
  g.rect(-w/2 + 1, -h/2 + 1, w - 2, h - 2, 10);

  // slight desaturation overlay (important)
  g.fill(20, 20, 30, 20 * t);
  g.rect(-w/2, -h/2, w, h, 10);
}