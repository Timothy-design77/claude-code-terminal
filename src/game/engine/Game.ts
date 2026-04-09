import { Application } from 'pixi.js';
import { Camera } from './Camera';
import { InputManager } from './InputManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { OrbitalMechanics, OrbitPrediction } from '../physics/OrbitalMechanics';
import { Ship } from '../entities/Ship';
import { CelestialBody } from '../physics/CelestialBody';
import { Vector2 } from '../physics/Vector2';
import { Starfield } from '../rendering/Starfield';
import { PlanetRenderer } from '../rendering/PlanetRenderer';
import { ShipRenderer } from '../rendering/ShipRenderer';
import { ParticleSystem } from '../rendering/ParticleSystem';
import { OrbitRenderer } from '../rendering/OrbitRenderer';
import { HUD } from '../ui/HUD';
import { Minimap } from '../ui/Minimap';
import { TouchControls } from '../ui/TouchControls';
import { createSolarSystem } from '../systems/SolarSystem';
import {
  PHYSICS_DT,
  CameraMode,
  TIME_WARP_LEVELS,
} from '../types';

export class Game {
  private app: Application;
  private camera: Camera;
  private input: InputManager;
  private world!: PhysicsWorld;
  private ship!: Ship;
  private star!: CelestialBody;
  private planets!: CelestialBody[];
  private moons!: CelestialBody[];

  // Rendering
  private starfield!: Starfield;
  private planetRenderer!: PlanetRenderer;
  private shipRenderer!: ShipRenderer;
  private particles!: ParticleSystem;
  private orbitRenderer!: OrbitRenderer;

  // UI
  private hud!: HUD;
  private minimap!: Minimap;
  private touchControls!: TouchControls;

  // State
  private timeWarpIndex: number = 0;
  private orbitPrediction: OrbitPrediction | null = null;
  private orbitPredictionTimer: number = 0;
  private running: boolean = false;
  private accumulator: number = 0;
  private lastTime: number = 0;

  constructor() {
    this.app = new Application();
    this.camera = new Camera();
    this.input = new InputManager();
  }

