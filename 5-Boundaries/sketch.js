// 5 – Boundaries test environment
// "Declined Sympathy" S-shaped circuit
//
// Racers wander autonomously; the sophisticated boundaries algorithm
// (three-component: position correction A, velocity damping B,
// look-ahead C) keeps them on the track.
//
// Press D to toggle the full debug overlay for all components.
// Press +/- to adjust the look-ahead distance live.

let circuit;
let racers = [];

const RACER_COLORS = [
  [255,  60, 130],   // pink
  [80, 200, 130],   // minty
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  circuit = new Circuit();
  _spawnRacers();
}

function _spawnRacers() {
  racers = [];
  let wps = circuit.controlPoints;

  for (let i = 0; i < RACER_COLORS.length; i++) {
    let [r, g, b] = RACER_COLORS[i];
    // Place each racer on a different control point
    let wp   = wps[floor((i / RACER_COLORS.length) * wps.length)];
    let racer = new TestRacer(
      wp.x + random(-20, 20),
      wp.y + random(-20, 20),
      color(r, g, b)
    );
    // Give an initial velocity along the nearest tangent so wander starts reasonably
    let sample = circuit.projectOntoTrack(racer.pos);
    racer.vel  = sample.tangent.copy().mult(racer.maxSpeed * 0.6);
    racer.visualAngle = racer.vel.heading();
    racers.push(racer);
  }
}

function draw() {
  background(14, 14, 20);

  circuit.show();

  for (let racer of racers) {
    // 1. Locomotion: wander (inherited from Vehicle)
    let wanderForce = racer.wander();
    racer.applyForce(wanderForce);

    // 2. Boundaries: sophisticated three-component force
    let boundForce = circuit.boundaryForce(racer);
    racer.applyForce(boundForce);

    // 3. Simulate + render
    racer.update();
    racer.show();
  }

  _drawHUD();
}

function _drawHUD() {
  push();
  textAlign(LEFT, TOP);
  noStroke();

  fill(255, 255, 255, 210);
  textSize(20);
  text('Boundaries Test  –  Declined Sympathy', 20, 20);

  fill(80, 200, 130, 200);
  textSize(12);
  text(`Look-ahead: ${circuit.lookAheadFrames} frames   Danger zone: ${floor(circuit.dangerFraction * 100)}% of half-width`, 20, 48);

  fill(255, 255, 255, 110);
  textSize(11);
  text('D – debug overlay     +/- – adjust look-ahead', 20, 66);

  if (Vehicle.debug) {
    let lx = 20, ly = height - 90;
    textSize(11);
    fill(50, 130, 255);  text('A  position correction',   lx, ly);
    fill(255, 150, 30);  text('B  velocity damping',      lx, ly + 16);
    fill(190,  60, 255); text('C  look-ahead prediction', lx, ly + 32);
    fill(255, 255, 255, 100);
    text('bar below car = lateral offset (red = danger zone)', lx, ly + 50);
  }

  pop();
}

function keyPressed() {
  if (key === 'd' || key === 'D') {
    Vehicle.debug = !Vehicle.debug;
  }
  if (key === '+' || key === '=') {
    circuit.lookAheadFrames = min(circuit.lookAheadFrames + 2, 60);
  }
  if (key === '-') {
    circuit.lookAheadFrames = max(circuit.lookAheadFrames - 2, 0);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  circuit = new Circuit();
  _spawnRacers();
}
