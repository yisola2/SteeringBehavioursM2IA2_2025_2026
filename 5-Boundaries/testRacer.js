// TestRacer – extends Vehicle (vehicle.js untouched)
//
// Moves autonomously via wander() (inherited from Vehicle).
// Calls circuit.boundaryForce(this) every frame to stay on track.
//
// In debug mode (press D) it draws:
//   • Line to nearest center point
//   • Track normal at that point
//   • Dashed line to predicted future position
//   • Force A (blue)   – position correction
//   • Force B (orange) – velocity damping
//   • Force C (purple) – look-ahead
//   • Danger zone colour: green → yellow → red

class TestRacer extends Vehicle {
  constructor(x, y, col) {
    super(x, y, null);   // null image – show() fully overridden

    this.maxSpeed = 5;
    this.maxForce = 0.22;
    this.r        = 12;
    this.col      = col || color(255, 220, 50);

    // Wander tuning (inherited properties)
    this.distanceCercle = 70;
    this.wanderRadius   = 38;
    this.displaceRange  = 0.38;

    // Path trail (inherited)
    this.pathLength          = 50;
    this.pathSpacingInFrames = 3;

    // Debug state – filled by circuit.boundaryForce()
    this._dbgInfo       = null;
    this._dbgFuturePos  = null;
    this._dbgFutureInfo = null;
    this._dbgForceA     = createVector(0, 0);
    this._dbgForceB     = createVector(0, 0);
    this._dbgForceC     = createVector(0, 0);
  }

  // -----------------------------------------------------------------------
  // show() – trail → body → debug overlay
  // -----------------------------------------------------------------------
  show() {
    let c = this.col;

    // Neon trail from inherited this.path[]
    for (let i = 1; i < this.path.length; i++) {
      let t = i / this.path.length;
      push();
      stroke(red(c), green(c), blue(c), t * 160);
      strokeWeight(lerp(1, 3, t));
      noFill();
      line(this.path[i-1].x, this.path[i-1].y,
           this.path[i].x,   this.path[i].y);
      pop();
    }

    // Danger-zone colour coding
    let bodyCol = c;
    if (this._dbgInfo) {
      let ratio = this._dbgInfo.distFromWall / 62; // 62 = halfWidth
      if (ratio < 0.15)       bodyCol = color(255,  40,  40);
      else if (ratio < 0.55)  bodyCol = color(255, 200,  40);
    }

    // Car body
    push();
    translate(this.pos.x, this.pos.y);
    if (this.vel.mag() > 0.1) rotate(this.vel.heading() + HALF_PI);
    fill(bodyCol);
    stroke(255, 255, 255, 160);
    strokeWeight(1);
    rectMode(CENTER);
    rect(0, 0, 10, 18, 2);
    fill(255, 255, 200);
    noStroke();
    ellipse(-3, -8, 3, 2);
    ellipse( 3, -8, 3, 2);
    pop();

    if (Vehicle.debug) this._drawDebug();
  }

  // -----------------------------------------------------------------------
  // Debug overlay – visualises each force component independently
  // -----------------------------------------------------------------------
  _drawDebug() {
    if (!this._dbgInfo) return;
    let info = this._dbgInfo;

    // Line from car to nearest center point
    push();
    stroke(255, 255, 255, 110);
    strokeWeight(1);
    line(this.pos.x, this.pos.y, info.centerPos.x, info.centerPos.y);
    fill(255);
    noStroke();
    circle(info.centerPos.x, info.centerPos.y, 5);
    pop();

    // Track normal at nearest point
    push();
    stroke(180, 180, 255, 130);
    strokeWeight(1);
    let normalEnd = p5.Vector.add(info.centerPos, p5.Vector.mult(info.normal, 45));
    line(info.centerPos.x, info.centerPos.y, normalEnd.x, normalEnd.y);
    pop();

    // Predicted future position
    if (this._dbgFuturePos) {
      push();
      stroke(180, 80, 255, 150);
      strokeWeight(1);
      drawingContext.setLineDash([4, 6]);
      line(this.pos.x, this.pos.y, this._dbgFuturePos.x, this._dbgFuturePos.y);
      drawingContext.setLineDash([]);
      noFill();
      stroke(180, 80, 255, 200);
      strokeWeight(1.5);
      circle(this._dbgFuturePos.x, this._dbgFuturePos.y, 9);
      pop();
    }

    // Signed-distance bar (lateral offset indicator)
    this._drawOffsetBar(info);

    // Force vectors (scaled up for visibility)
    this._drawForceArrow(this._dbgForceA, color(50,  130, 255), 'A');
    this._drawForceArrow(this._dbgForceB, color(255, 150,  30), 'B');
    this._drawForceArrow(this._dbgForceC, color(190,  60, 255), 'C');
  }

  _drawForceArrow(force, col, label) {
    if (!force || force.mag() < 0.0005) return;
    let scale = 220;
    let end   = p5.Vector.add(this.pos, p5.Vector.mult(force, scale));
    let dir   = force.copy().normalize();
    let perp  = createVector(-dir.y, dir.x);

    push();
    stroke(col);
    strokeWeight(2);
    line(this.pos.x, this.pos.y, end.x, end.y);
    // Arrowhead
    let tip = end.copy();
    line(tip.x, tip.y,
         tip.x - dir.x*7 + perp.x*4,
         tip.y - dir.y*7 + perp.y*4);
    line(tip.x, tip.y,
         tip.x - dir.x*7 - perp.x*4,
         tip.y - dir.y*7 - perp.y*4);
    // Label
    fill(col);
    noStroke();
    textSize(11);
    text(label, end.x + 5, end.y - 3);
    pop();
  }

  // Small horizontal bar below the car showing lateral offset
  _drawOffsetBar(info) {
    let hw   = 62;
    let bw   = 60;
    let bh   = 6;
    let bx   = this.pos.x - bw / 2;
    let by   = this.pos.y + 22;
    let fill_w = map(info.signedDist, -hw, hw, 0, bw);

    push();
    // Background
    fill(60, 60, 60);
    noStroke();
    rect(bx, by, bw, bh);
    // Fill showing offset direction
    let barCol = (abs(info.signedDist) > hw * 0.55)
      ? color(255, 60, 60)
      : color(60, 200, 120);
    fill(barCol);
    rect(bw / 2 > fill_w
      ? bx + fill_w : bx + bw / 2,
      by,
      abs(fill_w - bw / 2),
      bh);
    // Center marker
    stroke(255);
    strokeWeight(1);
    line(bx + bw/2, by, bx + bw/2, by + bh);
    pop();
  }
}
