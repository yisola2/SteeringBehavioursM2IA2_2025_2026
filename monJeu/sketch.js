// Drifters Don't Brake – Midnight Edition
// Player car: LEFT / RIGHT arrows (or A / D) to steer. No braking ever.
// AI cars use steering behaviours: seek (waypoints) + separation.

let track;
let player;    // PlayerCar – controlled by keyboard
let cars = []; // AI DriftCars

// Five neon colours for AI cars
const NEON = [
  [255,  40, 120],   // hot pink
  [ 40, 210, 255],   // cyan
  [150, 255,  40],   // lime
  [255, 200,  20],   // amber
  [185,  40, 255],   // purple
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  track  = new Track();
  player = _spawnPlayer();
  cars   = _spawnAICars();
}

function _spawnPlayer() {
  let wp = track.waypoints[0];
  let p  = new PlayerCar(wp.x, wp.y);

  // Point toward first waypoint so it starts moving correctly
  let nextWp   = track.waypoints[1];
  let initDir  = p5.Vector.sub(nextWp, wp).setMag(p.minSpeed);
  p.vel        = initDir;
  p.steerAngle = initDir.heading();
  p.visualAngle = p.steerAngle;
  return p;
}

function _spawnAICars() {
  let result = [];
  let wps    = track.waypoints;

  for (let i = 0; i < NEON.length; i++) {
    // Spread AI cars around the track, skip waypoint 0 (reserved for player)
    let wpIdx  = 1 + floor((i / NEON.length) * (wps.length - 1));
    let wp     = wps[wpIdx];

    let car = new DriftCar(
      wp.x + random(-12, 12),
      wp.y + random(-12, 12),
      color(NEON[i][0], NEON[i][1], NEON[i][2])
    );

    car.waypointIndex = (wpIdx + 1) % wps.length;
    let nextWp = wps[car.waypointIndex];
    let initDir = p5.Vector.sub(nextWp, wp).setMag(car.minSpeed);
    car.vel = initDir;
    car.visualAngle = initDir.heading();

    result.push(car);
  }
  return result;
}

function draw() {
  background(8, 10, 18);  // midnight

  track.show();

  // All vehicles in one list for separation calculations
  let all = [player, ...cars];

  // --- AI cars -----------------------------------------------------------
  for (let car of cars) {
    let followForce = car.followWaypoints(track.waypoints);
    let sepForce    = car.separate(all);

    car.applyForce(followForce);
    car.applyForce(p5.Vector.mult(sepForce, 1.8));

    car.update();
    car.show();
  }

  // --- Player car (drawn last = on top) ----------------------------------
  let playerSep = player.separate(all);
  player.applyForce(p5.Vector.mult(playerSep, 1.8));
  player.update();   // handleInput() is called inside update()
  player.show();
  player.edges();    // allow player to wrap around if they go off-screen

  _drawHUD();
}

function _drawHUD() {
  push();
  textAlign(LEFT, TOP);
  noStroke();

  // Title
  fill(255, 255, 255, 220);
  textSize(22);
  text("DRIFTERS DON'T BRAKE", 22, 22);

  // Subtitle
  fill(80, 130, 255, 200);
  textSize(13);
  text('M I D N I G H T   E D I T I O N', 24, 50);

  // Controls
  fill(255, 255, 255, 130);
  textSize(11);
  text('STEER:  ← → arrows  or  A / D      NO BRAKES', 24, 72);

  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  track  = new Track();
  player = _spawnPlayer();
  cars   = _spawnAICars();
}
