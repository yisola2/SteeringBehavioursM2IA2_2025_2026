// 6 – Path Following
// Two modes: EDIT (build your circuit) and SIM (watch racers follow it).
// Press SPACE to switch.  Press D in sim to see the debug overlay.

let mode    = 'edit';    // 'edit' | 'sim'
let editor;
let circuit;
let racers  = [];

const RACER_COLORS = [
  [255,  60, 130],
  [ 50, 210, 255],
];

// Sprites loaded from assets (flags)
let RACER_SPRITES = [];

function preload() {
  RACER_SPRITES = [
    loadImage('assets/algeria_flag.png'),
    loadImage('assets/maroc_flag.png'),
  ];
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  editor = new CircuitEditor();
  editor.loadDefault();
}

// ── Modes ─────────────────────────────────────────────────────────────────

function _startSim() {
  let data = editor.getCircuitData();
  if (data.length < 3) return;
  circuit = new VariableCircuit(data);
  racers  = [];

  for (let i = 0; i < RACER_COLORS.length; i++) {
    let [r, g, b] = RACER_COLORS[i];
    let sIdx  = floor((i / RACER_COLORS.length) * circuit.samples.length);
    let s     = circuit.samples[sIdx];
    let racer = new Racer(
      s.pos.x + random(-15, 15),
      s.pos.y + random(-15, 15),
      color(r, g, b),
      RACER_SPRITES[i % RACER_SPRITES.length]
    );
    // Initial velocity along the track tangent
    racer.vel        = s.tangent.copy().mult(racer.maxSpeed * 0.5);
    racer.wanderTheta = random(TWO_PI);
    racers.push(racer);
  }
  mode = 'sim';
}

// ── Main loop ──────────────────────────────────────────────────────────────

function draw() {
  background(14, 14, 20);

  if (mode === 'edit') {
    editor.draw();
    return;
  }

  // Simulation
  circuit.show();

  for (let racer of racers) {
    let wander = racer.wander();          // inherited from Vehicle
    let pf     = circuit.pathFollowForce(racer);

    racer.applyForce(wander);
    racer.applyForce(pf);
    racer.update();
    racer.show();
  }

  _drawSimHUD();
}

function _drawSimHUD() {
  push();
  textAlign(LEFT, TOP);
  noStroke();
  fill(255, 255, 255, 200);
  textSize(18);
  text('Path Following', 22, 22);
  fill(255, 255, 255, 110);
  textSize(11);
  text('D – debug overlay     SPACE – back to editor', 22, 48);
  pop();
}

// ── Input ──────────────────────────────────────────────────────────────────

function mousePressed() {
  if (mode === 'edit') editor.onMousePressed();
}

function mouseDragged() {
  if (mode === 'edit') editor.onMouseDragged();
}

function mouseReleased() {
  if (mode === 'edit') editor.onMouseReleased();
}

function mouseMoved() {
  if (mode === 'edit') editor.onMouseMoved();
}

function keyPressed() {
  if (key === ' ') {
    if (mode === 'edit') _startSim();
    else                 mode = 'edit';
  }
  if (key === 'c' || key === 'C') {
    if (mode === 'edit') editor.copyToClipboard();
  }
  if (key === 'd' || key === 'D') {
    Vehicle.debug = !Vehicle.debug;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Rescale waypoints proportionally
  if (editor.points.length > 0) {
    // Points are stored as absolute pixels; rescale to new canvas
    for (let p of editor.points) {
      p.pos.x = (p.pos.x / width)  * windowWidth;
      p.pos.y = (p.pos.y / height) * windowHeight;
    }
  }
  if (mode === 'sim') _startSim();
}
