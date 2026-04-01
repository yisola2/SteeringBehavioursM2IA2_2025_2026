let target;
//un tableau de véhicules
let vehicles = [];
//fonction pour créer n véhicules aléatoires dans le canvas




// la fonction setup est appelée une fois au démarrage du programme par p5.js
function setup() {
  // on crée un canvas de 800px par 800px
  createCanvas(windowWidth, windowHeight);
  
  // On crée un véhicule à la position (100, 100)
  //vehicle = new Vehicle(100, 100);
  
  creerVehicles(4);
  
  // La cible est un vecteur avec une position aléatoire dans le canvas
  // dirigée par la souris ensuite dans draw()
  target = new Target(random(width), random(height));
  
  // Slider Force (gauche)
  let labelSliderForce = createDiv('Force:');
  labelSliderForce.position(20, 12);
  labelSliderForce.style('color', 'white');
  labelSliderForce.style("font-size", "14px");

  sliderForce = createSlider(0.01, 1, 0.1, 0.01);
  sliderForce.position(80, 10);
  sliderForce.size(100);

  // Slider Rayon de la cible (centre)
  let labelSliderRadius = createDiv('Rayon cible:');
  labelSliderRadius.position(220, 12);
  labelSliderRadius.style('color', 'white');
  labelSliderRadius.style("font-size", "14px");

  sliderRadius = createSlider(10, 100, 50);
  sliderRadius.position(320, 10);
  sliderRadius.size(100);

  // Slider Vitesse max (droite)
  let labelVitesseMax = createDiv('Vitesse max:');
  labelVitesseMax.position(460, 12);
  labelVitesseMax.style('color', 'white');
  labelVitesseMax.style("font-size", "14px");

  vitesseMaxSlider = createSlider(1, 20, 10, 1);
  vitesseMaxSlider.position(570, 10);
  vitesseMaxSlider.size(100);

  
  
}

function creerVehicles(n) {
  for (let i=0; i<n; i++) {
    let v = new Vehicle(random(width), random(height));
    vehicles.push(v);
  }
}
// la fonction draw est appelée en boucle par p5.js, 60 fois par seconde par défaut
// Le canvas est effacé automatiquement avant chaque appel à draw
function draw() {
  // fond noir pour le canvas
  background("black");
  
  // A partir de maintenant toutes les formes pleines seront en rouge
  fill("red");
  // pas de contours pour les formes.
  noStroke();

  // mouseX et mouseY sont des variables globales de p5.js, elles correspondent à la position de la souris
  // on les stocke dans un vecteur pour pouvoir les utiliser avec la méthode seek (un peu plus loin)
  // du vehicule
  //target.x = mouseX;
  //target.y = mouseY;

  // Dessine un cercle de rayon 32px à la position de la souris
  // la couleur de remplissage est rouge car on a appelé fill(255, 0, 0) plus haut
  // pas de contours car on a appelé noStroke() plus haut
  //circle(target.x, target.y, 32);

  // je déplace et dessine chaque véhicule
  /*for (let v of vehicles) {
    
    v.applyBehaviors(target);
    v.update();
    v.show();
  }*/
  
  target.update();
  target.show()
  target.edges();

  vehicles.forEach((vehicle) => {
    vehicle.forceSeek = sliderForce.value();
    fill("white"); textSize(14); textAlign(LEFT, CENTER);
    text(vehicle.forceSeek, 185, 28);

    vehicle.radiusTarget = sliderRadius.value();
    fill("white"); textSize(14); textAlign(LEFT, CENTER);
    text(vehicle.radiusTarget, 425, 28);

    vehicle.maxSpeed = vitesseMaxSlider.value();
    fill("white"); textSize(14); textAlign(LEFT, CENTER);
    text(vehicle.maxSpeed, 675, 28);

    vehicle.applyBehaviors(target.pos);
    
    vehicle.update();

    vehicle.show();
    // Detection : si le vehicule touche la target, il reapparait
    // ailleurs aléatoirement dans le canvas
    // si distance < somme des rayons (rayon du véhicule + rayon de la cible)
    if (vehicle.pos.dist(target.pos) < vehicle.r + 16) {
      // le véhicule a touché la cible, on le fait réapparaître ailleurs aléatoirement dans le canvas
      vehicle.pos = createVector(random(width), random(height));
    }

    // si le véhicule sort du canvas, on le fait réapparaître de l'autre côté
    vehicle.edges();
  });

}