  async init(container: HTMLElement) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    await this.app.init({
      width,
      height,
      backgroundColor: 0x050510,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas as HTMLCanvasElement);
    this.input.init(this.app.canvas as HTMLCanvasElement);
    this.camera.setScreenSize(width, height);

    // Create solar system
    const data = createSolarSystem();
    this.world = data.world;
    this.star = data.star;
    this.planets = data.planets;
    this.moons = data.moons;
    this.ship = data.ship;

    // Init renderers
    this.starfield = new Starfield(width, height);
    this.planetRenderer = new PlanetRenderer();
    this.shipRenderer = new ShipRenderer();
    this.particles = new ParticleSystem();
    this.orbitRenderer = new OrbitRenderer();

    // Init UI — scale minimap for mobile
    const isMobile = this.input.isMobile;
    const minimapSize = isMobile ? Math.min(120, Math.floor(width * 0.28)) : 180;

    this.hud = new HUD(width, height, isMobile);
    this.minimap = new Minimap(minimapSize);
    this.minimap.setPosition(width, height);

    // Touch controls (only active on mobile)
    this.touchControls = new TouchControls(this.input, width, height);
    this.touchControls.setCanvas(this.app.canvas as HTMLCanvasElement);
    this.touchControls.visible = isMobile;

    // Add to stage in order (back to front)
    this.app.stage.addChild(this.starfield.container);
    this.app.stage.addChild(this.orbitRenderer.container);
    this.app.stage.addChild(this.planetRenderer.container);
    this.app.stage.addChild(this.shipRenderer.container);
    this.app.stage.addChild(this.particles.container);
    this.app.stage.addChild(this.hud.container);
    this.app.stage.addChild(this.minimap.container);
    this.app.stage.addChild(this.touchControls.container);

    // Camera follows ship
    this.camera.setFollowTarget(this.ship);
    this.camera.targetZoom = 0.8;

    // Handle resize
    window.addEventListener('resize', this.onResize);

    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  destroy() {
    this.running = false;
    window.removeEventListener('resize', this.onResize);
    this.input.destroy();
    this.touchControls.destroy();
    this.app.destroy(true, { children: true });
  }

  private onResize = () => {
    const parent = (this.app.canvas as HTMLCanvasElement).parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.app.renderer.resize(width, height);
    this.camera.setScreenSize(width, height);
    this.hud.resize(width, height);
    this.minimap.resize(width, height);
    this.touchControls.resize(width, height);
  };

  private gameLoop = () => {
    if (!this.running) return;

    const now = performance.now();
    const frameTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    const timeWarp = TIME_WARP_LEVELS[this.timeWarpIndex];
    this.accumulator += frameTime * timeWarp;

    // Fixed timestep physics
    while (this.accumulator >= PHYSICS_DT) {
      this.processInput(PHYSICS_DT);
      this.updatePhysics(PHYSICS_DT);
      this.accumulator -= PHYSICS_DT;
    }

    this.render();
    this.input.endFrame();

    requestAnimationFrame(this.gameLoop);
  };

  private processInput(dt: number) {
    // Ship controls (keyboard keys are simulated by touch controls too)
    if (this.input.isKeyDown('w') || this.input.isKeyDown('arrowup')) {
      this.ship.isThrusting = true;
    } else {
      this.ship.isThrusting = false;
    }

    this.ship.isBoosting = this.input.isKeyDown('shift');

    if (this.input.isKeyDown('a') || this.input.isKeyDown('arrowleft')) {
      this.ship.rotateLeft(dt);
    }
    if (this.input.isKeyDown('d') || this.input.isKeyDown('arrowright')) {
      this.ship.rotateRight(dt);
    }

    // Time warp
    if (this.input.isKeyJustPressed('.')) {
      this.timeWarpIndex = Math.min(this.timeWarpIndex + 1, TIME_WARP_LEVELS.length - 1);
    }
    if (this.input.isKeyJustPressed(',')) {
      this.timeWarpIndex = Math.max(this.timeWarpIndex - 1, 0);
    }

    // Camera zoom — mouse wheel + pinch-to-zoom + touch zoom buttons
    const scroll = this.input.getScrollDelta();
    const pinch = this.input.pinchDelta;
    const touchZoom = this.touchControls.getZoomDelta();
    const totalZoom = scroll + pinch + touchZoom;
    if (totalZoom !== 0) {
      this.camera.adjustZoom(totalZoom);
    }

    // Camera mode toggle
    if (this.input.isKeyJustPressed('c')) {
      if (this.camera.mode === CameraMode.FollowShip) {
        this.camera.mode = CameraMode.FreeCam;
      } else {
        this.camera.mode = CameraMode.FollowShip;
        this.camera.setFollowTarget(this.ship);
      }
    }

    // Free cam movement
    if (this.camera.mode === CameraMode.FreeCam) {
      const panSpeed = 500 / this.camera.zoom;
      if (this.input.isKeyDown('w') || this.input.isKeyDown('arrowup')) {
        this.camera.pan(0, -panSpeed * dt);
      }
      if (this.input.isKeyDown('s') || this.input.isKeyDown('arrowdown')) {
        this.camera.pan(0, panSpeed * dt);
      }
      if (this.input.isKeyDown('a') || this.input.isKeyDown('arrowleft')) {
        this.camera.pan(-panSpeed * dt, 0);
      }
      if (this.input.isKeyDown('d') || this.input.isKeyDown('arrowright')) {
        this.camera.pan(panSpeed * dt, 0);
      }
    }

    // Reset ship
    if (this.input.isKeyJustPressed('r')) {
      this.resetShip();
    }

    // Cancel time warp if thrusting
    if (this.ship.isThrusting && this.timeWarpIndex > 0) {
      this.timeWarpIndex = 0;
    }
  }

  private updatePhysics(dt: number) {
    this.world.update(dt);

    const gravity = this.world.calculateGravityAcceleration(this.ship.position);
    const thrust = this.ship.applyThrust(dt);
    const totalAcc = gravity.add(thrust);

    this.ship.position.x += this.ship.velocity.x * dt + 0.5 * this.ship.acceleration.x * dt * dt;
    this.ship.position.y += this.ship.velocity.y * dt + 0.5 * this.ship.acceleration.y * dt * dt;

    const newGravity = this.world.calculateGravityAcceleration(this.ship.position);
    const newThrust = this.ship.isThrusting ? this.ship.thrustDirection.scale(
      this.ship.isBoosting ? this.ship.thrustPower * 2.5 : this.ship.thrustPower
    ).scale(this.ship.fuel > 0 ? this.ship.throttle : 0) : Vector2.zero();
    const newTotalAcc = newGravity.add(newThrust);

    this.ship.velocity.x += 0.5 * (totalAcc.x + newTotalAcc.x) * dt;
    this.ship.velocity.y += 0.5 * (totalAcc.y + newTotalAcc.y) * dt;
    this.ship.acceleration = newTotalAcc;

    // NaN guard — reset if physics diverged
    if (isNaN(this.ship.position.x) || isNaN(this.ship.position.y) ||
        isNaN(this.ship.velocity.x) || isNaN(this.ship.velocity.y)) {
      this.resetShip();
      return;
    }

    if (this.ship.isThrusting && this.ship.fuel > 0) {
      const exhaustDir = Vector2.fromAngle(this.ship.rotation + Math.PI);
      this.particles.emit(
        this.ship.position.add(exhaustDir.scale(8)),
        exhaustDir.scale(80),
        this.ship.isBoosting ? 3 : 1,
        {
          color: this.ship.isBoosting ? 0xFF4400 : 0xFF8800,
          speed: 40,
          spread: 0.5,
          life: 0.6,
          size: 2.5,
        }
      );
    }

    for (const body of this.world.bodies) {
      if (this.ship.position.distanceTo(body.position) < body.radius + 5) {
        this.resetShip();
        break;
      }
    }

    this.particles.update(dt);

    this.orbitPredictionTimer += dt;
    if (this.orbitPredictionTimer >= 0.1) {
      this.orbitPredictionTimer = 0;
      this.orbitPrediction = OrbitalMechanics.predictOrbit(
        this.ship.position,
        this.ship.velocity,
        this.world
      );
    }
  }

  private render() {
    this.camera.update();

    this.starfield.render(this.camera);
    this.orbitRenderer.render(this.orbitPrediction, this.camera);

    const nonFixedBodies = this.world.bodies.filter(b => !b.fixed);
    this.orbitRenderer.renderBodyOrbits(
      nonFixedBodies as any,
      this.star.position as any,
      this.camera
    );

    this.planetRenderer.render(this.world.bodies, this.camera);
    this.particles.render(this.camera);
    this.shipRenderer.render(this.ship, this.camera);

    const dominantBody = this.world.findDominantBody(this.ship.position);
    this.hud.update(this.ship, dominantBody, TIME_WARP_LEVELS[this.timeWarpIndex]);
    this.minimap.render(this.world.bodies, this.ship);
    this.touchControls.render();
  }

  private resetShip() {
    const data = createSolarSystem();
    this.ship.position = data.ship.position.clone();
    this.ship.velocity = data.ship.velocity.clone();
    this.ship.rotation = data.ship.rotation;
    this.ship.fuel = this.ship.maxFuel;
    this.ship.acceleration = Vector2.zero();
    this.timeWarpIndex = 0;
    this.camera.setFollowTarget(this.ship);
    this.camera.mode = CameraMode.FollowShip;
  }
}
