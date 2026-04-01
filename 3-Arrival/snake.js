class Snake extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.maxForce = 0.5;
    this.maxSpeed = 4;
    this.r = 8;
  }
}