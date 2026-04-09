import { Graphics, Container } from 'pixi.js';
import { Camera } from '../engine/Camera';
import { OrbitPrediction } from '../physics/OrbitalMechanics';

export class OrbitRenderer {
  container: Container;
  private graphics: Graphics;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  render(prediction: OrbitPrediction | null, camera: Camera) {
    this.graphics.clear();

    if (!prediction || prediction.points.length < 2) return;

    const points = prediction.points;

    // Color based on orbit type
    let color: number;
    if (prediction.willCollide) {
      color = 0xFF4444; // Red — collision course
    } else if (prediction.isEscape) {
      color = 0xFF8844; // Orange — escape trajectory
    } else {
      color = 0x44FF88; // Green — stable orbit
    }

    // Draw orbit path with fading alpha
    const totalPoints = points.length;
    const segmentSize = Math.max(1, Math.floor(totalPoints / 150)); // Limit draw calls

    for (let i = 0; i < totalPoints - segmentSize; i += segmentSize) {
      const p1 = camera.worldToScreen(points[i]);
      const p2 = camera.worldToScreen(points[Math.min(i + segmentSize, totalPoints - 1)]);

      const alpha = 0.6 * (1 - i / totalPoints);

      this.graphics.moveTo(p1.x, p1.y);
      this.graphics.lineTo(p2.x, p2.y);
      this.graphics.stroke({ color, width: 1.5, alpha });
    }

    // Draw collision marker
    if (prediction.willCollide) {
      const impactPoint = camera.worldToScreen(points[points.length - 1]);
      // X marker
      const s = 6;
      this.graphics.moveTo(impactPoint.x - s, impactPoint.y - s);
      this.graphics.lineTo(impactPoint.x + s, impactPoint.y + s);
      this.graphics.stroke({ color: 0xFF4444, width: 2, alpha: 0.8 });
      this.graphics.moveTo(impactPoint.x + s, impactPoint.y - s);
      this.graphics.lineTo(impactPoint.x - s, impactPoint.y + s);
      this.graphics.stroke({ color: 0xFF4444, width: 2, alpha: 0.8 });
    }
  }

  // Render actual orbital paths of celestial bodies (faint reference circles)
  renderBodyOrbits(bodies: { position: { x: number; y: number } }[], center: { x: number; y: number }, camera: Camera) {
    for (const body of bodies) {
      const dx = body.position.x - center.x;
      const dy = body.position.y - center.y;
      const orbitalRadius = Math.sqrt(dx * dx + dy * dy);
      const screenCenter = camera.worldToScreen(center as any);
      const screenRadius = camera.worldToScreenScale(orbitalRadius);

      if (screenRadius > 5 && screenRadius < 10000) {
        this.graphics.circle(screenCenter.x, screenCenter.y, screenRadius);
        this.graphics.stroke({ color: 0xFFFFFF, width: 0.5, alpha: 0.08 });
      }
    }
  }
}
