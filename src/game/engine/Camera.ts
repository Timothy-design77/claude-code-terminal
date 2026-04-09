import { Vector2 } from '../physics/Vector2';
import { CameraMode } from '../types';

export class Camera {
  position: Vector2 = Vector2.zero();
  zoom: number = 1;
  targetZoom: number = 1;
  mode: CameraMode = CameraMode.FollowShip;
  followTarget: { position: Vector2 } | null = null;
  screenWidth: number = 0;
  screenHeight: number = 0;

  readonly minZoom = 0.001;
  readonly maxZoom = 5;
  readonly zoomSpeed = 0.1;
  readonly zoomSmoothing = 0.15;

  setScreenSize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  setFollowTarget(target: { position: Vector2 } | null) {
    this.followTarget = target;
    if (target) {
      this.mode = CameraMode.FollowShip;
    }
  }

  adjustZoom(delta: number) {
    const zoomFactor = delta > 0 ? 1 - this.zoomSpeed : 1 + this.zoomSpeed;
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * zoomFactor));
  }

  update() {
    // Smooth zoom
    this.zoom += (this.targetZoom - this.zoom) * this.zoomSmoothing;

    // Follow target
    if (this.mode === CameraMode.FollowShip && this.followTarget) {
      const target = this.followTarget.position;
      this.position = this.position.lerp(target, 0.1);
    } else if (this.mode === CameraMode.FocusPlanet && this.followTarget) {
      this.position = this.followTarget.position.clone();
    }
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldPos: Vector2): Vector2 {
    const offsetX = (worldPos.x - this.position.x) * this.zoom + this.screenWidth / 2;
    const offsetY = (worldPos.y - this.position.y) * this.zoom + this.screenHeight / 2;
    return new Vector2(offsetX, offsetY);
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenPos: Vector2): Vector2 {
    const worldX = (screenPos.x - this.screenWidth / 2) / this.zoom + this.position.x;
    const worldY = (screenPos.y - this.screenHeight / 2) / this.zoom + this.position.y;
    return new Vector2(worldX, worldY);
  }

  // Scale a world-space distance to screen pixels
  worldToScreenScale(worldDistance: number): number {
    return worldDistance * this.zoom;
  }

  pan(dx: number, dy: number) {
    this.position = this.position.add(new Vector2(dx / this.zoom, dy / this.zoom));
  }
}
