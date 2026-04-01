// CircuitEditor – visual waypoint editor (mode A + D)
//
// INTERACTIONS
//   Left-click empty space    → add waypoint
//   Left-click + drag point   → move waypoint
//   Right-click point         → delete waypoint
//   Hover point, drag handle  → adjust half-width at that point
//   C                         → copy _buildControlPoints() code to clipboard
//   SPACE                     → switch to simulation

const POINT_RADIUS  = 14;
const HANDLE_RADIUS = 10;

class CircuitEditor {
  constructor() {
    this.points    = [];    // [{ pos: Vector, hw: number }]
    this.hoverPt   = -1;   // index of hovered waypoint
    this.dragPt    = -1;   // index of waypoint being dragged
    this.dragHandle= -1;   // index of waypoint whose width handle is being dragged
    this.defaultHw = 60;
    this._copiedMsg = 0;   // countdown frames for "Copied!" message
  }

  // -------------------------------------------------------------------------
  // Pre-populate with a default S-shape so there's something to start from
  // -------------------------------------------------------------------------
  loadDefault() {
    let w = width, h = height;
    this.points = [
      // Top corridor (wide straights)
      { pos: createVector(w * 0.88, h * 0.22), hw: 65 },
      { pos: createVector(w * 0.12, h * 0.22), hw: 65 },
      // Left S-curve (narrower at the inflection)
      { pos: createVector(w * 0.05, h * 0.35), hw: 52 },
      { pos: createVector(w * 0.22, h * 0.50), hw: 40 },
      { pos: createVector(w * 0.05, h * 0.65), hw: 52 },
      // Bottom corridor (wide straights)
      { pos: createVector(w * 0.12, h * 0.78), hw: 65 },
      { pos: createVector(w * 0.88, h * 0.78), hw: 65 },
      // Right S-curve
      { pos: createVector(w * 0.95, h * 0.65), hw: 52 },
      { pos: createVector(w * 0.78, h * 0.50), hw: 40 },
      { pos: createVector(w * 0.95, h * 0.35), hw: 52 },
    ];
  }

  // -------------------------------------------------------------------------
  // Geometry helpers
  // -------------------------------------------------------------------------

  // Tangent at point i: direction from previous to next neighbour
  _tangentAt(i) {
    if (this.points.length < 2) return createVector(1, 0);
    let n    = this.points.length;
    let prev = this.points[(i - 1 + n) % n].pos;
    let next = this.points[(i + 1) % n].pos;
    let t    = p5.Vector.sub(next, prev);
    return t.mag() < 0.001 ? createVector(1, 0) : t.normalize();
  }

  // Right-hand normal at point i
  _normalAt(i) {
    let t = this._tangentAt(i);
    return createVector(-t.y, t.x);
  }

  // Positions of the two width handles for point i
  _handles(i) {
    let p = this.points[i];
    let n = this._normalAt(i);
    return {
      left:  p5.Vector.add(p.pos, p5.Vector.mult(n, -p.hw)),
      right: p5.Vector.add(p.pos, p5.Vector.mult(n,  p.hw))
    };
  }

  // -------------------------------------------------------------------------
  // Input handlers (called from sketch.js)
  // -------------------------------------------------------------------------
  onMousePressed() {
    let mx = mouseX, my = mouseY;

    // 1. Check width handles (only active when hovering a waypoint)
    if (this.hoverPt >= 0) {
      let h = this._handles(this.hoverPt);
      if (dist(mx, my, h.left.x, h.left.y)  < HANDLE_RADIUS ||
          dist(mx, my, h.right.x, h.right.y) < HANDLE_RADIUS) {
        this.dragHandle = this.hoverPt;
        return;
      }
    }

    // 2. Check waypoints
    for (let i = 0; i < this.points.length; i++) {
      let p = this.points[i].pos;
      if (dist(mx, my, p.x, p.y) < POINT_RADIUS) {
        if (mouseButton === RIGHT) {
          this.points.splice(i, 1);
          this.hoverPt = -1;
        } else {
          this.dragPt = i;
        }
        return;
      }
    }

    // 3. Empty space → add waypoint
    if (mouseButton === LEFT) {
      this.points.push({ pos: createVector(mx, my), hw: this.defaultHw });
    }
  }

  onMouseDragged() {
    if (this.dragPt >= 0) {
      this.points[this.dragPt].pos.set(mouseX, mouseY);
    }
    if (this.dragHandle >= 0) {
      let p  = this.points[this.dragHandle];
      let d  = dist(mouseX, mouseY, p.pos.x, p.pos.y);
      p.hw   = max(20, d);
    }
  }

  onMouseReleased() {
    this.dragPt    = -1;
    this.dragHandle= -1;
  }

