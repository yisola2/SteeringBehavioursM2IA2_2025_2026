let target;
let vehicles = [];
let lightActive = false; // pour activer/désactiver la lumière au clic


// Appelée avant de démarrer l'animation
function preload() {
  // en général on charge des images, des fontes de caractères etc.
  font = loadFont('./assets/inconsolata.otf');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);

  // La cible, ce sera la position de la souris
  target = createVector(random(width - 200, width/2), random(height - 200, height/2));

  // on cree n véhicules
  creerVehicules(20);
}

function creerVehicules(n) {
  for (let i = 0; i < n; i++) {
    let v = new Vehicle(random(-width/2 + 50, width/2 - 50), random(-height/2 + 50, height/2 - 50));
    vehicles.push(v);
  }
}

// appelée 60 fois par seconde
function draw() {
  // Nuit - fond très sombre
  background(5, 5, 15);
  
  // Lumière ambiante très faible (nuit)
  ambientLight(40, 40, 50);
  
  // Si L est pressé : lumière de scène (vient du dessus, éclaire tout)
  if (lightActive) {
    directionalLight(255, 255, 220, 0, -1, -1);
  }

  // Convertir les coordonnées de la souris pour WEBGL
  target.x = mouseX - width / 2;
  target.y = mouseY - height / 2;

  // dessin de la cible à la position de la souris
  push();
  translate(target.x, target.y, 0);
  fill(255, 0, 0);
  noStroke();
  sphere(16);
  pop();

  // 1) lignes entre les anneaux (dessinées avant les véhicules)
  push();
  strokeCap(ROUND);
  vehicles.forEach((vehicle, index) => {
    if (index === 0) return; // pas de ligne pour le premier
    stroke(255, 255, 255, 120);
    strokeWeight(vehicle.r * 2);
    line(vehicles[index - 1].pos.x, vehicles[index - 1].pos.y, 0,
         vehicle.pos.x, vehicle.pos.y, 0);
  });
  pop();

  // 2) comportement + dessin des véhicules
  vehicles.forEach((vehicle, index) => {
    let cible = (index === 0) ? target : vehicles[index - 1].pos;
    vehicle.applyForce(vehicle.arrive(cible, 50));
    vehicle.update();
    vehicle.show();
  });

}

function keyPressed() {
  if (key === 'd') {
    Vehicle.debug = !Vehicle.debug;
  }
  if (key === 'l' || key === 'L') {
    lightActive = !lightActive;
  }
}
