import { Vector2 } from '../physics/Vector2';
import { ShipConfig } from '../types';

export class Ship {
  position: Vector2;
  velocity: Vector2;
  rotation: number;
  angularVelocity: number = 0;

  thrustPower: number;
  rotationSpeed: number;
  fuel: number;
  maxFuel: number;
  fuelConsumption: number;

  isThrusting: boolean = false;
  isBoosting: boolean = false;
  throttle: number = 1; // 0-1

  // For Velocity Verlet
  acceleration: Vector2 = Vector2.zero();

  constructor(config: ShipConfig) {
    this.position = config.position.clone();
    this.velocity = config.velocity.clone();
    this.rotation = config.rotation;
    this.thrustPower = config.thrustPower;
    this.rotationSpeed = config.rotationSpeed;
    this.maxFuel = config.maxFuel;
    this.fuel = config.maxFuel;
    this.fuelConsumption = config.fuelConsumption;
  }

  get thrustDirection(): Vector2 {
    return Vector2.fromAngle(this.rotation);
  }

  applyThrust(dt: number): Vector2 {
    if (this.fuel <= 0 || !this.isThrusting) return Vector2.zero();

    const power = this.isBoosting ? this.thrustPower * 2.5 : this.thrustPower;
    const consumption = this.isBoosting ? this.fuelConsumption * 3 : this.fuelConsumption;

    this.fuel = Math.max(0, this.fuel - consumption * dt * this.throttle);

    return this.thrustDirection.scale(power * this.throttle);
  }

  rotateLeft(dt: number) {
    this.rotation -= this.rotationSpeed * dt;
  }

  rotateRight(dt: number) {
    this.rotation += this.rotationSpeed * dt;
  }

  get fuelPercent(): number {
    return this.fuel / this.maxFuel;
  }

  get speed(): number {
    return this.velocity.magnitude();
  }
}
