import { CelestialBody } from '../physics/CelestialBody';
import { createPlanet } from './Planet';

export function createMoon(
  name: string,
  mass: number,
  radius: number,
  orbitalDistance: number,
  parentBody: CelestialBody,
  color: number,
  angle?: number
): CelestialBody {
  return createPlanet(name, mass, radius, orbitalDistance, parentBody, color, undefined, angle);
}
