// Racer – extends Vehicle (vehicle.js untouched)
//
// Moves via wander() (inherited). Path following from VariableCircuit
// takes over near walls: the car curves along the track instead of
// bouncing back from it.
//
// Debug overlay (press D):
//   Dashed line   → look-ahead target on centerline
//   Cyan arrow    → path following force
//   White dot+line → nearest center point

class Racer extends Vehicle {
  constructor(x, y, col, sprite) {
    super(x, y, sprite);

    this.maxSpeed = 4.5;
    this.maxForce = 0.22;
    this.r        = 12;
    this.col      = col || color(255, 220, 50);
    this.sprite   = sprite || null;

    // Wander tuning (inherited properties)
    this.distanceCercle = 75;
    this.wanderRadius   = 40;
    this.displaceRange  = 0.36;

    // Path trail (inherited)
    this.pathLength          = 55;
    this.pathSpacingInFrames = 3;

    // Debug state – written by variableCircuit.pathFollowForce()
    this._pfForce  = createVector(0, 0);
    this._pfTarget = null;
    this._pfInfo   = null;
  }

  show() {
    let c = this.col;

    // Neon trail from inherited this.path[]
    for (let i = 1; i < this.path.length; i++) {
      let t = i / this.path.length;
      push();
      stroke(red(c), green(c), blue(c), t * 150);
      strokeWeight(lerp(1, 3, t));
      noFill();
      line(this.path[i-1].x, this.path[i-1].y,
           this.path[i].x,   this.path[i].y);
      pop();
    }

    // Car body (rotates with velocity)
    push();
    translate(this.pos.x, this.pos.y);
    if (this.vel.mag() > 0.1) rotate(this.vel.heading() + HALF_PI);
    if (this.sprite) {
      imageMode(CENTER);
      image(this.sprite, 0, 0, this.r * 2, this.r * 2);
    } else {
      // Fallback: simple colored circle if no sprite provided
      fill(c);
      stroke(255, 255, 255, 150);
      strokeWeight(1);
      circle(0, 0, this.r * 2);
    }
    pop();

    if (Vehicle.debug) this._drawDebug();
  }

  _drawDebug() {
    if (!this._pfInfo) return;
    let info = this._pfInfo;

    // Line to nearest center point
    push();
    stroke(255, 255, 255, 90);
    strokeWeight(1);
    line(this.pos.x, this.pos.y, info.sample.pos.x, info.sample.pos.y);
    fill(255);
    noStroke();
    circle(info.sample.pos.x, info.sample.pos.y, 5);
    pop();

    // Dashed line to look-ahead target
    if (this._pfTarget) {
      push();
      stroke(0, 220, 180, 160);
      strokeWeight(1);
      drawingContext.setLineDash([4, 7]);
      line(this.pos.x, this.pos.y, this._pfTarget.x, this._pfTarget.y);
      drawingContext.setLineDash([]);
      noFill();
      stroke(0, 220, 180, 220);
      strokeWeight(2);
      circle(this._pfTarget.x, this._pfTarget.y, 10);
      pop();
    }

    // Path-follow force vector (cyan arrow)
    if (this._pfForce && this._pfForce.mag() > 0.002) {
      let scale = 180;
      let end   = p5.Vector.add(this.pos, p5.Vector.mult(this._pfForce, scale));
      let dir   = this._pfForce.copy().normalize();
      let perp  = createVector(-dir.y, dir.x);
      push();
      stroke(0, 200, 255);
      strokeWeight(2);
      line(this.pos.x, this.pos.y, end.x, end.y);
      line(end.x, end.y, end.x - dir.x*7 + perp.x*4, end.y - dir.y*7 + perp.y*4);
      line(end.x, end.y, end.x - dir.x*7 - perp.x*4, end.y - dir.y*7 - perp.y*4);
      fill(0, 200, 255);
      noStroke();
      textSize(10);
      text('PF', end.x + 5, end.y - 3);
      pop();
    }

    // Lateral offset bar
    let hw    = info.sample.hw;
    let ratio = info.absDistCenter / hw;
    let bw    = 50, bh = 5;
    let bx    = this.pos.x - bw / 2;
    let by    = this.pos.y + 20;
    push();
    fill(50, 50, 50);
    noStroke();
    rect(bx, by, bw, bh);
    fill(ratio > 0.7 ? color(255,60,60) : ratio > 0.28 ? color(255,200,40) : color(60,200,120));
    rect(bx + bw/2, by, (info.signedDist / hw) * bw/2, bh);
    stroke(255);
    strokeWeight(1);
    line(bx + bw/2, by, bx + bw/2, by + bh);
    pop();
  }
}
