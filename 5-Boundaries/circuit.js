// Circuit – "Declined Sympathy" style
//
// Two horizontal corridors connected by S-curves on each side,
// producing a closed loop that looks like a stretched S.
//
// The class also owns the SOPHISTICATED BOUNDARIES ALGORITHM,
// decomposed into three independent force components:
//
//   A – Position correction   : pushes the vehicle toward the centerline
//                               with a quadratic urgency ramp
//   B – Velocity damping      : cancels the velocity component that aims
//                               at the nearest wall
//   C – Look-ahead prediction : checks where the vehicle will be in
//                               `lookAheadFrames` and corrects early

class Circuit {
  constructor() {
    this.halfWidth       = 62;   // pixels from centerline to each wall
    this.dangerFraction  = 0.55; // start correcting when within 55% of halfWidth
    this.lookAheadFrames = 22;   // frames ahead for predictive correction

    this.controlPoints = this._buildControlPoints();
    this.samples       = [];     // dense {pos, tangent, normal} objects
    this._buildSamples(320);
  }

  // -----------------------------------------------------------------------
  // Control points that define the S-shaped "Declined Sympathy" circuit.
  // Defined proportionally so the circuit scales with the canvas.
  // Racing direction: left along the top, S-curve down on the left,
  // right along the bottom, S-curve back up on the right.
  // -----------------------------------------------------------------------
  _buildControlPoints() {
    let w = width, h = height;

    return [
      // Pit straight (bottom)
      createVector(w * 0.4, h * 0.85),
      createVector(w * 0.7, h * 0.85),

      // Turn 1 & 2 (tight chicane)
      createVector(w * 0.9, h * 0.85),
      createVector(w * 0.9, h * 0.65),
      
      // Curva Grande (sweeping right curve going up)
      createVector(w * 0.85, h * 0.35),
      
      // Turn 4 & 5 (second chicane)
      createVector(w * 0.80, h * 0.15),
      createVector(w * 0.65, h * 0.15),

      // Lesmo 1 & 2 (double right-hander)
      createVector(w * 0.55, h * 0.25),
      createVector(w * 0.45, h * 0.15),
      
      // Long sweeping back straight
      createVector(w * 0.30, h * 0.20),
      createVector(w * 0.15, h * 0.35),

      // Ascari chicane (left-right-left)
      createVector(w * 0.10, h * 0.55),
      createVector(w * 0.15, h * 0.65),
      createVector(w * 0.10, h * 0.75),

      // Parabolica (long final sweeping right returning to pit straight)
      createVector(w * 0.20, h * 0.85),
    ];
  }

  // -----------------------------------------------------------------------
  // Build a dense Catmull-Rom spline through the control points.
  // Each sample stores pos, tangent and normal so that projecting any point
  // onto the track is a simple nearest-neighbour search.
  // -----------------------------------------------------------------------
  _buildSamples(totalSamples) {
    this.samples = [];
    let pts = this.controlPoints;
    let m   = pts.length;
    let stepsPerSegment = Math.ceil(totalSamples / m);

    for (let i = 0; i < m; i++) {
      let p0 = pts[(i - 1 + m) % m];
      let p1 = pts[i];
      let p2 = pts[(i + 1) % m];
      let p3 = pts[(i + 2) % m];

      for (let j = 0; j < stepsPerSegment; j++) {
        let t   = j / stepsPerSegment;
        let pos = this._catmullRom(p0, p1, p2, p3, t);

        // Numerical tangent via tiny forward step
        let eps  = 0.005;
        let posF = this._catmullRom(p0, p1, p2, p3, Math.min(t + eps, 1 - eps));
        let tang = p5.Vector.sub(posF, pos);
        if (tang.mag() < 1e-6) tang.set(1, 0);
        tang.normalize();

        // Right-hand normal (perpendicular to tangent)
        let norm = createVector(-tang.y, tang.x);

        this.samples.push({ pos, tangent: tang, normal: norm });
      }
    }
  }

