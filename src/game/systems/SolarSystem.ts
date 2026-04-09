import { PhysicsWorld } from '../physics/PhysicsWorld';
import { CelestialBody } from '../physics/CelestialBody';
import { createStar } from '../entities/Star';
import { createPlanet } from '../entities/Planet';
import { createMoon } from '../entities/Moon';
import { Ship } from '../entities/Ship';
import { Vector2 } from '../physics/Vector2';
import { OrbitalMechanics } from '../physics/OrbitalMechanics';

export interface SolarSystemData {
  world: PhysicsWorld;
  star: CelestialBody;
  planets: CelestialBody[];
  moons: CelestialBody[];
  ship: Ship;
}

export function createSolarSystem(): SolarSystemData {
  const world = new PhysicsWorld();

  // Central star
  const star = createStar('Sol', 5e6, 120, 0xFFDD44);
  world.addBody(star);

  // Planets (distance, mass, radius, color)
  const mercury = createPlanet('Mercury', 800, 12, 1200, star, 0xAAAA88, undefined, 0.5);
  const venus = createPlanet('Venus', 2000, 20, 2200, star, 0xDDAA55, 0xFFCC88, 1.2);
  const earth = createPlanet('Earth', 3000, 24, 3500, star, 0x4488FF, 0x88BBFF, 2.1);
  const mars = createPlanet('Mars', 1500, 16, 5000, star, 0xCC6644, 0xDD8866, 3.5);
  const jupiter = createPlanet('Jupiter', 15000, 50, 8000, star, 0xDDBB88, 0xEECC99, 4.8);

  const planets = [mercury, venus, earth, mars, jupiter];
  planets.forEach(p => world.addBody(p));

  // Moons
  const luna = createMoon('Luna', 200, 8, 200, earth, 0xCCCCCC, 0);
  const phobos = createMoon('Phobos', 80, 5, 120, mars, 0xAA9988, 1);
  const europa = createMoon('Europa', 300, 10, 250, jupiter, 0xBBCCDD, 0.5);
  const io = createMoon('Io', 250, 9, 160, jupiter, 0xDDCC44, 2.0);

  const moons = [luna, phobos, europa, io];
  moons.forEach(m => world.addBody(m));

  // Ship — start in orbit around Earth
  const shipOrbitDist = 100;
  const shipOrbitAngle = 0;
  const shipPos = earth.position.add(Vector2.fromAngle(shipOrbitAngle, shipOrbitDist));
  const shipOrbitSpeed = OrbitalMechanics.circularOrbitVelocity(earth, shipOrbitDist);
  const shipVel = earth.velocity.add(
    Vector2.fromAngle(shipOrbitAngle + Math.PI / 2, shipOrbitSpeed)
  );

  const ship = new Ship({
    position: shipPos,
    velocity: shipVel,
    rotation: -Math.PI / 2,
    thrustPower: 50,
    rotationSpeed: 3,
    maxFuel: 1000,
    fuelConsumption: 2,
  });

  return { world, star, planets, moons, ship };
}
