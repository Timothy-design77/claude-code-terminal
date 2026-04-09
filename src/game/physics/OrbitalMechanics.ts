import { Vector2 } from './Vector2';
import { PhysicsWorld } from './PhysicsWorld';
import { ORBIT_PREDICTION_STEPS, ORBIT_PREDICTION_DT, G } from '../types';
import { CelestialBody } from './CelestialBody';

export interface OrbitPrediction {
  points: Vector2[];
  isEscape: boolean;
  willCollide: boolean;
  collisionBody?: CelestialBody;
}

export interface OrbitalElements {
  apoapsis: number;
  periapsis: number;
  eccentricity: number;
  period: number;
  semiMajorAxis: number;
}

export class OrbitalMechanics {
  // Predict future trajectory by forward simulation
  static predictOrbit(
    position: Vector2,
    velocity: Vector2,
    world: PhysicsWorld,
    steps: number = ORBIT_PREDICTION_STEPS,
    dt: number = ORBIT_PREDICTION_DT
  ): OrbitPrediction {
    const points: Vector2[] = [];
    let pos = position.clone();
    let vel = velocity.clone();
    let isEscape = false;
    let willCollide = false;
    let collisionBody: CelestialBody | undefined;

    const startDominant = world.findDominantBody(pos);
    const startDist = startDominant ? pos.distanceTo(startDominant.position) : Infinity;

    for (let i = 0; i < steps; i++) {
      // Velocity Verlet step — gravity only from celestial bodies (no self-gravity)
      const acc = world.calculateGravityAcceleration(pos);
      pos = new Vector2(
        pos.x + vel.x * dt + 0.5 * acc.x * dt * dt,
        pos.y + vel.y * dt + 0.5 * acc.y * dt * dt
      );
      const newAcc = world.calculateGravityAcceleration(pos);
      vel = new Vector2(
        vel.x + 0.5 * (acc.x + newAcc.x) * dt,
        vel.y + 0.5 * (acc.y + newAcc.y) * dt
      );

      // NaN guard — abort prediction if physics diverged
      if (isNaN(pos.x) || isNaN(pos.y)) break;

      points.push(pos.clone());

      // Check collision with any body
      for (const body of world.bodies) {
        if (pos.distanceTo(body.position) < body.radius) {
          willCollide = true;
          collisionBody = body;
          return { points, isEscape, willCollide, collisionBody };
        }
      }

      // Check if escaping
      if (startDominant && pos.distanceTo(startDominant.position) > startDist * 3) {
        isEscape = true;
      }
    }

    return { points, isEscape, willCollide, collisionBody };
  }

  // Calculate orbital elements around a dominant body
  static calculateOrbitalElements(
    position: Vector2,
    velocity: Vector2,
    body: CelestialBody
  ): OrbitalElements | null {
    const relPos = position.sub(body.position);
    const relVel = velocity.sub(body.velocity);
    const r = relPos.magnitude();
    const v = relVel.magnitude();
    const mu = G * body.mass;

    // Guard against degenerate cases
    if (r < 0.01 || mu < 0.01) return null;

    const energy = 0.5 * v * v - mu / r;

    // Escape trajectory
    if (energy >= 0) return null;

    const a = -mu / (2 * energy);
    const h = relPos.cross(relVel);

    const eSq = 1 + (2 * energy * h * h) / (mu * mu);
    const e = Math.sqrt(Math.max(0, eSq));

    const periapsis = a * (1 - e);
    const apoapsis = a * (1 + e);
    const period = 2 * Math.PI * Math.sqrt(Math.abs(a * a * a) / mu);

    // Guard against unreasonable values
    if (!isFinite(period) || !isFinite(apoapsis)) return null;

    return { apoapsis, periapsis, eccentricity: e, period, semiMajorAxis: a };
  }

  static circularOrbitVelocity(body: CelestialBody, distance: number): number {
    return Math.sqrt(G * body.mass / Math.max(distance, 1));
  }
}
