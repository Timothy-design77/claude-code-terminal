import { Vector2 } from './physics/Vector2';

export interface GameConfig {
  width: number;
  height: number;
  backgroundColor: number;
}

export interface CelestialBodyConfig {
  name: string;
  mass: number;
  radius: number;
  position: Vector2;
  velocity: Vector2;
  color: number;
  atmosphereColor?: number;
  atmosphereRadius?: number;
  fixed?: boolean;
}

export interface ShipConfig {
  position: Vector2;
  velocity: Vector2;
  rotation: number;
  thrustPower: number;
  rotationSpeed: number;
  maxFuel: number;
  fuelConsumption: number;
}

export enum CameraMode {
  FollowShip = 'follow_ship',
  FreeCam = 'free_cam',
  FocusPlanet = 'focus_planet',
}

export enum TimeWarpLevel {
  Normal = 1,
  Fast = 5,
  Faster = 10,
  Fastest = 50,
}

export const TIME_WARP_LEVELS = [
  TimeWarpLevel.Normal,
  TimeWarpLevel.Fast,
  TimeWarpLevel.Faster,
  TimeWarpLevel.Fastest,
];

// Gravitational constant (scaled for game feel)
export const G = 6.674e3;

// Physics timestep (seconds)
export const PHYSICS_DT = 1 / 60;

// Orbit prediction steps
export const ORBIT_PREDICTION_STEPS = 600;
export const ORBIT_PREDICTION_DT = 0.5;