  onMouseMoved() {
    this.hoverPt = -1;
    for (let i = 0; i < this.points.length; i++) {
      if (dist(mouseX, mouseY, this.points[i].pos.x, this.points[i].pos.y) < POINT_RADIUS) {
        this.hoverPt = i;
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Copy to clipboard as ready-to-paste _buildControlPoints() code
  // -------------------------------------------------------------------------
  copyToClipboard() {
    if (this.points.length < 3) return;
    let lines = ['return ['];
    for (let p of this.points) {
      let xf = (p.pos.x / width).toFixed(4);
      let yf = (p.pos.y / height).toFixed(4);
      lines.push(`  { pos: createVector(w * ${xf}, h * ${yf}), hw: ${floor(p.hw)} },`);
    }
    lines.push('];');
    navigator.clipboard.writeText(lines.join('\n'));
    this._copiedMsg = 120;
  }

  // -------------------------------------------------------------------------
  // Build a temporary sample array for live preview (same logic as
  // VariableCircuit._buildSamples but lightweight and inline)
  // -------------------------------------------------------------------------
  _buildPreviewSamples() {
    let pts = this.points;
    let n   = pts.length;
    if (n < 2) return [];
    let samples = [];
    let steps   = 18;

    for (let i = 0; i < n; i++) {
      let p1   = pts[i];
      let p2   = pts[(i + 1) % n];
      let tang = p5.Vector.sub(p2.pos, p1.pos);
      if (tang.mag() < 0.001) continue;
      tang.normalize();
      let norm = createVector(-tang.y, tang.x);

      for (let j = 0; j < steps; j++) {
        let t = j / steps;
        samples.push({
          pos:    p5.Vector.lerp(p1.pos, p2.pos, t),
          normal: norm.copy(),
          hw:     lerp(p1.hw, p2.hw, t)
        });
      }
    }
    return samples;
  }

  // -------------------------------------------------------------------------
  // Draw
  // -------------------------------------------------------------------------
  draw() {
    let samples = this._buildPreviewSamples();

    // Track surface preview
    if (samples.length > 2) {
      let n = samples.length;
      push();
      fill(36, 38, 46);
      noStroke();
      for (let i = 0; i < n; i++) {
        let s1 = samples[i];
        let s2 = samples[(i + 1) % n];
        let a  = p5.Vector.add(s1.pos, p5.Vector.mult(s1.normal, -s1.hw));
        let b  = p5.Vector.add(s1.pos, p5.Vector.mult(s1.normal,  s1.hw));
        let c  = p5.Vector.add(s2.pos, p5.Vector.mult(s2.normal,  s2.hw));
        let d  = p5.Vector.add(s2.pos, p5.Vector.mult(s2.normal, -s2.hw));
        beginShape();
        vertex(a.x, a.y); vertex(b.x, b.y);
        vertex(c.x, c.y); vertex(d.x, d.y);
        endShape(CLOSE);
      }

      // Wall outlines
      noFill();
      stroke(0, 220, 110, 170); strokeWeight(2);
      beginShape();
      for (let s of samples)
        vertex(...p5.Vector.add(s.pos, p5.Vector.mult(s.normal, -s.hw)).array());
      endShape(CLOSE);

      stroke(0, 110, 255, 170);
      beginShape();
      for (let s of samples)
        vertex(...p5.Vector.add(s.pos, p5.Vector.mult(s.normal, s.hw)).array());
      endShape(CLOSE);
      pop();
    }

    // Centerline connection (thin, dashed-like)
    if (this.points.length >= 2) {
      push();
      stroke(255, 255, 255, 55);
      strokeWeight(1);
      noFill();
      beginShape();
      for (let p of this.points) vertex(p.pos.x, p.pos.y);
      endShape(CLOSE);
      pop();
    }

    // Waypoints and handles
    for (let i = 0; i < this.points.length; i++) {
      let p       = this.points[i];
      let isHover = (i === this.hoverPt || i === this.dragHandle);

      // Width handles (shown when hovering or dragging that point)
      if (isHover) {
        let h = this._handles(i);
        push();
        // Line across the track width
        stroke(255, 200, 50, 180);
        strokeWeight(1);
        line(h.left.x, h.left.y, h.right.x, h.right.y);
        // Handle circles
        fill(255, 200, 50);
        noStroke();
        circle(h.left.x,  h.left.y,  HANDLE_RADIUS * 2);
        circle(h.right.x, h.right.y, HANDLE_RADIUS * 2);
        // hw label
        fill(255, 200, 50);
        textSize(10);
        textAlign(CENTER, BOTTOM);
        text(`hw ${floor(p.hw)}`, p.pos.x, p.pos.y - POINT_RADIUS - 4);
        pop();
      }

      // Waypoint circle
      push();
      fill(isHover ? color(255, 200, 50) : color(220, 220, 255));
      stroke(14, 14, 20);
      strokeWeight(2);
      circle(p.pos.x, p.pos.y, POINT_RADIUS * 2);
      fill(14, 14, 20);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(11);
      text(i, p.pos.x, p.pos.y);
      pop();
    }

    this._drawHUD();
    if (this._copiedMsg > 0) {
      this._copiedMsg--;
      push();
      fill(0, 220, 110, map(this._copiedMsg, 0, 60, 0, 220));
      textAlign(CENTER, CENTER);
      textSize(16);
      text('Copied!', width / 2, height - 40);
      pop();
    }
  }

  _drawHUD() {
    push();
    textAlign(LEFT, TOP);
    noStroke();

    fill(255, 255, 255, 210);
    textSize(18);
    text('Circuit Editor', 22, 22);

    fill(255, 255, 255, 120);
    textSize(11);
    let y = 50;
    text('Left-click empty   →  add waypoint',         22, y);
    text('Left-click + drag  →  move waypoint',        22, y + 16);
    text('Hover, drag handle →  adjust width',         22, y + 32);
    text('Right-click        →  delete waypoint',      22, y + 48);
    text('C                  →  copy code to clipboard', 22, y + 64);
    text('SPACE              →  run simulation',        22, y + 80);

    fill(255, 255, 255, 80);
    textSize(11);
    text(`${this.points.length} waypoints`, 22, y + 104);

    if (this.points.length < 3) {
      fill(255, 160, 40, 200);
      text('Need at least 3 points to simulate', 22, y + 120);
    }
    pop();
  }

  // Return data in the format VariableCircuit expects
  getCircuitData() {
    return this.points.map(p => ({ pos: p.pos.copy(), hw: p.hw }));
  }
}
