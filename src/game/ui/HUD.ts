import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { Ship } from '../entities/Ship';
import { CelestialBody } from '../physics/CelestialBody';
import { OrbitalMechanics, OrbitalElements } from '../physics/OrbitalMechanics';
import { TimeWarpLevel } from '../types';

export class HUD {
  container: Container;
  private velocityText: Text;
  private altitudeText: Text;
  private fuelBar: Graphics;
  private fuelText: Text;
  private bodyNameText: Text;
  private orbitInfoText: Text;
  private timeWarpText: Text;
  private controlsText: Text;

  private screenWidth: number;
  private screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.container = new Container();

    const mainStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      fill: 0x88CCFF,
      dropShadow: { blur: 2, color: 0x000000, distance: 0, alpha: 0.8 },
    });

    const dimStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      fill: 0x667788,
      dropShadow: { blur: 2, color: 0x000000, distance: 0, alpha: 0.8 },
    });

    const accentStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      fill: 0x44FF88,
      dropShadow: { blur: 2, color: 0x000000, distance: 0, alpha: 0.8 },
    });

    const warpStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      fill: 0xFFDD44,
      dropShadow: { blur: 2, color: 0x000000, distance: 0, alpha: 0.8 },
    });

    // Top-left: velocity + altitude
    this.velocityText = new Text({ text: '', style: mainStyle });
    this.velocityText.position.set(16, 16);
    this.container.addChild(this.velocityText);

    this.altitudeText = new Text({ text: '', style: mainStyle });
    this.altitudeText.position.set(16, 34);
    this.container.addChild(this.altitudeText);

    this.bodyNameText = new Text({ text: '', style: accentStyle });
    this.bodyNameText.position.set(16, 52);
    this.container.addChild(this.bodyNameText);

    // Orbit info below
    this.orbitInfoText = new Text({ text: '', style: dimStyle });
    this.orbitInfoText.position.set(16, 72);
    this.container.addChild(this.orbitInfoText);

    // Time warp — top center
    this.timeWarpText = new Text({ text: '', style: warpStyle });
    this.timeWarpText.anchor.set(0.5, 0);
    this.timeWarpText.position.set(screenWidth / 2, 16);
    this.container.addChild(this.timeWarpText);

    // Fuel bar — bottom left
    this.fuelBar = new Graphics();
    this.fuelBar.position.set(16, screenHeight - 40);
    this.container.addChild(this.fuelBar);

    this.fuelText = new Text({ text: '', style: mainStyle });
    this.fuelText.position.set(16, screenHeight - 58);
    this.container.addChild(this.fuelText);

    // Controls hint — bottom right
    this.controlsText = new Text({
      text: 'W: Thrust  A/D: Rotate  Shift: Boost\n,/.: Time Warp  C: Camera  R: Reset',
      style: dimStyle,
    });
    this.controlsText.anchor.set(1, 1);
    this.controlsText.position.set(screenWidth - 16, screenHeight - 16);
    this.container.addChild(this.controlsText);
  }

  update(ship: Ship, dominantBody: CelestialBody | null, timeWarp: TimeWarpLevel) {
    // Velocity
    this.velocityText.text = `VEL ${ship.speed.toFixed(1)} m/s`;

    // Altitude from dominant body
    if (dominantBody) {
      const altitude = ship.position.distanceTo(dominantBody.position) - dominantBody.radius;
      this.altitudeText.text = `ALT ${altitude.toFixed(0)} m`;
      this.bodyNameText.text = `SOI: ${dominantBody.name}`;

      // Orbital elements
      const elements = OrbitalMechanics.calculateOrbitalElements(
        ship.position, ship.velocity, dominantBody
      );
      if (elements) {
        this.orbitInfoText.text =
          `AP: ${elements.apoapsis.toFixed(0)}  PE: ${elements.periapsis.toFixed(0)}  ` +
          `ECC: ${elements.eccentricity.toFixed(3)}  T: ${elements.period.toFixed(1)}s`;
      } else {
        this.orbitInfoText.text = 'ESCAPE TRAJECTORY';
      }
    } else {
      this.altitudeText.text = 'ALT ---';
      this.bodyNameText.text = 'SOI: Deep Space';
      this.orbitInfoText.text = '';
    }

    // Time warp
    if (timeWarp > 1) {
      this.timeWarpText.text = `>>> TIME WARP x${timeWarp} >>>`;
    } else {
      this.timeWarpText.text = '';
    }

    // Fuel bar
    this.fuelBar.clear();
    const barWidth = 200;
    const barHeight = 8;
    // Background
    this.fuelBar.rect(0, 0, barWidth, barHeight);
    this.fuelBar.fill({ color: 0x222233 });
    // Fill
    const fuelWidth = barWidth * ship.fuelPercent;
    const fuelColor = ship.fuelPercent > 0.3 ? 0x44FF88 : ship.fuelPercent > 0.1 ? 0xFFDD44 : 0xFF4444;
    this.fuelBar.rect(0, 0, fuelWidth, barHeight);
    this.fuelBar.fill({ color: fuelColor });
    // Border
    this.fuelBar.rect(0, 0, barWidth, barHeight);
    this.fuelBar.stroke({ color: 0x445566, width: 1 });

    this.fuelText.text = `FUEL ${(ship.fuelPercent * 100).toFixed(0)}%`;
  }

  resize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.timeWarpText.position.set(width / 2, 16);
    this.fuelBar.position.set(16, height - 40);
    this.fuelText.position.set(16, height - 58);
    this.controlsText.position.set(width - 16, height - 16);
  }
}
