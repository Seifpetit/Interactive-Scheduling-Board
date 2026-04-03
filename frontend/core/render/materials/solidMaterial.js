export function renderSolid(g, node) {
  const { w, h } = node;

  let base = node.color || "#2a2a3e";

  // ─────────────────────────────
  // 1️⃣ BASE
  // ─────────────────────────────
  g.noStroke();
  g.fill(base);
  g.rect(-w/2, -h/2, w, h, 10);

  // ─────────────────────────────
  // 2️⃣ SOFT TOP LIGHT (depth)
  // ─────────────────────────────
  g.fill(255, 255, 255, 15);
  g.rect(-w/2, -h/2, w, h * 0.35, 10, 10, 0, 0);

  // ─────────────────────────────
  // 3️⃣ INNER SHADOW (depth)
  // ─────────────────────────────
  g.fill(0, 0, 0, 20);
  g.rect(-w/2, h/2 - h * 0.3, w, h * 0.3, 0, 0, 10, 10);

  // ─────────────────────────────
  // 4️⃣ BORDER
  // ─────────────────────────────
  g.stroke(255, 255, 255, 25);
  g.strokeWeight(1);
  g.noFill();
  g.rect(-w/2, -h/2, w, h, 10);

  // ─────────────────────────────
  // 5️⃣ HIGHLIGHT
  // ─────────────────────────────
  if (node.highlighted) {
    g.stroke(120, 180, 255, 120);
    g.strokeWeight(2);
    g.rect(-w/2, -h/2, w, h, 10);
  }
}