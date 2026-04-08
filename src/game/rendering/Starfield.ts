import { Graphics, Container } from 'pixi.js';
import { Camera } from '../engine/Camera';

interface StarLayer {
  graphics: Graphics;
  stars: { x: number; y: number; brightness: number; size: number }[];
  parallaxFactor: number;
}

export class Starfield {
  container: Container;
  private layers: StarLayer[] = [];
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.container = new Container();
    this.width = width;
    this.height = height;

    // Create 3 parallax layers
    this.createLayer(200, 0.02, 0.5, 1.0);  // Far stars — barely move
    this.createLayer(100, 0.05, 1.0, 1.5);   // Mid stars
    this.createLayer(50, 0.1, 1.5, 2.5);     // Near stars — move more
  }

  private createLayer(count: number, parallaxFactor: number, minSize: number, maxSize: number) {
    const graphics = new Graphics();
    const stars: StarLayer['stars'] = [];

    // Generate stars across a large area
    const spread = 4000;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: (Math.random() - 0.5) * spread,
        y: (Math.random() - 0.5) * spread,
        brightness: 0.3 + Math.random() * 0.7,
        size: minSize + Math.random() * (maxSize - minSize),
      });
    }

    this.container.addChild(graphics);
    this.layers.push({ graphics, stars, parallaxFactor });
  }

  render(camera: Camera) {
    for (const layer of this.layers) {
      layer.graphics.clear();

      const offsetX = -camera.position.x * layer.parallaxFactor;
      const offsetY = -camera.position.y * layer.parallaxFactor;

      for (const star of layer.stars) {
        // Wrap stars to always be visible
        let sx = ((star.x + offsetX) % this.width + this.width) % this.width;
        let sy = ((star.y + offsetY) % this.height + this.height) % this.height;

        const alpha = star.brightness * (0.7 + 0.3 * Math.sin(Date.now() * 0.001 + star.x));
        const color = star.brightness > 0.8 ? 0xCCDDFF : star.brightness > 0.5 ? 0xFFFFFF : 0xAABBCC;

        layer.graphics.circle(sx, sy, star.size);
        layer.graphics.fill({ color, alpha });
      }
    }
  }
}
