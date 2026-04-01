/**
 * SliderPanel — utilitaire p5.js pour créer des sliders empilés verticalement.
 *
 * Usage:
 *   const panel = new SliderPanel(20, 20);
 *
 *   // Mode poll — lire .value() dans draw()
 *   const s = panel.add('Rayon cible', { min: 10, max: 200, value: 100, step: 1 });
 *   // dans draw() : target.radius = s.value();
 *
 *   // Mode push — onChange appelé à la création + à chaque changement
 *   panel.add('Vitesse max', { min: 1, max: 20, value: 10, step: 1,
 *     onChange: v => vehicles.forEach(ve => ve.maxSpeed = v)
 *   });
 */
class SliderPanel {
  /**
   * @param {number} x         Position X du panneau (défaut : 20)
   * @param {number} y         Position Y du panneau (défaut : 20)
   * @param {object} options
   * @param {number} options.gap          Espace vertical entre sliders (défaut : 40)
   * @param {number} options.sliderWidth  Largeur du slider (défaut : 180)
   * @param {number} options.labelWidth   Largeur réservée au label (défaut : 160)
   * @param {string} options.color        Couleur du texte (défaut : 'white')
   * @param {string} options.fontSize     Taille de police (défaut : '18px')
   */
  constructor(x = 20, y = 20, {
    gap         = 40,
    sliderWidth = 180,
    labelWidth  = 160,
    color       = 'white',
    fontSize    = '18px',
  } = {}) {
    this._x           = x;
    this._y           = y;
    this._gap         = gap;
    this._sliderWidth = sliderWidth;
    this._labelWidth  = labelWidth;
    this._color       = color;
    this._fontSize    = fontSize;
    this._count       = 0; // nombre de sliders ajoutés (pour l'empilement)
  }

  /**
   * Ajoute un slider au panneau.
   *
   * @param {string} label    Texte affiché à gauche du slider
   * @param {object} options
   * @param {number} options.min       Valeur minimale
   * @param {number} options.max       Valeur maximale
   * @param {number} options.value     Valeur initiale
   * @param {number} [options.step=0]  Pas (0 = continu)
   * @param {function} [options.onChange]  Appelée avec la valeur courante à la
   *                                       création ET à chaque changement.
   *
   * @returns {p5.Element} Le slider p5.js — utilisez .value() dans draw() si besoin.
   */
  add(label, { min, max, value, step = 0, onChange = null }) {
    const rowY = this._y + this._count * this._gap;

    // --- label + valeur courante dans le même div ---
    const labelDiv = createDiv(`${label}: ${value}`);
    labelDiv.position(this._x, rowY - 2);
    labelDiv.style('color', this._color);
    labelDiv.style('font-size', this._fontSize);
    labelDiv.style('width', `${this._labelWidth}px`);

    // --- slider ---
    const slider = createSlider(min, max, value, step);
    slider.position(this._x + this._labelWidth, rowY);
    slider.size(this._sliderWidth);

    // --- valeur numérique à droite ---
    const valueDiv = createDiv(value);
    valueDiv.position(this._x + this._labelWidth + this._sliderWidth + 10, rowY - 2);
    valueDiv.style('color', this._color);
    valueDiv.style('font-size', this._fontSize);

    // --- mise à jour du display + callback ---
    slider.input(() => {
      const v = slider.value();
      labelDiv.html(`${label}: ${v}`);
      valueDiv.html(v);
      if (onChange) onChange(v);
    });

    // --- appel immédiat du callback avec la valeur initiale ---
    if (onChange) onChange(value);

    this._count++;
    return slider;
  }
}
