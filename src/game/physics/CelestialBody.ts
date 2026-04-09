import { Vector2 } from './Vector2';
import { CelestialBodyConfig } from '../types';

export class CelestialBody {
  name: string;
  mass: number;
  radius: number;
  position: Vector2;
  velocity: Vector2;
  color: number;
  atmosphereColor: number;
  atmosphereRadius: number;
  fixed: boolean;

  // For Velocity Verlet integration
  acceleration: Vector2 = Vector2.zero();

  constructor(config: CelestialBodyConfig) {
    this.name = config.name;
    this.mass = config.mass;
    this.radius = config.radius;
    this.position = config.position.clone();
    this.velocity = config.velocity.clone();
    this.color = config.color;
    this.atmosphereColor = config.atmosphereColor ?? config.color;
    this.atmosphereRadius = config.atmosphereRadius ?? config.radius * 1.15;
    this.fixed = config.fixed ?? false;
  }
}
