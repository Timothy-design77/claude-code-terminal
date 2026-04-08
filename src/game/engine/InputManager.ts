export class InputManager {
  private keys: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private scrollDelta: number = 0;
  private mouseDown: boolean = false;
  private canvas: HTMLCanvasElement | null = null;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.onMouseMove);
      this.canvas.removeEventListener('wheel', this.onWheel);
      this.canvas.removeEventListener('mousedown', this.onMouseDown);
      this.canvas.removeEventListener('mouseup', this.onMouseUp);
    }
  }

  // Call at end of each frame
  endFrame() {
    this.keysJustPressed.clear();
    this.scrollDelta = 0;
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

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (!this.keys.has(key)) {
      this.keysJustPressed.add(key);
    }
    this.keys.add(key);

    // Prevent default for game keys
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
}
