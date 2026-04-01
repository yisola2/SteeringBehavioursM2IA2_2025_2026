// PlayerCar – extends Vehicle (vehicle.js is NOT modified)
//
// The player steers with LEFT / RIGHT arrow keys (or A / D).
// The car always thrusts forward — no braking, ever.
// Same drift visual effect as DriftCar: rendered heading lags velocity.
class PlayerCar extends Vehicle {
  constructor(x, y) {
    super(x, y, null);   // null image – show() is fully overridden

    this.maxSpeed  = 7;
    this.maxForce  = 0.25;
    this.r         = 14;
    this.minSpeed  = 2.5;    // no brakes
    this.thrustMag = 0.28;   // forward push each frame
    this.turnSpeed = 0.038;  // radians per frame when steering

    // steerAngle: direction the nose is pointing (player-controlled)
    this.steerAngle = -HALF_PI;   // start pointing "up"

    // visualAngle: rendered angle – lags behind vel.heading() for drift look
    this.visualAngle = this.steerAngle;
    this.driftLag    = 0.09;

    // Inherited path trail settings
    this.pathLength          = 45;
    this.pathSpacingInFrames = 2;

    // Smoke particles
    this.smoke    = [];
    this.maxSmoke = 80;

    // White / silver identity so the player stands out
    this.carColor = color(240, 240, 255);
  }

  // -----------------------------------------------------------------------
  // Read keyboard and apply thrust in the steered direction.
  // LEFT / RIGHT arrows or A / D rotate the nose; car always moves forward.
  // -----------------------------------------------------------------------
  handleInput() {
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {   // A
      this.steerAngle -= this.turnSpeed;
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {  // D
      this.steerAngle += this.turnSpeed;
    }

    // Always apply forward thrust in the steered direction (no braking)
    let thrust = p5.Vector.fromAngle(this.steerAngle).mult(this.thrustMag);
    this.applyForce(thrust);
  }

  // -----------------------------------------------------------------------
  // Push away from nearby cars (same logic as DriftCar)
  // -----------------------------------------------------------------------
  separate(others) {
    let steer      = createVector(0, 0);
    let count      = 0;
    let desiredSep = 42;

    for (let other of others) {
      if (other === this) continue;
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < desiredSep) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize().div(d);
        steer.add(diff);
        count++;
      }
    }
    if (count > 0) {
      steer.div(count).setMag(this.maxSpeed);
      steer.sub(this.vel).limit(this.maxForce);
    }
    return steer;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------
  _enforceMinSpeed() {
    if (this.vel.mag() === 0) {
      this.vel = p5.Vector.fromAngle(this.steerAngle).mult(this.minSpeed);
    } else if (this.vel.mag() < this.minSpeed) {
      this.vel.setMag(this.minSpeed);
    }
  }

  _updateDrift() {
    let targetAngle = this.vel.heading();
    let diff = targetAngle - this.visualAngle;
    while (diff >  PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;

    this.visualAngle += diff * this.driftLag;

    if (abs(diff) > 0.15 && this.smoke.length < this.maxSmoke) {
      let rear = this.vel.copy().normalize().mult(-8);
      this.smoke.push({
        x:    this.pos.x + rear.x + random(-3, 3),
        y:    this.pos.y + rear.y + random(-3, 3),
        life: 1.0,
        size: random(8, 22)
      });
    }
  }

  _updateSmoke() {
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      this.smoke[i].life -= 0.02;
      if (this.smoke[i].life <= 0) this.smoke.splice(i, 1);
    }
  }

  // -----------------------------------------------------------------------
  // Override update: input → physics → min speed → drift → smoke
  // -----------------------------------------------------------------------
  update() {
    this.handleInput();
    super.update();         // inherited: vel, pos, acc reset, path recording
    this._enforceMinSpeed();
    this._updateDrift();
    this._updateSmoke();
  }

  // -----------------------------------------------------------------------
  // Override show: smoke → white trail → crown glow → car body
  // -----------------------------------------------------------------------
  show() {
    // 1. Smoke
    for (let s of this.smoke) {
      push();
      noStroke();
      fill(200, 200, 220, s.life * 90);
      circle(s.x, s.y, s.size * (1.8 - s.life * 0.8));
      pop();
    }

    // 2. White neon trail from inherited this.path[]
    for (let i = 1; i < this.path.length; i++) {
      let t = i / this.path.length;
      push();
      stroke(240, 240, 255, t * 200);
      strokeWeight(lerp(1, 4, t));
      noFill();
      line(
        this.path[i - 1].x, this.path[i - 1].y,
        this.path[i].x,     this.path[i].y
      );
      pop();
    }

    // 3. Bright pulsing underglow to make the player car stand out
    let pulse = map(sin(frameCount * 0.08), -1, 1, 40, 80);
    push();
    noFill();
    stroke(255, 255, 255, pulse);
    strokeWeight(12);
    circle(this.pos.x, this.pos.y, 38);
    pop();

    // 4. Car body – rotated by drift-lagged visualAngle
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.visualAngle + HALF_PI);

    // Body: bright white / silver
    fill(230, 235, 255);
    stroke(255, 255, 255, 220);
    strokeWeight(1.2);
    rectMode(CENTER);
    rect(0, 0, 12, 22, 2);

    // Racing stripe
    fill(80, 130, 255, 200);
    noStroke();
    rect(0, 0, 3, 18);

    // Headlights (bright blue-white)
    fill(200, 220, 255, 255);
    ellipse(-4, -9.5, 3.5, 2.5);
    ellipse( 4, -9.5, 3.5, 2.5);

    // Taillights
    fill(255, 30, 30, 230);
    ellipse(-4, 9.5, 3.5, 2.5);
    ellipse( 4, 9.5, 3.5, 2.5);

    pop();

    // 5. Small "PLAYER" label above the car
    push();
    textAlign(CENTER, BOTTOM);
    textSize(9);
    fill(255, 255, 255, 160);
    noStroke();
    text('YOU', this.pos.x, this.pos.y - 20);
    pop();
  }
}
