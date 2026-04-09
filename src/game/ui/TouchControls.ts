import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { InputManager } from '../engine/InputManager';

interface TouchZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  key: string;
  active: boolean;
  touchId: number | null;
}

export class TouchControls {
  container: Container;
  private graphics: Graphics;
  private labels: Map<string, Text> = new Map();
  private input: InputManager;
  private screenWidth: number;
  private screenHeight: number;
  private canvas: HTMLCanvasElement | null = null;
  visible: boolean = false;

  // Virtual joystick
  private joystickBase = { x: 0, y: 0, radius: 60 };
  private joystickKnob = { x: 0, y: 0, radius: 24 };
  private joystickActive: boolean = false;
  private joystickTouchId: number | null = null;
  private joystickMagnitude: number = 0;

  // Buttons
  private buttons: TouchZone[] = [];
  private topButtons: TouchZone[] = [];

  constructor(input: InputManager, screenWidth: number, screenHeight: number) {
    this.input = input;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.setupControls();
    this.setupTouchListeners();
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  // Convert page coordinates to canvas-local coordinates
  private toCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (this.screenWidth / rect.width),
        y: (clientY - rect.top) * (this.screenHeight / rect.height),
      };
    }
    return { x: clientX, y: clientY };
  }

  private setupControls() {
    const sw = this.screenWidth;
    const sh = this.screenHeight;
    const btnRadius = Math.min(32, sw * 0.06);
    const bigBtnRadius = Math.min(42, sw * 0.08);

    this.joystickBase.x = 90;
    this.joystickBase.y = sh - 120;
    this.joystickBase.radius = Math.min(60, sw * 0.11);
    this.joystickKnob.x = this.joystickBase.x;
    this.joystickKnob.y = this.joystickBase.y;
    this.joystickKnob.radius = Math.min(24, sw * 0.045);

    const rightX = sw - 80;
    const bottomY = sh - 100;

    this.buttons = [
      { id: 'thrust', x: rightX, y: bottomY - bigBtnRadius * 2.4, radius: bigBtnRadius, label: 'THR', key: 'w', active: false, touchId: null },
      { id: 'boost', x: rightX - bigBtnRadius * 2.2, y: bottomY, radius: btnRadius, label: 'BST', key: 'shift', active: false, touchId: null },
      { id: 'reset', x: rightX, y: bottomY, radius: btnRadius, label: 'RST', key: 'r', active: false, touchId: null },
    ];

    const topY = 50;
    const smallBtn = Math.min(22, sw * 0.04);

    this.topButtons = [
      { id: 'warp_down', x: sw / 2 - 60, y: topY, radius: smallBtn, label: '<<', key: ',', active: false, touchId: null },
      { id: 'warp_up', x: sw / 2 + 60, y: topY, radius: smallBtn, label: '>>', key: '.', active: false, touchId: null },
      { id: 'zoom_in', x: sw - 40, y: sh / 2 - 40, radius: smallBtn, label: '+', key: '__zoom_in', active: false, touchId: null },
      { id: 'zoom_out', x: sw - 40, y: sh / 2 + 40, radius: smallBtn, label: '-', key: '__zoom_out', active: false, touchId: null },
    ];

    this.createLabels();
  }

  private createLabels() {
    this.labels.forEach(text => { this.container.removeChild(text); text.destroy(); });
    this.labels.clear();

    const style = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
      fill: 0xAABBCC,
      align: 'center',
    });

    for (const zone of [...this.buttons, ...this.topButtons]) {
      const text = new Text({ text: zone.label, style });
      text.anchor.set(0.5, 0.5);
      text.position.set(zone.x, zone.y);
      this.container.addChild(text);
      this.labels.set(zone.id, text);
    }
  }

  private setupTouchListeners() {
    window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
  }

  destroy() {
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('touchcancel', this.handleTouchEnd);
    // Release any stuck keys
    this.releaseAllInputs();
    this.labels.forEach(text => text.destroy());
  }

  private releaseAllInputs() {
    this.input.simulateKeyUp('a');
    this.input.simulateKeyUp('d');
    this.input.simulateKeyUp('w');
    this.input.simulateKeyUp('s');
    this.input.simulateKeyUp('shift');
    this.input.simulateKeyUp('r');
    this.input.simulateKeyUp(',');
    this.input.simulateKeyUp('.');
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.joystickKnob.x = this.joystickBase.x;
    this.joystickKnob.y = this.joystickBase.y;
    this.joystickMagnitude = 0;
    for (const btn of [...this.buttons, ...this.topButtons]) {
      btn.active = false;
      btn.touchId = null;
    }
  }

  private handleTouchStart = (e: TouchEvent) => {
    if (!this.visible) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const { x, y } = this.toCanvasCoords(t.clientX, t.clientY);

      // Check joystick
      const jdx = x - this.joystickBase.x;
      const jdy = y - this.joystickBase.y;
      if (Math.sqrt(jdx * jdx + jdy * jdy) < this.joystickBase.radius * 1.5 && !this.joystickActive) {
        this.joystickActive = true;
        this.joystickTouchId = t.identifier;
        this.updateJoystick(x, y);
        continue;
      }

      // Check buttons
      for (const btn of [...this.buttons, ...this.topButtons]) {
        const bdx = x - btn.x;
        const bdy = y - btn.y;
        if (Math.sqrt(bdx * bdx + bdy * bdy) < btn.radius * 1.5) {
          btn.active = true;
          btn.touchId = t.identifier;
          if (btn.key !== '__zoom_in' && btn.key !== '__zoom_out') {
            this.input.simulateKeyDown(btn.key);
          }
        }
      }
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.visible) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.joystickTouchId) {
        const { x, y } = this.toCanvasCoords(t.clientX, t.clientY);
        this.updateJoystick(x, y);
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (!this.visible) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      if (t.identifier === this.joystickTouchId) {
        this.joystickActive = false;
        this.joystickTouchId = null;
        this.joystickKnob.x = this.joystickBase.x;
        this.joystickKnob.y = this.joystickBase.y;
        this.joystickMagnitude = 0;
        // Always release all directional keys
        this.input.simulateKeyUp('a');
        this.input.simulateKeyUp('d');
        this.input.simulateKeyUp('w');
        this.input.simulateKeyUp('s');
      }

      for (const btn of [...this.buttons, ...this.topButtons]) {
        if (btn.touchId === t.identifier) {
          btn.active = false;
          btn.touchId = null;
          if (btn.key !== '__zoom_in' && btn.key !== '__zoom_out') {
            this.input.simulateKeyUp(btn.key);
          }
        }
      }
    }

    // Safety: if no touches remain at all, release everything
    if (e.touches.length === 0) {
      this.releaseAllInputs();
    }
  };

  private updateJoystick(touchX: number, touchY: number) {
    const dx = touchX - this.joystickBase.x;
    const dy = touchY - this.joystickBase.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.joystickBase.radius;

    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);

    this.joystickKnob.x = this.joystickBase.x + Math.cos(angle) * clampedDist;
    this.joystickKnob.y = this.joystickBase.y + Math.sin(angle) * clampedDist;
    this.joystickMagnitude = clampedDist / maxDist;

    const threshold = 0.25;
    const nx = (this.joystickKnob.x - this.joystickBase.x) / maxDist;
    const ny = (this.joystickKnob.y - this.joystickBase.y) / maxDist;

    if (nx < -threshold) { this.input.simulateKeyDown('a'); this.input.simulateKeyUp('d'); }
    else if (nx > threshold) { this.input.simulateKeyDown('d'); this.input.simulateKeyUp('a'); }
    else { this.input.simulateKeyUp('a'); this.input.simulateKeyUp('d'); }

    if (ny < -threshold) { this.input.simulateKeyDown('w'); }
    else { this.input.simulateKeyUp('w'); }
  }

  getZoomDelta(): number {
    let delta = 0;
    for (const btn of this.topButtons) {
      if (btn.active) {
        if (btn.key === '__zoom_in') delta -= 50;
        if (btn.key === '__zoom_out') delta += 50;
      }
    }
    return delta;
  }

  render() {
    this.graphics.clear();
    if (!this.visible) { this.container.visible = false; return; }
    this.container.visible = true;

    // Joystick base
    this.graphics.circle(this.joystickBase.x, this.joystickBase.y, this.joystickBase.radius);
    this.graphics.fill({ color: 0x112233, alpha: 0.4 });
    this.graphics.circle(this.joystickBase.x, this.joystickBase.y, this.joystickBase.radius);
    this.graphics.stroke({ color: 0x334466, width: 2, alpha: 0.5 });

    // Knob
    const knobColor = this.joystickActive ? 0x44AAFF : 0x6688AA;
    const knobAlpha = this.joystickActive ? 0.8 : 0.5;
    this.graphics.circle(this.joystickKnob.x, this.joystickKnob.y, this.joystickKnob.radius);
    this.graphics.fill({ color: knobColor, alpha: knobAlpha });
    this.graphics.circle(this.joystickKnob.x, this.joystickKnob.y, this.joystickKnob.radius);
    this.graphics.stroke({ color: 0x88CCFF, width: 1.5, alpha: knobAlpha });

    // Action buttons
    for (const btn of this.buttons) {
      const color = btn.active ? this.getActiveColor(btn.id) : 0x112233;
      const borderColor = btn.active ? this.getActiveColor(btn.id) : 0x334466;
      const alpha = btn.active ? 0.7 : 0.35;
      this.graphics.circle(btn.x, btn.y, btn.radius);
      this.graphics.fill({ color, alpha });
      this.graphics.circle(btn.x, btn.y, btn.radius);
      this.graphics.stroke({ color: borderColor, width: 2, alpha: alpha + 0.2 });
      const label = this.labels.get(btn.id);
      if (label) label.style.fill = btn.active ? 0xFFFFFF : 0xAABBCC;
    }

    // Top buttons
    for (const btn of this.topButtons) {
      const color = btn.active ? 0x445566 : 0x112233;
      const alpha = btn.active ? 0.6 : 0.3;
      this.graphics.circle(btn.x, btn.y, btn.radius);
      this.graphics.fill({ color, alpha });
      this.graphics.circle(btn.x, btn.y, btn.radius);
      this.graphics.stroke({ color: 0x445566, width: 1.5, alpha: alpha + 0.15 });
    }
  }

  private getActiveColor(id: string): number {
    switch (id) {
      case 'thrust': return 0xFF8800;
      case 'boost': return 0xFF4400;
      case 'reset': return 0x4488FF;
      default: return 0x445566;
    }
  }

  resize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.setupControls();
  }
}
