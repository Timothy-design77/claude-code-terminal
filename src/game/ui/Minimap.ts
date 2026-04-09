import { Graphics, Container } from 'pixi.js';
import { CelestialBody } from '../physics/CelestialBody';
import { Ship } from '../entities/Ship';
import { Vector2 } from '../physics/Vector2';

export class Minimap {
  container: Container;
  private graphics: Graphics;
  private bg: Graphics;
  private size: number;
  private padding: number = 12;
  private mapScale: number = 0.012; // World units to minimap pixels

  constructor(size: number = 180) {
    this.size = size;
    this.container = new Container();

    this.bg = new Graphics();
    this.container.addChild(this.bg);

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  setPosition(screenWidth: number, screenHeight: number) {
    this.container.position.set(
      screenWidth - this.size - this.padding,
      this.padding
    );
  }

  render(bodies: CelestialBody[], ship: Ship) {
    this.bg.clear();
    this.graphics.clear();

    // Background
    this.bg.roundRect(0, 0, this.size, this.size, 4);
    this.bg.fill({ color: 0x0a0a14, alpha: 0.8 });
    this.bg.roundRect(0, 0, this.size, this.size, 4);
    this.bg.stroke({ color: 0x334455, width: 1 });

    const cx = this.size / 2;
    const cy = this.size / 2;

    // Draw bodies
    for (const body of bodies) {
      const mx = cx + body.position.x * this.mapScale;
      const my = cy + body.position.y * this.mapScale;

      // Skip if outside minimap bounds
      if (mx < -5 || mx > this.size + 5 || my < -5 || my > this.size + 5) continue;

      const dotSize = body.fixed ? 4 : Math.max(1.5, body.radius * this.mapScale * 2);
      this.graphics.circle(mx, my, dotSize);
      this.graphics.fill({ color: body.color });
    }

    // Draw ship
    const sx = cx + ship.position.x * this.mapScale;
    const sy = cy + ship.position.y * this.mapScale;

    // Clamp ship indicator to minimap bounds
    const clampedX = Math.max(3, Math.min(this.size - 3, sx));
    const clampedY = Math.max(3, Math.min(this.size - 3, sy));

    this.graphics.circle(clampedX, clampedY, 2.5);
    this.graphics.fill({ color: 0x44AAFF });

    // Ship direction indicator
    const dirLen = 6;
    const dir = Vector2.fromAngle(ship.rotation, dirLen);
    this.graphics.moveTo(clampedX, clampedY);
    this.graphics.lineTo(clampedX + dir.x, clampedY + dir.y);
    this.graphics.stroke({ color: 0x44AAFF, width: 1, alpha: 0.6 });
  }

  resize(screenWidth: number, screenHeight: number) {
    this.setPosition(screenWidth, screenHeight);
  }
}
