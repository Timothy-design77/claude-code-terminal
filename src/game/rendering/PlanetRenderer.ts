import { Graphics, Container } from 'pixi.js';
import { CelestialBody } from '../physics/CelestialBody';
import { Camera } from '../engine/Camera';

export class PlanetRenderer {
  container: Container;
  private graphics: Graphics;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  render(bodies: CelestialBody[], camera: Camera) {
    this.graphics.clear();

    for (const body of bodies) {
      const screenPos = camera.worldToScreen(body.position);
      const screenRadius = camera.worldToScreenScale(body.radius);

      // Skip if off-screen (with generous margin)
      if (
        screenPos.x < -screenRadius * 2 || screenPos.x > camera['screenWidth'] + screenRadius * 2 ||
        screenPos.y < -screenRadius * 2 || screenPos.y > camera['screenHeight'] + screenRadius * 2
      ) {
        continue;
      }

      // Skip if too tiny to see
      if (screenRadius < 0.5) continue;

      // Atmosphere glow (if applicable)
      if (body.atmosphereColor && body.atmosphereRadius > body.radius) {
        const atmScreenRadius = camera.worldToScreenScale(body.atmosphereRadius);
        // Outer glow
        this.graphics.circle(screenPos.x, screenPos.y, atmScreenRadius);
        this.graphics.fill({ color: body.atmosphereColor, alpha: 0.08 });
        // Inner glow
        this.graphics.circle(screenPos.x, screenPos.y, screenRadius + (atmScreenRadius - screenRadius) * 0.5);
        this.graphics.fill({ color: body.atmosphereColor, alpha: 0.12 });
      }

      // Body surface
      this.graphics.circle(screenPos.x, screenPos.y, screenRadius);
      this.graphics.fill({ color: body.color });

      // Light shading (simple half-shadow)
      if (screenRadius > 3) {
        this.graphics.circle(screenPos.x + screenRadius * 0.15, screenPos.y - screenRadius * 0.1, screenRadius);
        this.graphics.fill({ color: 0x000000, alpha: 0.25 });
      }

      // For stars: extra glow rings
      if (body.fixed && screenRadius > 2) {
        for (let i = 1; i <= 3; i++) {
          this.graphics.circle(screenPos.x, screenPos.y, screenRadius * (1 + i * 0.4));
          this.graphics.fill({ color: body.atmosphereColor ?? body.color, alpha: 0.04 / i });
        }
      }

      // Name label (only when big enough)
      if (screenRadius > 8) {
        // We'll draw names in HUD instead to avoid Graphics text complexity
      }
    }
  }
}
