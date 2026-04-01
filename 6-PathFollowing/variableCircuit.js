// VariableCircuit
//
// A circuit whose track width varies per control point.
// Control points have the shape: { pos: p5.Vector, hw: number }
// where hw is the half-width of the track at that point.
//
// Samples are built by linear interpolation between control points
// (matching the style the user set in 5-Boundaries).
// Each sample carries its own hw so the boundary math is width-aware.
//
// PATH FOLLOWING ALGORITHM
// ────────────────────────
// Different from wall repulsion. Instead of pushing the car away from
// the wall, it steers the car toward a point AHEAD on the centerline.
// This means the car gracefully curves along the track rather than
// bouncing. The force is zero in the free zone (near center) and ramps
// up cubically toward the wall.

class VariableCircuit {
  constructor(pointData) {
    // pointData: array of { pos: Vector, hw: number }
    this.controlPoints = pointData.map(p => ({
      pos: p.pos.copy(),
      hw:  p.hw
    }));
    this.samples = [];
    this._buildSamples(300);
  }

  // -----------------------------------------------------------------------
  // Build a dense sample array by linearly interpolating between control
  // points. Width (hw) is also interpolated so narrow/wide sections blend.
  // -----------------------------------------------------------------------
  _buildSamples(total) {
    this.samples = [];
    let pts = this.controlPoints;
    let n   = pts.length;
    if (n < 2) return;

    let stepsPerSeg = Math.ceil(total / n);

    for (let i = 0; i < n; i++) {
      let p1 = pts[i];
      let p2 = pts[(i + 1) % n];

      let d1   = p5.Vector.sub(p1.pos, pts[(i - 1 + n) % n].pos).normalize();
      let d2   = p5.Vector.sub(p2.pos, p1.pos).normalize();
      let tang = d2.copy();
      let norm = createVector(-tang.y, tang.x);

      // Miter normal at the join so corners don't overlap
      let n1    = createVector(-d1.y, d1.x);
      let n2    = createVector(-d2.y, d2.x);
      let denom = 1 + n1.dot(n2);
      let miter = p5.Vector.add(n1, n2).div(max(denom, 0.15));

      for (let j = 0; j < stepsPerSeg; j++) {
        let t   = j / stepsPerSeg;
        let pos = p5.Vector.lerp(p1.pos, p2.pos, t);
        let hw  = lerp(p1.hw, p2.hw, t);
        let sampleNorm = (j === 0) ? miter.copy() : norm.copy();
        this.samples.push({
          pos,
          tangent: tang.copy(),
          normal:  sampleNorm,
          hw
        });
      }
    }

    // Store index on each sample for look-ahead
    for (let i = 0; i < this.samples.length; i++) {
      this.samples[i].idx = i;
    }
  }

  // -----------------------------------------------------------------------
  // Find the nearest sample and return projection info.
  // -----------------------------------------------------------------------
  projectOntoTrack(pos) {
    let minD    = Infinity;
    let nearest = this.samples[0];
    let nearIdx = 0;

    for (let i = 0; i < this.samples.length; i++) {
      let d = p5.Vector.dist(pos, this.samples[i].pos);
      if (d < minD) { minD = d; nearest = this.samples[i]; nearIdx = i; }
    }

    let offset     = p5.Vector.sub(pos, nearest.pos);
    let signedDist = offset.dot(nearest.normal);

    return {
      sample:        nearest,
      idx:           nearIdx,
      signedDist,
      absDistCenter: abs(signedDist),
      distFromWall:  nearest.hw - abs(signedDist),
      isOutside:     abs(signedDist) > nearest.hw
    };
  }

