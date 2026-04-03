export function renderGlass(g, node, blurredLayer, t = 1) {
  const { w, h } = node;
  if (!blurredLayer) return;

  const SCALE = 4;

  const sx = node.x ?? 0;
  const sy = node.y ?? 0;

  // 1️⃣ blurred background
  g.image(
    blurredLayer,
    -w/2, -h/2,
    w, h,
    sx / SCALE,
    sy / SCALE,
    w / SCALE,
    h / SCALE
  );

  // 2️⃣ tint (scaled by t)
  g.fill(255, 255, 255, 12 * t);
  g.noStroke();
  g.rect(-w/2, -h/2, w, h, 10);

  // 3️⃣ highlight
  g.fill(255, 255, 255, 40 * t);
  g.rect(-w/2, -h/2, w, h * 0.35, 10, 10, 0, 0);

  // 4️⃣ border
  g.stroke(255, 255, 255, 30 * t);
  g.strokeWeight(1.5);
  g.noFill();
  g.rect(-w/2, -h/2, w, h, 10);
}