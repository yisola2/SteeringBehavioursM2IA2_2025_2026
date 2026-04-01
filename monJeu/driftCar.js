// DriftCar – extends Vehicle (vehicle.js must NOT be modified)
//
// Key differences from the base Vehicle:
//  • Cannot brake: a minimum speed is always enforced
//  • Visual "drift" effect: the rendered heading lags behind the actual
//    velocity direction, giving the car a sideways-sliding look
//  • Smoke particles spawn at the rear when drifting hard
//  • Neon underglow + neon trail built from the inherited this.path array
//  • followWaypoints() and separate() steering behaviors added on top
class DriftCar extends Vehicle {
  constructor(x, y, carColor) {
    super(x, y, null);     // null image – we override show() completely

    this.maxSpeed = 6;
    this.maxForce = 0.18;
    this.r = 14;
    this.minSpeed = 3.2;   // no brakes: never fall below this

    // Tune inherited path trail
    this.pathLength = 35;
    this.pathSpacingInFrames = 2;

    // --- drift visual ---------------------------------------------------
    // visualAngle tracks the *rendered* heading; it lags behind vel.heading()
    // giving the car a drifting / over-steering look.
    this.visualAngle = random(TWO_PI);
    this.driftLag = 0.065;     // lower → more lag → more dramatic drift

    // --- smoke particles -------------------------------------------------
    this.smoke = [];
    this.maxSmoke = 60;

    // --- identity --------------------------------------------------------
    this.carColor = carColor;

    // --- track following state -------------------------------------------
    this.waypointIndex = 0;
    this.waypointThreshold = 65;
  }

  // -----------------------------------------------------------------------
  // Steering: follow the circuit waypoints.
  // Advances to next waypoint once the car is within waypointThreshold.
  // Uses seek() (inherited) – no arrival, because we can't brake.
  // -----------------------------------------------------------------------
  followWaypoints(waypoints) {
    let target = waypoints[this.waypointIndex];
    if (p5.Vector.dist(this.pos, target) < this.waypointThreshold) {
      this.waypointIndex = (this.waypointIndex + 1) % waypoints.length;
    }
    return this.seek(target);   // inherited from Vehicle
  }

  // -----------------------------------------------------------------------
  // Steering: push away from nearby cars so they don't pile up.
  // -----------------------------------------------------------------------
  separate(others) {
    let steer = createVector(0, 0);
    let count = 0;
    let desiredSep = 38;

    for (let other of others) {
      if (other === this) continue;
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < desiredSep) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(d);       // weight by proximity
        steer.add(diff);
        count++;
      }
    }
    if (count > 0) {
      steer.div(count);
      steer.setMag(this.maxSpeed);
      steer.sub(this.vel);
      steer.limit(this.maxForce);
    }
    return steer;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------
  _enforceMinSpeed() {
    if (this.vel.mag() === 0) {
      this.vel = p5.Vector.random2D().mult(this.minSpeed);
    } else if (this.vel.mag() < this.minSpeed) {
      this.vel.setMag(this.minSpeed);
    }
  }

  _updateDrift() {
    let targetAngle = this.vel.heading();
    let diff = targetAngle - this.visualAngle;

    // keep diff in [-PI, PI]
    while (diff >  PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;

    this.visualAngle += diff * this.driftLag;

    // spawn smoke at the rear when sideslip angle is large enough
    if (abs(diff) > 0.15 && this.smoke.length < this.maxSmoke) {
      let rear = this.vel.copy().normalize().mult(-8);
      this.smoke.push({
        x: this.pos.x + rear.x + random(-3, 3),
        y: this.pos.y + rear.y + random(-3, 3),
        life: 1.0,
        size: random(8, 20)
      });
    }
  }

  _updateSmoke() {
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      this.smoke[i].life -= 0.022;
      if (this.smoke[i].life <= 0) this.smoke.splice(i, 1);
    }
  }

  // -----------------------------------------------------------------------
  // Override update: physics → min speed → drift → smoke
  // -----------------------------------------------------------------------
  update() {
    super.update();           // inherited: vel, pos, acc, path recording
    this._enforceMinSpeed();
    this._updateDrift();
    this._updateSmoke();
  }

  // -----------------------------------------------------------------------
  // Override show: smoke → neon trail → underglow → car body
  // -----------------------------------------------------------------------
  show() {
    let c = this.carColor;
    let r = red(c), g = green(c), b = blue(c);

    // 1. Smoke / tire marks
    for (let s of this.smoke) {
      push();
      noStroke();
      fill(160, 160, 160, s.life * 90);
      circle(s.x, s.y, s.size * (1.8 - s.life * 0.8));
      pop();
    }

    // 2. Neon trail built from inherited this.path array
    for (let i = 1; i < this.path.length; i++) {
      let t = i / this.path.length;   // 0 = oldest, 1 = newest
      push();
      stroke(r, g, b, t * 180);
      strokeWeight(lerp(1, 3.5, t));
      noFill();
      line(
        this.path[i - 1].x, this.path[i - 1].y,
        this.path[i].x,     this.path[i].y
      );
      pop();
    }

    // 3. Soft neon underglow
    push();
    noFill();
    stroke(r, g, b, 55);
    strokeWeight(10);
    circle(this.pos.x, this.pos.y, 32);
    pop();

    // 4. Car body – rotated by visualAngle (the lagging drift angle)
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.visualAngle + HALF_PI);   // +HALF_PI: nose points up in local space

    // Body rectangle
    fill(r, g, b);
    stroke(255, 255, 255, 170);
    strokeWeight(1);
    rectMode(CENTER);
    rect(0, 0, 11, 21, 2);

    // Headlights (front = negative Y)
    fill(255, 255, 190, 240);
    noStroke();
    ellipse(-3.5, -9.5, 3.5, 2.5);
    ellipse( 3.5, -9.5, 3.5, 2.5);

    // Taillights
    fill(255, 30, 30, 230);
    ellipse(-3.5, 9.5, 3.5, 2.5);
    ellipse( 3.5, 9.5, 3.5, 2.5);

    pop();
  }
}
