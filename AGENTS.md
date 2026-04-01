# Steering Behaviours – Agent Guidelines

This project implements Craig Reynolds' steering behaviours in p5.js, following the research presented at GDC 1999:
https://www.red3d.com/cwr/steer/gdc99/

---

## Project Goal

Build a clean, reusable `Vehicle` class (and subclasses) that implements all of Reynolds' steering behaviours. The architecture separates:
- **Physics engine** (pos, vel, acc, update loop)
- **Steering behaviours** (seek, flee, arrive, pursue, evade, wander, …)
- **Rendering** (p5.js draw calls, debug visualisation)

The final `Vehicle` class must be **immutable in its core physics** — subclasses extend behaviour without altering the base physics contract.

---

## Folder Structure

```
/
├── 1-Seek/                   # Seek & Flee
├── 2-PursueEvade/            # Pursue & Evade (with prediction)
├── 2-PursueEvade_correction/ # Reference correction
├── 3-Arrival/                # Arrival (deceleration zone) + Snake chain
├── 3-Arrival_correction/     # Reference correction
├── 4-Wander/                 # Wander (autonomous, no external target)
├── Playground/               # Free experimentation with any behaviour (to be created)
└── AGENTS.md                 # This file
```

Each numbered folder is **self-contained**: it has its own `index.html`, `sketch.js`, `vehicle.js`, and local p5.js libraries. Do not share files between numbered folders.

The `Playground/` folder is the place to freely mix and compose behaviours. It follows the same self-contained convention.

---

## Reynolds' Steering Architecture — Core Rules

These rules must be respected at all times. They come directly from Reynolds' model.

### 1. Three-layer update cycle (mandatory every frame)

```javascript
// 1. Apply behaviours → accumulate forces into acc
this.acc.add(force);

// 2. Integrate physics
this.vel.add(this.acc);
this.vel.limit(this.maxSpeed);
this.pos.add(this.vel);
this.acc.set(0, 0);   // ALWAYS reset acceleration after integration
```

Never skip the acceleration reset. Never update `pos` without going through `vel`.

### 2. Steering force formula

Every behaviour computes a **desired velocity**, then subtracts the current velocity:

```javascript
let desired = /* direction */ .setMag(this.maxSpeed);
let force   = p5.Vector.sub(desired, this.vel);
force.limit(this.maxForce);
this.applyForce(force);
```

Never set velocity directly (except for initialisation). Always work through forces.

### 3. Behaviour list and expected signatures

| Behaviour   | Method signature                  | Notes |
|-------------|-----------------------------------|-------|
| Seek        | `seek(target)`                    | `target` is a `p5.Vector` |
| Flee        | `flee(target)`                    | Inverse desired velocity |
| Arrive      | `arrive(target, radius)`          | Linear slowdown inside `radius` using `map()` |
| Pursue      | `pursue(mover)`                   | `mover` has `.pos` and `.vel`; predict future position |
| Evade       | `evade(mover)`                    | Inverse of pursue |
| Wander      | `wander()`                        | Steering circle ahead, random angle displacement per frame |
| Boundaries  | `boundaries(margin)`              | Soft repulsion from canvas edges |

Add new behaviours by adding new methods. Never remove or rename existing ones.

### 4. `applyForce` must be the only way to mutate `acc`

```javascript
applyForce(force) {
  this.acc.add(force);
}
```

### 5. Toroidal edge wrapping (`edges()`)

When a vehicle exits one side it reappears on the opposite side. This is the default wrapping strategy unless the sketch explicitly needs boundaries behaviour instead.

---

## Vehicle Class Contract

The base `Vehicle` class must expose at minimum:

```javascript
class Vehicle {
  constructor(x, y)   // position, default physics params

  // Physics (do not override in subclasses)
  applyForce(force)
  update()
  edges()

  // Behaviours (override or extend in subclasses)
  seek(target)
  flee(target)
  arrive(target, radius)
  pursue(mover)
  evade(mover)
  wander()
  boundaries(margin)

  // Rendering (override freely)
  show()

  // Class-level debug flag
  static debug = false
}
```

Subclasses (e.g. `Target`, `Snake`) inherit `Vehicle` and may override `show()`, add behaviour compositions, or add domain-specific properties. They must **not** override `applyForce()`, `update()`, or `edges()`.

---

## p5.js Conventions

- Always use `p5.Vector` for positions, velocities, and forces. Never use raw `{x, y}` objects.
- Use `p5.Vector.sub(v1, v2)` for subtraction (does not mutate inputs).
- Use `v.copy()` before mutating a vector that belongs to another object.
- Use `push()` / `pop()` around every `show()` method.
- UI sliders are created in `setup()` and read inside `draw()` each frame (no caching).
- Debug visualisation (circles, vectors, lines) is gated on `Vehicle.debug`.

---

## Playground Rules

The `Playground/` folder is for free experimentation. Guidelines:

- It is self-contained (own `index.html`, `sketch.js`, and any needed class files).
- It should import `Vehicle` (or a subclass) and compose behaviours freely.
- Playground code does not need to be clean — it is a sandbox.
- When a Playground experiment stabilises into something reusable, extract it into a numbered folder.
- The Vehicle base class must not be modified to accommodate Playground experiments; extend it instead.

---

## What Not To Do

- Do not set `this.vel` or `this.pos` directly inside a behaviour method.
- Do not skip `this.acc.set(0, 0)` at the end of `update()`.
- Do not share `libraries/` or `vehicle.js` files between numbered folders via relative paths — keep each folder self-contained.
- Do not add rendering code inside behaviour methods (`seek`, `flee`, etc.); rendering belongs in `show()`.
- Do not use `deltaTime` compensation — the project assumes a fixed 60 FPS p5.js loop.
- Do not mix 2D and WEBGL renderers inside the same sketch.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Classes | PascalCase | `Vehicle`, `BouncingBall` |
| Methods | camelCase | `applyForce`, `wander` |
| Properties | camelCase | `maxSpeed`, `wanderTheta` |
| p5 sketch functions | lowercase | `setup`, `draw`, `mouseClicked` |
| Files | camelCase or lowercase | `vehicle.js`, `bouncingBall.js`, `sketch.js` |

---

## Language

Code comments and variable names are in **French** (pedagogical convention for M2 IA students). This file and commit messages may be in English or French.
