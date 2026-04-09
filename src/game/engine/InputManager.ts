export class InputManager {
  private keys: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private scrollDelta: number = 0;
  private mouseDown: boolean = false;
  private canvas: HTMLCanvasElement | null = null;

  // Touch state
  private _isMobile: boolean = false;
  private _pinchDelta: number = 0;
  private lastPinchDist: number = 0;

  get isMobile(): boolean {
    return this._isMobile;
  }

  get pinchDelta(): number {
    return this._pinchDelta;
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this._isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);

    // Touch events
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.onMouseMove);
      this.canvas.removeEventListener('wheel', this.onWheel);
      this.canvas.removeEventListener('mousedown', this.onMouseDown);
      this.canvas.removeEventListener('mouseup', this.onMouseUp);
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
      this.canvas.removeEventListener('touchmove', this.onTouchMove);
      this.canvas.removeEventListener('touchend', this.onTouchEnd);
      this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    }
  }

  endFrame() {
    this.keysJustPressed.clear();
    this.scrollDelta = 0;
    this._pinchDelta = 0;
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  isKeyJustPressed(key: string): boolean {
    return this.keysJustPressed.has(key.toLowerCase());
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  getScrollDelta(): number {
    return this.scrollDelta;
  }

  isMouseDown(): boolean {
    return this.mouseDown;
  }

  // Simulate key press/release from touch controls
  simulateKeyDown(key: string) {
    const k = key.toLowerCase();
    if (!this.keys.has(k)) {
      this.keysJustPressed.add(k);
    }
    this.keys.add(k);
  }

  simulateKeyUp(key: string) {
    this.keys.delete(key.toLowerCase());
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (!this.keys.has(key)) {
      this.keysJustPressed.add(key);
    }
    this.keys.add(key);

    if (['w', 'a', 's', 'd', ' ', 'shift', 'tab', ',', '.'].includes(key)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas?.getBoundingClientRect();
    if (rect) {
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.scrollDelta += e.deltaY;
  };

  private onMouseDown = () => {
    this.mouseDown = true;
  };

  private onMouseUp = () => {
    this.mouseDown = false;
  };

  // --- Touch handlers (pinch-to-zoom only; buttons/joystick handled by TouchControls) ---

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      this.lastPinchDist = Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const dist = Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
      if (this.lastPinchDist > 0) {
        this._pinchDelta += (this.lastPinchDist - dist) * 3;
      }
      this.lastPinchDist = dist;
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length < 2) {
      this.lastPinchDist = 0;
    }
  };
}