  _catmullRom(p0, p1, p2, p3, t) {
    let t2 = t * t, t3 = t2 * t;
    return createVector(
      0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
             (2*p0.x - 5*p1.x + 4*p2.x - p3.x) * t2 +
             (-p0.x + 3*p1.x - 3*p2.x + p3.x) * t3),
      0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
             (2*p0.y - 5*p1.y + 4*p2.y - p3.y) * t2 +
             (-p0.y + 3*p1.y - 3*p2.y + p3.y) * t3)
    );
  }

  // -----------------------------------------------------------------------
  // projectOntoTrack(pos) → nearest sample + lateral offset information.
  // signedDist > 0  →  vehicle is to the RIGHT of the centerline.
  // signedDist < 0  →  vehicle is to the LEFT of the centerline.
  // -----------------------------------------------------------------------
  projectOntoTrack(pos) {
    let minD    = Infinity;
    let nearest = this.samples[0];

    for (let s of this.samples) {
      let d = p5.Vector.dist(pos, s.pos);
      if (d < minD) { minD = d; nearest = s; }
    }

    let offset     = p5.Vector.sub(pos, nearest.pos);
    let signedDist = offset.dot(nearest.normal);

    return {
      centerPos:    nearest.pos.copy(),
      tangent:      nearest.tangent.copy(),
      normal:       nearest.normal.copy(),
      signedDist,
      absDistCenter: abs(signedDist),
      distFromWall:  this.halfWidth - abs(signedDist),
      isOutside:     abs(signedDist) > this.halfWidth,
    };
  }

  // -----------------------------------------------------------------------
  // SOPHISTICATED BOUNDARIES ALGORITHM
  //
  // Returns the total steering force keeping a vehicle on track.
  // Three components are computed independently and summed:
  //
  //   Force A – position correction  (BLUE in debug)
  //   Force B – velocity damping     (ORANGE in debug)
  //   Force C – look-ahead           (PURPLE in debug)
  //
  // Debug state is written onto the vehicle object so that TestRacer.show()
  // can visualise each component separately.
  // -----------------------------------------------------------------------
  boundaryForce(vehicle) {
    let hw      = this.halfWidth;
    let danger  = hw * this.dangerFraction;
    let total   = createVector(0, 0);

    // ── A. Position-based correction ──────────────────────────────────────
    let info = this.projectOntoTrack(vehicle.pos);
    vehicle._dbgInfo = info;   // expose to renderer

    if (info.distFromWall < danger) {
      // urgency: 0 at edge of danger zone → 1 at the wall (quadratic ramp)
      let urgency = map(info.distFromWall, danger, 0, 0, 1);
      urgency     = urgency * urgency;

      // Push toward center: flip normal sign depending on which side we're on
      let sign   = (info.signedDist > 0) ? -1 : 1;
      let forceA = info.normal.copy().mult(sign * urgency * vehicle.maxForce * 2.8);
      vehicle._dbgForceA = forceA.copy();
      total.add(forceA);
    } else {
      vehicle._dbgForceA = createVector(0, 0);
    }

    // ── B. Velocity damping (cancel speed toward nearest wall) ───────────
    // Wall direction = from center toward the vehicle
    let wallDir       = info.normal.copy().mult((info.signedDist > 0) ? 1 : -1);
    let velTowardWall = vehicle.vel.dot(wallDir);   // > 0 means approaching wall

    if (velTowardWall > 0 && info.distFromWall < danger) {
      let strength = map(info.distFromWall, danger, 0, 0, 0.85);
      let forceB   = wallDir.copy().mult(-velTowardWall * strength);
      forceB.limit(vehicle.maxForce * 1.8);
      vehicle._dbgForceB = forceB.copy();
      total.add(forceB);
    } else {
      vehicle._dbgForceB = createVector(0, 0);
    }

    // ── C. Look-ahead predictive correction ──────────────────────────────
    let futurePos  = p5.Vector.add(vehicle.pos,
                       p5.Vector.mult(vehicle.vel, this.lookAheadFrames));
    let futureInfo = this.projectOntoTrack(futurePos);
    vehicle._dbgFuturePos  = futurePos.copy();
    vehicle._dbgFutureInfo = futureInfo;

    let lookDanger = hw * 0.80;
    if (futureInfo.distFromWall < lookDanger) {
      let urgency  = map(futureInfo.distFromWall, lookDanger, 0, 0, 1);
      let sign2    = (futureInfo.signedDist > 0) ? -1 : 1;
      let forceC   = futureInfo.normal.copy().mult(sign2 * urgency * vehicle.maxForce * 1.3);
      vehicle._dbgForceC = forceC.copy();
      total.add(forceC);
    } else {
      vehicle._dbgForceC = createVector(0, 0);
    }

    // Cap total so it can't completely override the locomotion force
    total.limit(vehicle.maxForce * 4.5);
    return total;
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------
  show() {
    this._drawSurface();
    this._drawWalls();
    this._drawCenterDashes();
    this._drawStartLine();
  }

  // Filled track band using per-segment quads
  _drawSurface() {
    let hw = this.halfWidth;
    let n  = this.samples.length;
    push();
    fill(36, 38, 46);
    noStroke();
    for (let i = 0; i < n; i++) {
      let s1 = this.samples[i];
      let s2 = this.samples[(i + 1) % n];
      let a  = p5.Vector.add(s1.pos, p5.Vector.mult(s1.normal, -hw));
      let b  = p5.Vector.add(s1.pos, p5.Vector.mult(s1.normal,  hw));
      let c  = p5.Vector.add(s2.pos, p5.Vector.mult(s2.normal,  hw));
      let d  = p5.Vector.add(s2.pos, p5.Vector.mult(s2.normal, -hw));
      beginShape();
      vertex(a.x, a.y);
      vertex(b.x, b.y);
      vertex(c.x, c.y);
      vertex(d.x, d.y);
      endShape(CLOSE);
    }
    pop();
  }

  _drawWalls() {
    let hw = this.halfWidth;
    let n  = this.samples.length;
    push();
    noFill();

    // Left wall — green neon
    stroke(0, 220, 110, 200);
    strokeWeight(2.5);
    beginShape();
    for (let s of this.samples) {
      let p = p5.Vector.add(s.pos, p5.Vector.mult(s.normal, -hw));
      vertex(p.x, p.y);
    }
    endShape(CLOSE);

    // Right wall — blue neon
    stroke(0, 110, 255, 200);
    strokeWeight(2.5);
    beginShape();
    for (let s of this.samples) {
      let p = p5.Vector.add(s.pos, p5.Vector.mult(s.normal, hw));
      vertex(p.x, p.y);
    }
    endShape(CLOSE);

    pop();
  }

  _drawCenterDashes() {
    push();
    stroke(255, 255, 255, 40);
    strokeWeight(1.5);
    for (let i = 0; i < this.samples.length; i += 5) {
      if (floor(i / 5) % 2 === 0) {
        let a = this.samples[i];
        let b = this.samples[(i + 4) % this.samples.length];
        line(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
      }
    }
    pop();
  }

  _drawStartLine() {
    let s    = this.samples[0];
    let hw   = this.halfWidth;
    let perp = s.normal;
    let l    = p5.Vector.add(s.pos, p5.Vector.mult(perp, -hw));
    let r    = p5.Vector.add(s.pos, p5.Vector.mult(perp,  hw));
    push();
    stroke(255, 220, 0);
    strokeWeight(3);
    line(l.x, l.y, r.x, r.y);
    pop();
  }
}
