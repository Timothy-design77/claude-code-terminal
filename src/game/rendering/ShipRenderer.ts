import { Graphics, Container } from 'pixi.js';
import { Ship } from '../entities/Ship';
import { Camera } from '../engine/Camera';
import { Vector2 } from '../physics/Vector2';

export class ShipRenderer {
  container: Container;
  private graphics: Graphics;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  render(ship: Ship, camera: Camera) {
    this.graphics.clear();

    const screenPos = camera.worldToScreen(ship.position);
    const scale = Math.max(1, camera.zoom * 12);

    // Ship body — triangle pointing in direction of rotation
    const nose = Vector2.fromAngle(ship.rotation, scale * 1.2);
    const leftWing = Vector2.fromAngle(ship.rotation + Math.PI * 0.8, scale * 0.8);
    const rightWing = Vector2.fromAngle(ship.rotation - Math.PI * 0.8, scale * 0.8);
    const tail = Vector2.fromAngle(ship.rotation + Math.PI, scale * 0.4);

    const points = [
      { x: screenPos.x + nose.x, y: screenPos.y + nose.y },
      { x: screenPos.x + leftWing.x, y: screenPos.y + leftWing.y },
      { x: screenPos.x + tail.x, y: screenPos.y + tail.y },
      { x: screenPos.x + rightWing.x, y: screenPos.y + rightWing.y },
    ];

    // Ship outline glow
    this.graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }
    this.graphics.closePath();
    this.graphics.stroke({ color: 0x44AAFF, width: 2, alpha: 0.4 });

    // Ship fill
    this.graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }
    this.graphics.closePath();
    this.graphics.fill({ color: 0x88CCFF, alpha: 0.9 });

    // Thrust flame
    if (ship.isThrusting && ship.fuel > 0) {
      const flameDir = Vector2.fromAngle(ship.rotation + Math.PI);
      const flameLen = scale * (0.8 + Math.random() * 0.6) * (ship.isBoosting ? 1.8 : 1);
      const flameWidth = scale * 0.3;

      const flameBase1 = Vector2.fromAngle(ship.rotation + Math.PI * 0.9, scale * 0.3);
      const flameBase2 = Vector2.fromAngle(ship.rotation - Math.PI * 0.9, scale * 0.3);
      const flameTip = flameDir.scale(flameLen);

      // Outer flame (orange)
      this.graphics.moveTo(
        screenPos.x + flameBase1.x,
        screenPos.y + flameBase1.y
      );
      this.graphics.lineTo(
        screenPos.x + flameTip.x,
        screenPos.y + flameTip.y
      );
      this.graphics.lineTo(
        screenPos.x + flameBase2.x,
        screenPos.y + flameBase2.y
      );
      this.graphics.closePath();
      this.graphics.fill({ color: ship.isBoosting ? 0xFF4400 : 0xFF8800, alpha: 0.7 });

      // Inner flame (yellow/white)
      const innerLen = flameLen * 0.6;
      const innerTip = flameDir.scale(innerLen);
      const innerBase1 = Vector2.fromAngle(ship.rotation + Math.PI * 0.92, scale * 0.15);
      const innerBase2 = Vector2.fromAngle(ship.rotation - Math.PI * 0.92, scale * 0.15);

      this.graphics.moveTo(
        screenPos.x + innerBase1.x,
        screenPos.y + innerBase1.y
      );
      this.graphics.lineTo(
        screenPos.x + innerTip.x,
        screenPos.y + innerTip.y
      );
      this.graphics.lineTo(
        screenPos.x + innerBase2.x,
        screenPos.y + innerBase2.y
      );
      this.graphics.closePath();
      this.graphics.fill({ color: 0xFFDD44, alpha: 0.9 });
    }

    // Direction indicator line
    const indicatorLen = scale * 2;
    const indicator = Vector2.fromAngle(ship.rotation, indicatorLen);
    this.graphics.moveTo(screenPos.x + nose.x, screenPos.y + nose.y);
    this.graphics.lineTo(screenPos.x + indicator.x, screenPos.y + indicator.y);
    this.graphics.stroke({ color: 0x44AAFF, width: 1, alpha: 0.3 });
  }
}