  // -----------------------------------------------------------------------
  // PATH FOLLOWING FORCE
  //
  // How it works:
  //   1. Project the vehicle onto the nearest centerline point.
  //   2. Find a target point N samples AHEAD on the centerline.
  //      N scales with speed so fast cars look further ahead.
  //   3. Seek that target (inherited Vehicle.seek).
  //   4. Scale the force by proximity to wall (cubic ramp, zero at center).
  //
  // Result: in open space the car wanders freely.
  //         Near a wall it steers toward the track ahead → slides along it.
  // -----------------------------------------------------------------------
  pathFollowForce(vehicle) {
    let info = this.projectOntoTrack(vehicle.pos);
    let hw   = info.sample.hw;

    // Safety net: if completely outside, pull strongly back to center
    if (info.isOutside) {
      let sign = (info.signedDist > 0) ? -1 : 1;
      let emergency = info.sample.normal.copy().mult(sign * vehicle.maxForce * 5);
      vehicle._pfForce  = emergency.copy();
      vehicle._pfTarget = info.sample.pos.copy();
      vehicle._pfInfo   = info;
      return emergency;
    }

    // Ratio 0 = centerline, 1 = wall
    let ratio = info.absDistCenter / hw;

    // Free zone: wander dominates, path following stays silent
    if (ratio < 0.28) {
      vehicle._pfForce  = createVector(0, 0);
      vehicle._pfTarget = null;
      vehicle._pfInfo   = info;
      return createVector(0, 0);
    }

    // Adaptive look-ahead: faster → look further
    let speed     = vehicle.vel.mag();
    let lookAhead = floor(max(12, speed * 9));
    let targetIdx = (info.idx + lookAhead) % this.samples.length;
    let target    = this.samples[targetIdx].pos;

    // Seek the ahead-point (inherited from Vehicle, uses maxForce internally)
    let seekForce = vehicle.seek(target);

    // Cubic scaling: very gentle in warning zone, strong at wall
    let strength = map(ratio, 0.28, 1.0, 0, 1);
    strength = strength * strength * strength;
    seekForce.mult(strength * 3.8);

    vehicle._pfForce  = seekForce.copy();
    vehicle._pfTarget = target.copy();
    vehicle._pfInfo   = info;

    return seekForce;
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------
  show() {
    this._drawSurface();
    this._drawWalls();
    this._drawCenterDashes();
  }

  _drawSurface() {
    let n = this.samples.length;
    push();
    fill(36, 38, 46);
    noStroke();
    for (let i = 0; i < n; i++) {
      let s1 = this.samples[i];
      let s2 = this.samples[(i + 1) % n];
      let a  = p5.Vector.add(s1.pos, p5.Vector.mult(s1.normal, -s1.hw));
      let b  = p5.Vector.add(s1.pos, p5.Vector.mult(s1.normal,  s1.hw));
      let c  = p5.Vector.add(s2.pos, p5.Vector.mult(s2.normal,  s2.hw));
      let d  = p5.Vector.add(s2.pos, p5.Vector.mult(s2.normal, -s2.hw));
      beginShape();
      vertex(a.x, a.y); vertex(b.x, b.y);
      vertex(c.x, c.y); vertex(d.x, d.y);
      endShape(CLOSE);
    }
    pop();
  }

  _drawWalls() {
    push();
    noFill();
    stroke(0, 220, 110, 190);
    strokeWeight(2.5);
    beginShape();
    for (let s of this.samples)
      vertex(...p5.Vector.add(s.pos, p5.Vector.mult(s.normal, -s.hw)).array());
    endShape(CLOSE);

    stroke(0, 110, 255, 190);
    beginShape();
    for (let s of this.samples)
      vertex(...p5.Vector.add(s.pos, p5.Vector.mult(s.normal, s.hw)).array());
    endShape(CLOSE);
    pop();
  }

  _drawCenterDashes() {
    push();
    stroke(255, 255, 255, 35);
    strokeWeight(1.2);
    for (let i = 0; i < this.samples.length; i += 5) {
      if (floor(i / 5) % 2 === 0) {
        let a = this.samples[i];
        let b = this.samples[(i + 4) % this.samples.length];
        line(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
      }
    }
    pop();
  }
}
