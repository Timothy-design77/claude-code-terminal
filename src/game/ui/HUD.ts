import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { Ship } from '../entities/Ship';
import { CelestialBody } from '../physics/CelestialBody';
import { OrbitalMechanics } from '../physics/OrbitalMechanics';
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
  private isMobile: boolean;

  constructor(screenWidth: number, screenHeight: number, isMobile: boolean = false) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.isMobile = isMobile;
    this.container = new Container();

    const mainSize = isMobile ? 11 : 13;
    const dimSize = isMobile ? 9 : 11;
    const accentSize = isMobile ? 11 : 13;
    const warpSize = isMobile ? 12 : 14;

    const mainStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: mainSize,
      fill: 0x88CCFF,
      dropShadow: { blur: 2, color: 0x000000, distance: 0, alpha: 0.8 },
    });

    const dimStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: dimSize,
      fill: 0x667788,
      dropShadow: { blur: 2, color: 0x000000, distance: 0, alpha: 0.8 },
    });

    const accentStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: accentSize,
      fill: 0x44FF88,
      dropShadow: { blur: 2, color: 0x000000, distance: 0, alpha: 0.8 },
    });

    const warpStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: warpSize,
      fill: 0xFFDD44,
      dropShadow: { blur: 2, color: 0x000000, distance: 0, alpha: 0.8 },
    });

    const pad = isMobile ? 10 : 16;
    const lineH = isMobile ? 15 : 18;

    // Top-left: velocity + altitude
    this.velocityText = new Text({ text: '', style: mainStyle });
    this.velocityText.position.set(pad, pad);
    this.container.addChild(this.velocityText);

    this.altitudeText = new Text({ text: '', style: mainStyle });
    this.altitudeText.position.set(pad, pad + lineH);
    this.container.addChild(this.altitudeText);

    this.bodyNameText = new Text({ text: '', style: accentStyle });
    this.bodyNameText.position.set(pad, pad + lineH * 2);
    this.container.addChild(this.bodyNameText);

    // Orbit info below
    this.orbitInfoText = new Text({ text: '', style: dimStyle });
    this.orbitInfoText.position.set(pad, pad + lineH * 3);
    this.container.addChild(this.orbitInfoText);

    // Time warp — top center
    this.timeWarpText = new Text({ text: '', style: warpStyle });
    this.timeWarpText.anchor.set(0.5, 0);
    this.timeWarpText.position.set(screenWidth / 2, pad);
    this.container.addChild(this.timeWarpText);

    // Fuel bar — bottom left (positioned above touch controls on mobile)
    const fuelBottomOffset = isMobile ? 190 : 40;
    this.fuelBar = new Graphics();
    this.fuelBar.position.set(pad, screenHeight - fuelBottomOffset);
    this.container.addChild(this.fuelBar);

    this.fuelText = new Text({ text: '', style: mainStyle });
    this.fuelText.position.set(pad, screenHeight - fuelBottomOffset - 18);
    this.container.addChild(this.fuelText);

    // Controls hint — only on desktop
    this.controlsText = new Text({
      text: isMobile ? '' : 'W: Thrust  A/D: Rotate  Shift: Boost\n,/.: Time Warp  C: Camera  R: Reset',
      style: dimStyle,
    });
    this.controlsText.anchor.set(1, 1);
    this.controlsText.position.set(screenWidth - pad, screenHeight - pad);
    this.container.addChild(this.controlsText);
  }

  update(ship: Ship, dominantBody: CelestialBody | null, timeWarp: TimeWarpLevel) {
    this.velocityText.text = `VEL ${ship.speed.toFixed(1)} m/s`;

    if (dominantBody) {
      const altitude = ship.position.distanceTo(dominantBody.position) - dominantBody.radius;
      this.altitudeText.text = `ALT ${altitude.toFixed(0)} m`;
      this.bodyNameText.text = `SOI: ${dominantBody.name}`;

      const elements = OrbitalMechanics.calculateOrbitalElements(
        ship.position, ship.velocity, dominantBody
      );
      if (elements) {
        if (this.isMobile) {
          this.orbitInfoText.text =
            `AP:${elements.apoapsis.toFixed(0)} PE:${elements.periapsis.toFixed(0)} E:${elements.eccentricity.toFixed(2)}`;
        } else {
          this.orbitInfoText.text =
            `AP: ${elements.apoapsis.toFixed(0)}  PE: ${elements.periapsis.toFixed(0)}  ` +
            `ECC: ${elements.eccentricity.toFixed(3)}  T: ${elements.period.toFixed(1)}s`;
        }
      } else {
        this.orbitInfoText.text = 'ESCAPE TRAJECTORY';
      }
    } else {
      this.altitudeText.text = 'ALT ---';
      this.bodyNameText.text = 'SOI: Deep Space';
      this.orbitInfoText.text = '';
    }

    if (timeWarp > 1) {
      this.timeWarpText.text = `>>> x${timeWarp} >>>`;
    } else {
      this.timeWarpText.text = '';
    }

    // Fuel bar
    this.fuelBar.clear();
    const barWidth = this.isMobile ? Math.min(150, this.screenWidth * 0.35) : 200;
    const barHeight = this.isMobile ? 6 : 8;
    this.fuelBar.rect(0, 0, barWidth, barHeight);
    this.fuelBar.fill({ color: 0x222233 });
    const fuelWidth = barWidth * ship.fuelPercent;
    const fuelColor = ship.fuelPercent > 0.3 ? 0x44FF88 : ship.fuelPercent > 0.1 ? 0xFFDD44 : 0xFF4444;
    this.fuelBar.rect(0, 0, fuelWidth, barHeight);
    this.fuelBar.fill({ color: fuelColor });
    this.fuelBar.rect(0, 0, barWidth, barHeight);
    this.fuelBar.stroke({ color: 0x445566, width: 1 });

    this.fuelText.text = `FUEL ${(ship.fuelPercent * 100).toFixed(0)}%`;
  }

  resize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    const pad = this.isMobile ? 10 : 16;
    const fuelBottomOffset = this.isMobile ? 190 : 40;

    this.timeWarpText.position.set(width / 2, pad);
    this.fuelBar.position.set(pad, height - fuelBottomOffset);
    this.fuelText.position.set(pad, height - fuelBottomOffset - 18);
    this.controlsText.position.set(width - pad, height - pad);
  }
}
