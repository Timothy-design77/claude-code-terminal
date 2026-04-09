import { CelestialBody } from '../physics/CelestialBody';
import { Vector2 } from '../physics/Vector2';

export function createStar(name: string, mass: number, radius: number, color: number = 0xFFDD44): CelestialBody {
  return new CelestialBody({
    name,
    mass,
    radius,
    position: Vector2.zero(),
    velocity: Vector2.zero(),
    color,
    atmosphereColor: 0xFFAA00,
    atmosphereRadius: radius * 1.4,
    fixed: true,
  });
}
