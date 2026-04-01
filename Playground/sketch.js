/**
 * Playground — bac à sable pour expérimenter les comportements de pilotage.
 */

let vehicles = [];
let target;
let darkLayer;   // couche de noirceur avec trou de lumière
let imgVehicule; // sprite hélicoptère

function preload() {
  imgVehicule = loadImage('./assets/vehicule.png');
}

// Définition des comportements.
// hex          : couleur du véhicule + titre du panel
// behaviour    : fonction (v) => force
// useBoundaries: utiliser la répulsion des bords (pas de wrapping)
// sliders      : paramètres exposés dans le panel de ce véhicule
const CONFIGS = [
  {
    label: 'Wander', hex: '#4FC3F7', useBoundaries: true,
    behaviour: v => v.wander(),
    sliders: [
      { label: 'Vitesse max',     prop: 'maxSpeed',       min: 1,   max: 20,  value: 4,   step: 1   },
      { label: 'Force max',       prop: 'maxForce',       min: 0.05,max: 2,   value: 0.2, step: 0.05},
      { label: 'Rayon wander',    prop: 'wanderRadius',   min: 5,   max: 200, value: 50,  step: 5   },
      { label: 'Distance wander', prop: 'distanceCercle', min: 10,  max: 400, value: 150, step: 10  },
      // --- Torche ---
      { label: 'Rayon torche',    prop: 'rayonTorche',    min: 30,  max: 600, value: 250, step: 10  },
      { label: 'Angle torche °',  prop: '_angleTorcheDeg',min: 5,   max: 180, value: 55,  step: 5,
        onChange: val => { vehicles[0]._angleTorcheDeg = val; vehicles[0].angleTorche = radians(val); } },
      { label: 'Obscurité',       prop: 'obscurite',      min: 0,   max: 255, value: 210, step: 5   },
      // --- Lumière ---
      { label: 'Intensité',       prop: 'intensiteLumiere',   min: 0,   max: 1,   value: 0.15, step: 0.01 },
      { label: 'Température',     prop: 'temperatureLumiere', min: 0,   max: 100, value: 75,   step: 1    },
      { label: 'Scintillement',   prop: 'scintillement',      min: 0,   max: 80,  value: 0,    step: 1    },
    ],
  },
  {
    label: 'Seek', hex: '#81C784', useBoundaries: false,
    behaviour: v => v.seek(target.pos),
    sliders: [
      { label: 'Vitesse max', prop: 'maxSpeed', min: 1,    max: 20, value: 4,   step: 1   },
      { label: 'Force max',   prop: 'maxForce', min: 0.05, max: 2,  value: 0.2, step: 0.05},
    ],
  },
  {
    label: 'Flee', hex: '#E57373', useBoundaries: true,
    behaviour: v => v.flee(target.pos),
    sliders: [
      { label: 'Vitesse max', prop: 'maxSpeed', min: 1,    max: 20, value: 4,   step: 1   },
      { label: 'Force max',   prop: 'maxForce', min: 0.05, max: 2,  value: 0.2, step: 0.05},
    ],
  },
  {
    label: 'Arrive', hex: '#FFD54F', useBoundaries: false,
    behaviour: v => v.arrive(target.pos),
    sliders: [
      { label: 'Vitesse max',   prop: 'maxSpeed',           min: 1,   max: 20,  value: 4,   step: 1   },
      { label: 'Force max',     prop: 'maxForce',           min: 0.05,max: 2,   value: 0.2, step: 0.05},
      { label: 'Rayon arrivée', prop: 'rayonZoneDeFreinage',min: 10,  max: 300, value: 100, step: 10  },
    ],
  },
  {
    label: 'Pursue', hex: '#CE93D8', useBoundaries: false,
    behaviour: v => v.pursue(target),
    sliders: [
      { label: 'Vitesse max', prop: 'maxSpeed', min: 1,    max: 20, value: 4,   step: 1   },
      { label: 'Force max',   prop: 'maxForce', min: 0.05, max: 2,  value: 0.2, step: 0.05},
    ],
  },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  darkLayer = createGraphics(width, height);

  // --- Cible = souris ---
  target = { pos: createVector(mouseX, mouseY), vel: createVector(0, 0) };

  // --- Création des véhicules + panels ---
  let panelY = 10;
  CONFIGS.forEach((cfg, i) => {
    let v = new Vehicle(random(width), random(height));
    v.couleur       = color(cfg.hex);
    v.label         = cfg.label;
    v.behaviour     = cfg.behaviour;
    v.useBoundaries = cfg.useBoundaries;

    // Hélicoptère Wander : image + grande taille + torche
    if (i === 0) {
      v.image  = imgVehicule;
      v.r      = 46;
      // valeurs initiales torche (les sliders vont les écraser via onChange)
      v.rayonTorche        = 250;
      v.angleTorche        = radians(55);
      v.obscurite          = 210;
      v.intensiteLumiere   = 0.15;
      v.temperatureLumiere = 75;
      v.scintillement      = 0;
    }

    vehicles.push(v);

    // Panel propre à ce véhicule
    // Les sliders avec un onChange custom (ex: angle en degrés) l'utilisent directement.
    // Les autres utilisent le onChange générique prop → vehicle.
    let panel = new SliderPanel(10, panelY, { title: cfg.label, titleColor: cfg.hex });
    cfg.sliders.forEach(s => {
      // Si le slider définit son propre onChange, on l'utilise (il reçoit la valeur + le véhicule)
      let onChange = s.onChange
        ? val => s.onChange(val)
        : val => { v[s.prop] = val; };
      panel.add(s.label, { ...s, onChange });
    });
    panelY += panel.height() + 12;
  });

  // Checkbox debug
  let debugCheckbox = createCheckbox('Debug (d)', false);
  debugCheckbox.position(10, panelY + 5);
  debugCheckbox.style('color', 'white');
  debugCheckbox.style('font-size', '14px');
  debugCheckbox.changed(() => Vehicle.debug = debugCheckbox.checked());
}

