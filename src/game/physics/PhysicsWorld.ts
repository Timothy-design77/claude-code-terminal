import { Vector2 } from './Vector2';
import { CelestialBody } from './CelestialBody';
import { G } from '../types';

export class PhysicsWorld {
  bodies: CelestialBody[] = [];

  addBody(body: CelestialBody) {
    this.bodies.push(body);
  }

  // Calculate gravitational acceleration on an object at position from all bodies
  calculateGravityAcceleration(position: Vector2, excludeBody?: CelestialBody): Vector2 {
    let ax = 0;
    let ay = 0;

    for (const body of this.bodies) {
      if (body === excludeBody) continue;

      const dx = body.position.x - position.x;
      const dy = body.position.y - position.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      // Softening to prevent singularity at very close range
      const softening = body.radius * 0.5;
      const effectiveDistSq = distSq + softening * softening;

      const force = G * body.mass / effectiveDistSq;
      ax += (dx / dist) * force;
      ay += (dy / dist) * force;
    }

    return new Vector2(ax, ay);
  }

  // Find the dominant body (strongest gravitational influence) for a position
  findDominantBody(position: Vector2): CelestialBody | null {
    let strongest: CelestialBody | null = null;
    let strongestForce = 0;

    for (const body of this.bodies) {
      const distSq = position.distanceToSq(body.position);
      const force = G * body.mass / Math.max(distSq, 1);
      if (force > strongestForce) {
        strongestForce = force;
        strongest = body;
      }
    }

    return strongest;
  }

  // Velocity Verlet integration step for all bodies
  update(dt: number) {
    // Calculate accelerations
    for (const body of this.bodies) {
      if (body.fixed) {
        body.acceleration = Vector2.zero();
        continue;
      }
      body.acceleration = this.calculateGravityAcceleration(body.position, body);
    }

    // Update positions: x += v*dt + 0.5*a*dt^2
    for (const body of this.bodies) {
      if (body.fixed) continue;
      body.position.x += body.velocity.x * dt + 0.5 * body.acceleration.x * dt * dt;
      body.position.y += body.velocity.y * dt + 0.5 * body.acceleration.y * dt * dt;
    }

    // Calculate new accelerations
    const newAccelerations: Vector2[] = [];
    for (const body of this.bodies) {
      if (body.fixed) {
        newAccelerations.push(Vector2.zero());
        continue;
      }
      newAccelerations.push(this.calculateGravityAcceleration(body.position, body));
    }

    // Update velocities: v += 0.5*(a_old + a_new)*dt
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      if (body.fixed) continue;
      body.velocity.x += 0.5 * (body.acceleration.x + newAccelerations[i].x) * dt;
      body.velocity.y += 0.5 * (body.acceleration.y + newAccelerations[i].y) * dt;
      body.acceleration = newAccelerations[i];
    }
  }
}
