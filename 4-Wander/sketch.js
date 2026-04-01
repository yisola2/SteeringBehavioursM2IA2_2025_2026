let vehicles = [];
let imageFusee;
let debugCheckbox;

function preload() {
  // on charge une image de fusée pour le vaisseau
  imageFusee = loadImage('./assets/vehicule.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  const nbVehicles = 1;
  for (let i = 0; i < nbVehicles; i++) {
    let vehicle = new Vehicle(100, 100, imageFusee);
    vehicles.push(vehicle);
  }

  // On crée les sliders via SliderPanel
  const panel = new SliderPanel(10, 10);

  panel.add('Vitesse Max',      { min: 1,    max: 20,  value: 10,  step: 1,
    onChange: v => vehicles.forEach(ve => ve.maxSpeed = v) });

  panel.add('Force Max',        { min: 0.05, max: 2,   value: 0.1, step: 0.05,
    onChange: v => vehicles.forEach(ve => ve.maxForce = v) });

  panel.add('Rayon Wander',     { min: 5,    max: 100, value: 50,  step: 5,
    onChange: v => vehicles.forEach(ve => ve.wanderRadius = v) });

  panel.add('Distance Wander',  { min: 10,   max: 300, value: 150, step: 10,
    onChange: v => vehicles.forEach(ve => ve.distanceCercle = v) });

  // Checkbox pour activer/désactiver le mode debug
  debugCheckbox = createCheckbox('Mode Debug (touche d)', false);
  debugCheckbox.position(10, 10 + 4 * 40);
  debugCheckbox.style('color', 'white');
  debugCheckbox.style('font-size', '18px');
  debugCheckbox.changed(() => {
    Vehicle.debug = debugCheckbox.checked();
  });
}


// appelée 60 fois par seconde
function draw() {
  background(0);
  //background(0, 0, 0, 20);

  vehicles.forEach(vehicle => {
    let force = vehicle.wander();
    vehicle.applyForce(force);

    vehicle.update();
    vehicle.show();
    vehicle.edges();
  });
}

function keyPressed() {
  if (key === 'd') {
    Vehicle.debug = !Vehicle.debug;
    // changer la checkbox, elle doit être checkée si debug est true
    debugCheckbox.checked(Vehicle.debug);
  }
}
