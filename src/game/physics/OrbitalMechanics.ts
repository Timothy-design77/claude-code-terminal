import { Vector2 } from './Vector2';
import { PhysicsWorld } from './PhysicsWorld';
import { ORBIT_PREDICTION_STEPS, ORBIT_PREDICTION_DT, G } from '../types';
import { CelestialBody } from './CelestialBody';

export interface OrbitPrediction {
  points: Vector2[];
  isEscape: boolean;  // Trajectory escapes the dominant body's influence
  willCollide: boolean;  // Trajectory intersects a body
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
      // Velocity Verlet step
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

      points.push(pos.clone());

      // Check collision with any body
      for (const body of world.bodies) {
        if (pos.distanceTo(body.position) < body.radius) {
          willCollide = true;
          collisionBody = body;
          return { points, isEscape, willCollide, collisionBody };
        }
      }

      // Check if escaping (distance > 3x start distance from dominant body)
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

    // Specific orbital energy
    const energy = 0.5 * v * v - mu / r;

    // If energy >= 0, hyperbolic/parabolic (escape) trajectory
    if (energy >= 0) return null;

    // Semi-major axis
    const a = -mu / (2 * energy);

    // Angular momentum (scalar in 2D)
    const h = relPos.cross(relVel);

    // Eccentricity
    const eSq = 1 + (2 * energy * h * h) / (mu * mu);
    const e = Math.sqrt(Math.max(0, eSq));

    // Apoapsis and periapsis
    const periapsis = a * (1 - e);
    const apoapsis = a * (1 + e);

    // Orbital period (Kepler's third law)
    const period = 2 * Math.PI * Math.sqrt((a * a * a) / mu);

    return {
      apoapsis,
      periapsis,
      eccentricity: e,
      period,
      semiMajorAxis: a,
    };
  }

  // Calculate circular orbit velocity at a given distance from a body
  static circularOrbitVelocity(body: CelestialBody, distance: number): number {
    return Math.sqrt(G * body.mass / distance);
  }
}
