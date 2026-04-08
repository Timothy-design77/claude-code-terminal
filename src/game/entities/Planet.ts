import { CelestialBody } from '../physics/CelestialBody';
import { Vector2 } from '../physics/Vector2';
import { OrbitalMechanics } from '../physics/OrbitalMechanics';

export function createPlanet(
  name: string,
  mass: number,
  radius: number,
  orbitalDistance: number,
  parentBody: CelestialBody,
  color: number,
  atmosphereColor?: number,
  angle: number = Math.random() * Math.PI * 2
): CelestialBody {
  // Place at orbitalDistance from parent at a random angle
  const position = parentBody.position.add(Vector2.fromAngle(angle, orbitalDistance));

  // Calculate circular orbit velocity (perpendicular to radius vector)
  const orbitalSpeed = OrbitalMechanics.circularOrbitVelocity(parentBody, orbitalDistance);
  const velocity = parentBody.velocity.add(
    Vector2.fromAngle(angle + Math.PI / 2, orbitalSpeed)
  );

  return new CelestialBody({
    name,
    mass,
    radius,
    position,
    velocity,
    color,
    atmosphereColor,
    atmosphereRadius: atmosphereColor ? radius * 1.2 : undefined,
    fixed: false,
  });
}
