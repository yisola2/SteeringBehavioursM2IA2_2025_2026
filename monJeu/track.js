// Track: oval circuit for Drifters Don't Brake – Midnight Edition
// Waypoints sit on the center-line of the track and are used by cars
// for navigation. The visual is drawn as two concentric ellipses.
class Track {
  constructor() {
    this.cx = width / 2;
    this.cy = height / 2;
    this.rx = width  * 0.38;
    this.ry = height * 0.30;
    this.halfWidth = 70;       // half the track width in px
    this.numWaypoints = 24;
    this.waypoints = this._buildWaypoints();
  }

  _buildWaypoints() {
    let pts = [];
    for (let i = 0; i < this.numWaypoints; i++) {
      let angle = (i / this.numWaypoints) * TWO_PI - HALF_PI;
      pts.push(createVector(
        this.cx + cos(angle) * this.rx,
        this.cy + sin(angle) * this.ry
      ));
    }
    return pts;
  }

  show() {
    let hw = this.halfWidth;

    // --- asphalt surface (outer ellipse filled) --------------------------
    push();
    fill(36, 38, 44);
    noStroke();
    ellipse(this.cx, this.cy, (this.rx + hw) * 2, (this.ry + hw) * 2);
    pop();

    // --- infield: painted over with background color --------------------
    push();
    fill(8, 10, 18);
    noStroke();
    ellipse(this.cx, this.cy, (this.rx - hw) * 2, (this.ry - hw) * 2);
    pop();

    // --- outer neon border ----------------------------------------------
    push();
    noFill();
    stroke(0, 220, 110, 220);
    strokeWeight(3);
    ellipse(this.cx, this.cy, (this.rx + hw) * 2, (this.ry + hw) * 2);
    pop();

    // --- inner neon border ----------------------------------------------
    push();
    noFill();
    stroke(0, 180, 255, 180);
    strokeWeight(2);
    ellipse(this.cx, this.cy, (this.rx - hw) * 2, (this.ry - hw) * 2);
    pop();

    // --- center dashed line (simulated with short segments) -------------
    this._drawCenterDashes();

    // --- start/finish line ----------------------------------------------
    this._drawStartLine();
  }

  _drawCenterDashes() {
    let pts = this.waypoints;
    let n = pts.length;
    push();
    stroke(255, 255, 255, 50);
    strokeWeight(1.5);
    noFill();
    for (let i = 0; i < n; i++) {
      let curr = pts[i];
      let next = pts[(i + 1) % n];
      // draw only every other segment for dashed effect
      if (i % 2 === 0) {
        line(curr.x, curr.y, next.x, next.y);
      }
    }
    pop();
  }

  _drawStartLine() {
    // draw across track width at the first waypoint
    let p = this.waypoints[0];
    // tangent direction at first waypoint
    let next = this.waypoints[1];
    let dir = p5.Vector.sub(next, p).normalize();
    let perp = createVector(-dir.y, dir.x); // perpendicular = normal to track

    push();
    stroke(255);
    strokeWeight(3);
    let hw = this.halfWidth;
    line(
      p.x + perp.x * hw, p.y + perp.y * hw,
      p.x - perp.x * hw, p.y - perp.y * hw
    );
    // checkerboard dots
    fill(255);
    noStroke();
    for (let t = -0.8; t <= 0.8; t += 0.4) {
      let bx = p.x + perp.x * hw * t;
      let by = p.y + perp.y * hw * t;
      circle(bx, by, 5);
    }
    pop();
  }
}