function draw() {
  background(10);

  // --- Cible = souris ---
  let mousePos = createVector(mouseX, mouseY);
  target.vel = p5.Vector.sub(mousePos, target.pos);
  target.pos = mousePos;

  push();
  fill('#F063A4'); noStroke();
  circle(target.pos.x, target.pos.y, 20);
  pop();

  // --- Véhicules ---
  vehicles.forEach(v => {
    v.applyForce(v.behaviour(v));
    if (v.useBoundaries) v.applyForce(v.boundaries(80));

    v.update();
    v.show();
    if (!v.useBoundaries) v.edges();

    // label au-dessus
    push();
    fill(v.couleur); noStroke();
    textAlign(CENTER); textSize(12);
    text(v.label, v.pos.x, v.pos.y - v.r - 5);
    pop();
  });

  // --- Effet torche (dessiné en dernier, par-dessus tout) ---
  dessinerTorches();
}

/**
 * Dessine une couche de noirceur sur tout le canvas, puis perce un cône
 * de lumière devant chaque véhicule ayant une torche (rayonTorche défini).
 */
function dessinerTorches() {
  let helico = vehicles[0]; // seul le wander a une torche pour l'instant
  if (!helico.rayonTorche) return;

  darkLayer.clear();

  // Fond sombre
  darkLayer.noStroke();
  darkLayer.fill(0, helico.obscurite);
  darkLayer.rect(0, 0, width, height);

  // Percer le cône de lumière avec destination-out
  let ctx = darkLayer.drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  let x = helico.pos.x;
  let y = helico.pos.y;
  let angle = helico.vel.heading();
  // Scintillement : variation aléatoire du rayon à chaque frame
  let rayon = helico.rayonTorche + random(-helico.scintillement, helico.scintillement);
  let demiAngle = helico.angleTorche;

  // Gradient radial : opaque au centre, transparent au bord
  let grd = ctx.createRadialGradient(x, y, 0, x, y, rayon);
  grd.addColorStop(0,    'rgba(0,0,0,1)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.95)');
  grd.addColorStop(0.85, 'rgba(0,0,0,0.5)');
  grd.addColorStop(1,    'rgba(0,0,0,0)');

  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, rayon, angle - demiAngle, angle + demiAngle);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // --- Teinte de lumière colorée dans le cône ---
  // Température : 0 = froid (bleu-blanc), 100 = chaud (jaune-orange)
  let t = helico.temperatureLumiere / 100;
  let lr = Math.round(lerp(160, 255, t));
  let lg = Math.round(lerp(200, 200, t));
  let lb = Math.round(lerp(255,  50, t));
  let alpha = helico.intensiteLumiere;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  let warmGrd = ctx.createRadialGradient(x, y, 0, x, y, rayon);
  warmGrd.addColorStop(0,   `rgba(${lr},${lg},${lb},${alpha})`);
  warmGrd.addColorStop(0.6, `rgba(${lr},${lg},${lb},${alpha * 0.4})`);
  warmGrd.addColorStop(1,   `rgba(${lr},${lg},${lb},0)`);
  ctx.fillStyle = warmGrd;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, rayon, angle - demiAngle, angle + demiAngle);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Appliquer la couche sur le canvas principal
  image(darkLayer, 0, 0);

  // L'hélicoptère lui-même est redessiné par-dessus le noir pour toujours être visible
  helico.show();
}

function keyPressed() {
  if (key === 'd') Vehicle.debug = !Vehicle.debug;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  darkLayer.resizeCanvas(width, height);
}
