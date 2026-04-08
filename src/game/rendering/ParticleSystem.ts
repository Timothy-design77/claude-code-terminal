import { Graphics, Container } from 'pixi.js';
import { Vector2 } from '../physics/Vector2';
import { Camera } from '../engine/Camera';

interface Particle {
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export class ParticleSystem {
  container: Container;
  private graphics: Graphics;
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private maxParticles: number = 500;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  emit(position: Vector2, velocity: Vector2, count: number, config: {
    color: number;
    speed: number;
    spread: number;
    life: number;
    size: number;
  }) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = velocity.angle() + (Math.random() - 0.5) * config.spread;
      const speed = config.speed * (0.5 + Math.random() * 0.5);
      const particleVel = Vector2.fromAngle(angle, speed).add(velocity.scale(0.3));

      let particle: Particle;
      if (this.pool.length > 0) {
        particle = this.pool.pop()!;
        particle.position = position.clone();
        particle.velocity = particleVel;
        particle.life = config.life;
        particle.maxLife = config.life;
        particle.color = config.color;
        particle.size = config.size * (0.5 + Math.random() * 0.5);
      } else {
        particle = {
          position: position.clone(),
          velocity: particleVel,
          life: config.life,
          maxLife: config.life,
          color: config.color,
          size: config.size * (0.5 + Math.random() * 0.5),
        };
      }

      this.particles.push(particle);
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.addMut(p.velocity.scale(dt));
      p.velocity.scaleMut(0.98); // Drag
      p.life -= dt;

      if (p.life <= 0) {
        this.pool.push(this.particles.splice(i, 1)[0]);
      }
    }
  }

  render(camera: Camera) {
    this.graphics.clear();

    for (const p of this.particles) {
      const screenPos = camera.worldToScreen(p.position);
      const alpha = (p.life / p.maxLife) * 0.8;
      const size = Math.max(1, p.size * camera.zoom);

      this.graphics.circle(screenPos.x, screenPos.y, size);
      this.graphics.fill({ color: p.color, alpha });
    }
  }
}
