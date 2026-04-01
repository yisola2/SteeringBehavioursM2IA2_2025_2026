/**
 * Vehicle — classe de base pour tous les comportements de pilotage.
 * Implémente les comportements de Craig Reynolds (GDC 1999).
 *
 * Règles immuables :
 *  - Ne jamais modifier pos/vel directement dans une méthode de comportement.
 *  - Toujours passer par applyForce() pour accumuler les forces.
 *  - update() intègre la physique et remet acc à zéro chaque frame.
 */
class Vehicle {
  static debug = false;

  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(1, 0);
    this.acc = createVector(0, 0);

    this.maxSpeed = 4;
    this.maxForce = 0.2;
    this.r = 16;
    this.couleur = color(255);
    this.image = null; // image sprite optionnelle

    // --- Arrive ---
    this.rayonZoneDeFreinage = 100;

    // --- Wander ---
    this.distanceCercle = 150;
    this.wanderRadius   = 50;
    this.wanderTheta    = -Math.PI / 2;
    this.displaceRange  = 0.3;
  }

  // ─── Comportements ───────────────────────────────────────────────────────

  seek(target, arrival = false) {
    let desiredSpeed = this.maxSpeed;

    if (arrival) {
      let distance = p5.Vector.dist(this.pos, target);
      if (distance < this.rayonZoneDeFreinage) {
        desiredSpeed = map(distance, 0, this.rayonZoneDeFreinage, 0, this.maxSpeed);
      }
      if (Vehicle.debug) {
        push();
        noFill(); stroke(255, 255, 0, 120); strokeWeight(1);
        circle(target.x, target.y, this.rayonZoneDeFreinage * 2);
        pop();
      }
    }

    let force = p5.Vector.sub(target, this.pos);
    force.setMag(desiredSpeed);
    force.sub(this.vel);
    force.limit(this.maxForce);
    return force;
  }

  flee(target) {
    return this.seek(target).mult(-1);
  }

  arrive(target) {
    return this.seek(target, true);
  }

  pursue(mover) {
    let futurePos = mover.pos.copy().add(mover.vel.copy().mult(10));
    if (Vehicle.debug) {
      push();
      fill(0, 255, 0); noStroke();
      circle(futurePos.x, futurePos.y, 8);
      pop();
    }
    return this.seek(futurePos);
  }

  evade(mover) {
    return this.pursue(mover).mult(-1);
  }

  wander() {
    // Centre du cercle devant le véhicule
    let pointDevant = this.vel.copy().setMag(this.distanceCercle).add(this.pos);

    // Point sur le cercle à l'angle wanderTheta
    let theta = this.wanderTheta + this.vel.heading();
    let pointSurLeCercle = createVector(
      pointDevant.x + this.wanderRadius * cos(theta),
      pointDevant.y + this.wanderRadius * sin(theta)
    );

    // Déplacement aléatoire de l'angle à chaque frame
    this.wanderTheta += random(-this.displaceRange, this.displaceRange);

    if (Vehicle.debug) {
      push();
      drawingContext.setLineDash([5, 15]);
      stroke(255, 255, 255, 80); strokeWeight(1); noFill();
      line(this.pos.x, this.pos.y, pointDevant.x, pointDevant.y);
      drawingContext.setLineDash([]);
      noFill(); stroke(255); circle(pointDevant.x, pointDevant.y, this.wanderRadius * 2);
      fill('red');   noStroke(); circle(pointDevant.x,    pointDevant.y,    8);
      fill('green'); noStroke(); circle(pointSurLeCercle.x, pointSurLeCercle.y, 12);
      stroke('yellow'); strokeWeight(1);
      line(this.pos.x, this.pos.y, pointSurLeCercle.x, pointSurLeCercle.y);
      pop();
    }

    let force = p5.Vector.sub(pointSurLeCercle, this.pos);
    force.setMag(this.maxForce);
    return force;
  }

  /**
   * Répulsion douce depuis les bords du canvas.
   * @param {number} margin  Distance du bord à partir de laquelle la force s'active.
   */
  boundaries(margin = 50) {
    let desired = null;

    if (this.pos.x < margin)               desired = createVector( this.maxSpeed, this.vel.y);
    else if (this.pos.x > width - margin)  desired = createVector(-this.maxSpeed, this.vel.y);

    if (this.pos.y < margin)               desired = createVector(this.vel.x,  this.maxSpeed);
    else if (this.pos.y > height - margin) desired = createVector(this.vel.x, -this.maxSpeed);

    if (Vehicle.debug) {
      push();
      noFill(); stroke(this.couleur || 255); strokeWeight(1);
      drawingContext.setLineDash([4, 6]);
      rect(margin, margin, width - margin * 2, height - margin * 2);
      drawingContext.setLineDash([]);
      pop();
    }

    if (desired) {
      desired.setMag(this.maxSpeed);
      let force = p5.Vector.sub(desired, this.vel);
      force.limit(this.maxForce);
      return force;
    }
    return createVector(0, 0);
  }

  // ─── Physique ─────────────────────────────────────────────────────────────

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  edges() {
    if (this.pos.x >  width  + this.r) this.pos.x = -this.r;
    if (this.pos.x < -this.r)          this.pos.x =  width  + this.r;
    if (this.pos.y >  height + this.r) this.pos.y = -this.r;
    if (this.pos.y < -this.r)          this.pos.y =  height + this.r;
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    if (this.vel.mag() > 0.1) rotate(this.vel.heading());

    if (this.image) {
      // l'image est orientée vers le haut — on corrige de -PI/2
      rotate(-PI / 2);
      imageMode(CENTER);
      image(this.image, 0, 0, this.r * 2, this.r * 2);
    } else {
      fill(this.couleur); stroke(0); strokeWeight(2);
      triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);
    }
    pop();
  }
}

// ─── Target ──────────────────────────────────────────────────────────────────
// Véhicule autonome qui rebondit sur les bords — utile comme cible mobile.

class Target extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.vel = p5.Vector.random2D().mult(3);
    this.r = 12;
  }

  update() {
    // Rebondit sur les bords (pas de wrapping toroidal)
    if (this.pos.x < this.r || this.pos.x > width  - this.r) this.vel.x *= -1;
    if (this.pos.y < this.r || this.pos.y > height - this.r) this.vel.y *= -1;
    this.pos.add(this.vel);
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    fill('#F063A4'); stroke(255); strokeWeight(2);
    circle(0, 0, this.r * 2);
    pop();
  }
}
