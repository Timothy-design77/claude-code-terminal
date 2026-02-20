// ═══════════════════════════════════════════════════════════════
//  AGAR.IO CLONE — Complete Mobile Game Engine
// ═══════════════════════════════════════════════════════════════

// ── Constants ────────────────────────────────────────────────
const WORLD_W = 5000;
const WORLD_H = 5000;
const GRID_SIZE = 50;

const FOOD_COUNT = 600;
const BOT_COUNT = 25;

const START_MASS = 100;
const FOOD_MASS = 2;
const EJECT_MASS = 16;
const EJECT_SPEED = 1200;
const EJECT_DECEL = 0.96;

const SPLIT_MIN_MASS = 80;
const MAX_PLAYER_CELLS = 16;
const MERGE_DELAY = 15000; // ms
const SPLIT_SPEED = 900;

const DECAY_THRESHOLD = 300;
const DECAY_RATE = 0.001; // per second

const EAT_OVERLAP = 0.33; // fraction of radius overlap needed to eat
const EAT_SIZE_RATIO = 1.15; // must be 15% bigger to eat

const BASE_SPEED = 450;

const CELL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#82E0AA', '#F8C471', '#F1948A', '#D35400', '#2ECC71',
  '#E74C3C', '#3498DB', '#9B59B6', '#1ABC9C', '#F39C12',
];

const FOOD_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD',
  '#82E0AA', '#F8C471', '#F1948A', '#BB8FCE', '#85C1E9',
  '#E74C3C', '#F39C12', '#2ECC71', '#9B59B6', '#1ABC9C',
];

const BOT_NAMES = [
  'Blob', 'NomNom', 'CellKing', 'Pro', 'Chomper',
  'BigBoi', 'SmolBean', 'Muncher', 'Gobbler', 'xXSlayerXx',
  'doge', 'feed me', 'help', 'team?', 'NASA',
  'FBI', 'MLG', 'ur mom', 'noob', ':D',
  'legend', 'hunter', 'shark', 'whale', 'savage',
  'epic', 'phantom', 'shadow', 'ghost', 'titan',
];


// ── Utility Functions ────────────────────────────────────────
function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function massToRadius(mass) {
  return Math.sqrt(mass) * 1.4;
}

function massToSpeed(mass) {
  return BASE_SPEED / Math.pow(mass, 0.22);
}

function darkenColor(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `rgb(${Math.floor(r * f)},${Math.floor(g * f)},${Math.floor(b * f)})`;
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}


// ── Cell Class ───────────────────────────────────────────────
class Cell {
  constructor(x, y, mass, color, name) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.color = color;
    this.name = name || '';

    // Velocity (for split impulse / eject)
    this.vx = 0;
    this.vy = 0;

    // For player split cells
    this.mergeTime = 0;

    // Wobble effect
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 2 + Math.random() * 2;

    // Track last movement direction (for split/eject when joystick released)
    this.lastDirX = 0;
    this.lastDirY = 1;
  }

  get radius() {
    return massToRadius(this.mass);
  }

  get speed() {
    return massToSpeed(this.mass);
  }

  clampToWorld() {
    const r = this.radius;
    this.x = clamp(this.x, r, WORLD_W - r);
    this.y = clamp(this.y, r, WORLD_H - r);
  }
}


// ── Food Class ───────────────────────────────────────────────
class Food {
  constructor(x, y) {
    this.x = x || randomRange(20, WORLD_W - 20);
    this.y = y || randomRange(20, WORLD_H - 20);
    this.mass = FOOD_MASS;
    this.color = pick(FOOD_COLORS);
    this.radius = 6 + Math.random() * 3;
    // Slight animation
    this.pulsePhase = Math.random() * Math.PI * 2;
  }
}


// ── Ejected Mass ─────────────────────────────────────────────
class EjectedMass {
  constructor(x, y, vx, vy, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.mass = EJECT_MASS;
    this.radius = massToRadius(EJECT_MASS);
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= EJECT_DECEL;
    this.vy *= EJECT_DECEL;
    this.x = clamp(this.x, 5, WORLD_W - 5);
    this.y = clamp(this.y, 5, WORLD_H - 5);
  }
}


// ── Bot AI ───────────────────────────────────────────────────
class Bot {
  constructor() {
    this.cell = new Cell(
      randomRange(200, WORLD_W - 200),
      randomRange(200, WORLD_H - 200),
      randomRange(60, 400),
      pick(CELL_COLORS),
      pick(BOT_NAMES)
    );
    this.state = 'wander';
    this.target = null;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
    this.decisionTimer = 0;
    this.alive = true;
  }

  update(dt, game) {
    if (!this.alive) return;

    // Decision making
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = 0.3 + Math.random() * 0.4;
      this.decide(game);
    }

    let dirX = 0;
    let dirY = 0;

    switch (this.state) {
      case 'wander':
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderAngle += (Math.random() - 0.5) * 1.5;
          this.wanderTimer = 1 + Math.random() * 2;
        }
        dirX = Math.cos(this.wanderAngle);
        dirY = Math.sin(this.wanderAngle);
        break;

      case 'chase':
        if (this.target) {
          const dx = this.target.x - this.cell.x;
          const dy = this.target.y - this.cell.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          dirX = dx / d;
          dirY = dy / d;
        }
        break;

      case 'flee':
        if (this.target) {
          const dx = this.cell.x - this.target.x;
          const dy = this.cell.y - this.target.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          dirX = dx / d;
          dirY = dy / d;
        }
        break;
    }

    // Apply movement
    const speed = this.cell.speed;
    this.cell.x += dirX * speed * dt;
    this.cell.y += dirY * speed * dt;

    if (dirX !== 0 || dirY !== 0) {
      this.cell.lastDirX = dirX;
      this.cell.lastDirY = dirY;
    }

    // Boundary avoidance — steer away from edges
    const margin = 150;
    if (this.cell.x < margin) dirX += 0.5;
    if (this.cell.x > WORLD_W - margin) dirX -= 0.5;
    if (this.cell.y < margin) dirY += 0.5;
    if (this.cell.y > WORLD_H - margin) dirY -= 0.5;

    // Clamp to world
    this.cell.clampToWorld();

    // Mass decay
    if (this.cell.mass > DECAY_THRESHOLD) {
      this.cell.mass -= this.cell.mass * DECAY_RATE * dt;
    }

    // Slowly grow to prevent bots from starving away
    if (this.cell.mass < 80) {
      this.cell.mass += 2 * dt;
    }
  }

  decide(game) {
    const myMass = this.cell.mass;
    const myX = this.cell.x;
    const myY = this.cell.y;

    let nearestThreat = null;
    let nearestThreatDist = Infinity;
    let nearestPrey = null;
    let nearestPreyDist = Infinity;

    // Check player cells
    for (const pc of game.playerCells) {
      const d = dist(myX, myY, pc.x, pc.y);
      if (pc.mass > myMass * EAT_SIZE_RATIO && d < nearestThreatDist) {
        nearestThreat = pc;
        nearestThreatDist = d;
      } else if (myMass > pc.mass * EAT_SIZE_RATIO && d < nearestPreyDist) {
        nearestPrey = pc;
        nearestPreyDist = d;
      }
    }

    // Check other bots
    for (const bot of game.bots) {
      if (bot === this || !bot.alive) continue;
      const bc = bot.cell;
      const d = dist(myX, myY, bc.x, bc.y);
      if (bc.mass > myMass * EAT_SIZE_RATIO && d < nearestThreatDist) {
        nearestThreat = bc;
        nearestThreatDist = d;
      } else if (myMass > bc.mass * EAT_SIZE_RATIO && d < nearestPreyDist) {
        nearestPrey = bc;
        nearestPreyDist = d;
      }
    }

    // Flee from threats
    const fleeRange = 350 + this.cell.radius * 2;
    if (nearestThreat && nearestThreatDist < fleeRange) {
      this.state = 'flee';
      this.target = nearestThreat;
      return;
    }

    // Chase prey
    const chaseRange = 500 + this.cell.radius;
    if (nearestPrey && nearestPreyDist < chaseRange) {
      this.state = 'chase';
      this.target = nearestPrey;
      return;
    }

    // Find nearest food
    let nearestFood = null;
    let nearestFoodDist = Infinity;
    for (const food of game.foods) {
      const d = dist(myX, myY, food.x, food.y);
      if (d < nearestFoodDist) {
        nearestFood = food;
        nearestFoodDist = d;
      }
    }

    if (nearestFood && nearestFoodDist < 400) {
      this.state = 'chase';
      this.target = nearestFood;
      return;
    }

    this.state = 'wander';
  }

  respawn() {
    this.cell.x = randomRange(200, WORLD_W - 200);
    this.cell.y = randomRange(200, WORLD_H - 200);
    this.cell.mass = randomRange(60, 300);
    this.cell.color = pick(CELL_COLORS);
    this.cell.name = pick(BOT_NAMES);
    this.alive = true;
    this.state = 'wander';
  }
}


// ── Camera ───────────────────────────────────────────────────
class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = WORLD_W / 2;
    this.y = WORLD_H / 2;
    this.zoom = 1;
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetZoom = 1;
  }

  follow(x, y, totalMass) {
    this.targetX = x;
    this.targetY = y;
    // Zoom out as player gets bigger
    this.targetZoom = Math.min(1.2, Math.pow(200 / Math.max(totalMass, 100), 0.32));
    this.targetZoom = Math.max(0.08, this.targetZoom);
  }

  update(dt) {
    const t = 1 - Math.pow(0.02, dt);
    this.x = lerp(this.x, this.targetX, t);
    this.y = lerp(this.y, this.targetY, t);
    this.zoom = lerp(this.zoom, this.targetZoom, t);
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.canvas.width / 2,
      y: (wy - this.y) * this.zoom + this.canvas.height / 2,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.canvas.width / 2) / this.zoom + this.x,
      y: (sy - this.canvas.height / 2) / this.zoom + this.y,
    };
  }

  // Visible bounds in world coords
  getViewBounds() {
    const hw = (this.canvas.width / 2) / this.zoom;
    const hh = (this.canvas.height / 2) / this.zoom;
    return {
      left: this.x - hw,
      right: this.x + hw,
      top: this.y - hh,
      bottom: this.y + hh,
    };
  }

  isVisible(wx, wy, radius) {
    const b = this.getViewBounds();
    return wx + radius > b.left && wx - radius < b.right &&
           wy + radius > b.top && wy - radius < b.bottom;
  }
}


// ── Dynamic Joystick ─────────────────────────────────────────
class Joystick {
  constructor() {
    this.active = false;
    this.baseX = 0;
    this.baseY = 0;
    this.stickX = 0;
    this.stickY = 0;
    this.touchId = null;
    this.maxRadius = 55;

    // Normalized direction (-1 to 1)
    this.dirX = 0;
    this.dirY = 0;
    // 0 to 1
    this.magnitude = 0;
  }

  start(x, y, touchId) {
    this.active = true;
    this.baseX = x;
    this.baseY = y;
    this.stickX = x;
    this.stickY = y;
    this.touchId = touchId;
    this.dirX = 0;
    this.dirY = 0;
    this.magnitude = 0;
  }

  move(x, y) {
    if (!this.active) return;
    const dx = x - this.baseX;
    const dy = y - this.baseY;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    if (d > this.maxRadius) {
      this.stickX = this.baseX + (dx / d) * this.maxRadius;
      this.stickY = this.baseY + (dy / d) * this.maxRadius;
    } else {
      this.stickX = x;
      this.stickY = y;
    }

    this.dirX = dx / d;
    this.dirY = dy / d;
    this.magnitude = Math.min(d / this.maxRadius, 1);
  }

  end() {
    this.active = false;
    this.dirX = 0;
    this.dirY = 0;
    this.magnitude = 0;
    this.touchId = null;
  }

  draw(ctx) {
    if (!this.active) return;

    // Outer ring
    ctx.beginPath();
    ctx.arc(this.baseX, this.baseY, this.maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner stick
    ctx.beginPath();
    ctx.arc(this.stickX, this.stickY, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}


// ── Particle (for eat effects) ───────────────────────────────
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 200;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.life = 0.4 + Math.random() * 0.3;
    this.maxLife = this.life;
    this.radius = 2 + Math.random() * 4;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life -= dt;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }
}


// ═════════════════════════════════════════════════════════════
//  MAIN GAME CLASS
// ═════════════════════════════════════════════════════════════
class Game {
  constructor() {
    // Canvas
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    // Game state
    this.state = 'menu'; // menu | playing | dead
    this.playerName = '';
    this.playerColor = '';

    // Entities
    this.playerCells = [];
    this.foods = [];
    this.bots = [];
    this.ejectedMass = [];
    this.particles = [];

    // Systems
    this.camera = new Camera(this.canvas);
    this.joystick = new Joystick();

    // Stats
    this.score = 0;
    this.maxMass = 0;
    this.startTime = 0;

    // Timing
    this.lastTime = 0;
    this.fps = 0;
    this.fpsCounter = 0;
    this.fpsTime = 0;

    // Screen shake
    this.shakeAmount = 0;

    // Input
    this.keys = {};

    // Init
    this.resizeCanvas();
    this.setupInput();
    this.setupUI();
    this.spawnFood();
    this.spawnBots();

    // Start loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  // ── Canvas Resize ──────────────────────────────────────────
  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvasW = window.innerWidth;
    this.canvasH = window.innerHeight;

    // Minimap
    const mm = this.minimapCanvas;
    const mmSize = parseInt(getComputedStyle(mm).width);
    mm.width = mmSize * dpr;
    mm.height = mmSize * dpr;
    this.minimapCtx.scale(dpr, dpr);
    this.minimapSize = mmSize;
  }

  // ── Spawn Entities ─────────────────────────────────────────
  spawnFood() {
    this.foods = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
      this.foods.push(new Food());
    }
  }

  spawnBots() {
    this.bots = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      this.bots.push(new Bot());
    }
  }

  // ── Start / Restart ────────────────────────────────────────
  startGame(name) {
    this.playerName = name || 'Cell';
    this.playerColor = pick(CELL_COLORS);

    const startCell = new Cell(
      WORLD_W / 2 + randomRange(-200, 200),
      WORLD_H / 2 + randomRange(-200, 200),
      START_MASS,
      this.playerColor,
      this.playerName,
    );
    this.playerCells = [startCell];

    this.score = 0;
    this.maxMass = START_MASS;
    this.startTime = performance.now();
    this.state = 'playing';
    this.shakeAmount = 0;
    this.particles = [];
    this.ejectedMass = [];

    // Reset foods and bots
    this.spawnFood();
    this.spawnBots();

    // Camera snap
    this.camera.x = startCell.x;
    this.camera.y = startCell.y;

    // Show HUD
    document.getElementById('hud').style.display = 'block';
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('deathScreen').style.display = 'none';
  }

  die() {
    this.state = 'dead';
    const aliveTime = performance.now() - this.startTime;
    document.getElementById('finalScore').textContent = Math.floor(this.score).toLocaleString();
    document.getElementById('finalMass').textContent = Math.floor(this.maxMass).toLocaleString();
    document.getElementById('finalTime').textContent = formatTime(aliveTime);
    document.getElementById('deathScreen').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
  }

  // ── Player Total Mass / Center ─────────────────────────────
  getPlayerTotalMass() {
    let total = 0;
    for (const c of this.playerCells) total += c.mass;
    return total;
  }

  getPlayerCenter() {
    if (this.playerCells.length === 0) return { x: WORLD_W / 2, y: WORLD_H / 2 };
    let cx = 0, cy = 0, total = 0;
    for (const c of this.playerCells) {
      cx += c.x * c.mass;
      cy += c.y * c.mass;
      total += c.mass;
    }
    return { x: cx / total, y: cy / total };
  }

  // ── Player Movement Direction ──────────────────────────────
  getPlayerDir() {
    let dx = 0, dy = 0;
    if (this.joystick.active) {
      dx = this.joystick.dirX * this.joystick.magnitude;
      dy = this.joystick.dirY * this.joystick.magnitude;
    }
    // Keyboard fallback
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) dy -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) dy += 1;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 1) { dx /= mag; dy /= mag; }
    return { x: dx, y: dy, magnitude: mag > 0 ? Math.min(mag, 1) : 0 };
  }

  // ── Split ──────────────────────────────────────────────────
  split() {
    if (this.state !== 'playing') return;
    const dir = this.getPlayerDir();
    const newCells = [];

    for (const cell of this.playerCells) {
      if (cell.mass < SPLIT_MIN_MASS * 2) continue;
      if (this.playerCells.length + newCells.length >= MAX_PLAYER_CELLS) break;

      const halfMass = cell.mass / 2;
      cell.mass = halfMass;

      // Direction: use joystick dir, or last movement dir
      let sdx = dir.x;
      let sdy = dir.y;
      if (sdx === 0 && sdy === 0) {
        sdx = cell.lastDirX;
        sdy = cell.lastDirY;
      }
      const smag = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
      sdx /= smag;
      sdy /= smag;

      const nc = new Cell(cell.x, cell.y, halfMass, cell.color, cell.name);
      nc.vx = sdx * SPLIT_SPEED;
      nc.vy = sdy * SPLIT_SPEED;
      nc.mergeTime = performance.now() + MERGE_DELAY;
      nc.lastDirX = sdx;
      nc.lastDirY = sdy;

      // Original cell also gets a merge timer
      cell.mergeTime = performance.now() + MERGE_DELAY;

      newCells.push(nc);
    }

    this.playerCells.push(...newCells);
  }

  // ── Eject Mass ─────────────────────────────────────────────
  eject() {
    if (this.state !== 'playing') return;
    const dir = this.getPlayerDir();

    for (const cell of this.playerCells) {
      if (cell.mass < EJECT_MASS + 50) continue;

      cell.mass -= EJECT_MASS;

      let edx = dir.x;
      let edy = dir.y;
      if (edx === 0 && edy === 0) {
        edx = cell.lastDirX;
        edy = cell.lastDirY;
      }
      const emag = Math.sqrt(edx * edx + edy * edy) || 1;
      edx /= emag;
      edy /= emag;

      const ej = new EjectedMass(
        cell.x + edx * cell.radius,
        cell.y + edy * cell.radius,
        edx * EJECT_SPEED,
        edy * EJECT_SPEED,
        cell.color,
      );
      this.ejectedMass.push(ej);
    }
  }

  // ── Update ─────────────────────────────────────────────────
  update(dt) {
    if (this.state !== 'playing') return;

    this.updatePlayerCells(dt);
    this.updateBots(dt);
    this.updateEjectedMass(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.separatePlayerCells();
    this.checkPlayerMerge();
    this.respawnFood();
    this.respawnBots();
    this.updateCamera(dt);
    this.updateScore();
    this.shakeAmount *= 0.9;
  }

  updatePlayerCells(dt) {
    const dir = this.getPlayerDir();

    for (const cell of this.playerCells) {
      // Joystick / keyboard movement
      const speed = cell.speed * (dir.magnitude || 0);
      const moveX = dir.x * speed;
      const moveY = dir.y * speed;

      // Smooth movement
      cell.x += moveX * dt;
      cell.y += moveY * dt;

      // Split impulse (decaying)
      cell.x += cell.vx * dt;
      cell.y += cell.vy * dt;
      cell.vx *= Math.pow(0.005, dt);
      cell.vy *= Math.pow(0.005, dt);

      // Track direction
      if (dir.x !== 0 || dir.y !== 0) {
        cell.lastDirX = dir.x;
        cell.lastDirY = dir.y;
      }

      // Mass decay
      if (cell.mass > DECAY_THRESHOLD) {
        cell.mass -= cell.mass * DECAY_RATE * dt;
      }

      // Wobble animation
      cell.wobblePhase += cell.wobbleSpeed * dt;

      cell.clampToWorld();
    }
  }

  updateBots(dt) {
    for (const bot of this.bots) {
      bot.update(dt, this);
      bot.cell.wobblePhase += bot.cell.wobbleSpeed * dt;
    }
  }

  updateEjectedMass(dt) {
    for (const ej of this.ejectedMass) {
      ej.update(dt);
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // ── Collisions ─────────────────────────────────────────────
  checkCollisions() {
    // Player eats food
    for (const cell of this.playerCells) {
      for (let i = this.foods.length - 1; i >= 0; i--) {
        const food = this.foods[i];
        const d = dist(cell.x, cell.y, food.x, food.y);
        if (d < cell.radius) {
          cell.mass += food.mass;
          // Spawn particles
          for (let p = 0; p < 3; p++) {
            this.particles.push(new Particle(food.x, food.y, food.color));
          }
          this.foods.splice(i, 1);
        }
      }
    }

    // Player eats ejected mass
    for (const cell of this.playerCells) {
      for (let i = this.ejectedMass.length - 1; i >= 0; i--) {
        const ej = this.ejectedMass[i];
        const d = dist(cell.x, cell.y, ej.x, ej.y);
        if (d < cell.radius && cell.mass > ej.mass * EAT_SIZE_RATIO) {
          cell.mass += ej.mass;
          this.ejectedMass.splice(i, 1);
        }
      }
    }

    // Player vs Bots
    for (let bi = this.bots.length - 1; bi >= 0; bi--) {
      const bot = this.bots[bi];
      if (!bot.alive) continue;

      for (let ci = this.playerCells.length - 1; ci >= 0; ci--) {
        const cell = this.playerCells[ci];
        const d = dist(cell.x, cell.y, bot.cell.x, bot.cell.y);
        const overlap = cell.radius + bot.cell.radius - d;

        if (overlap > bot.cell.radius * EAT_OVERLAP) {
          // Player eats bot
          if (cell.mass > bot.cell.mass * EAT_SIZE_RATIO) {
            cell.mass += bot.cell.mass;
            for (let p = 0; p < 8; p++) {
              this.particles.push(new Particle(bot.cell.x, bot.cell.y, bot.cell.color));
            }
            this.shakeAmount = Math.min(8, bot.cell.mass * 0.02);
            bot.alive = false;
            break;
          }
        }

        if (overlap > cell.radius * EAT_OVERLAP) {
          // Bot eats player cell
          if (bot.cell.mass > cell.mass * EAT_SIZE_RATIO) {
            bot.cell.mass += cell.mass;
            for (let p = 0; p < 8; p++) {
              this.particles.push(new Particle(cell.x, cell.y, cell.color));
            }
            this.playerCells.splice(ci, 1);
            if (this.playerCells.length === 0) {
              this.die();
              return;
            }
            break;
          }
        }
      }
    }

    // Bot eats food
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      for (let i = this.foods.length - 1; i >= 0; i--) {
        const food = this.foods[i];
        const d = dist(bot.cell.x, bot.cell.y, food.x, food.y);
        if (d < bot.cell.radius) {
          bot.cell.mass += food.mass;
          this.foods.splice(i, 1);
        }
      }
    }

    // Bot eats ejected mass
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      for (let i = this.ejectedMass.length - 1; i >= 0; i--) {
        const ej = this.ejectedMass[i];
        const d = dist(bot.cell.x, bot.cell.y, ej.x, ej.y);
        if (d < bot.cell.radius && bot.cell.mass > ej.mass * EAT_SIZE_RATIO) {
          bot.cell.mass += ej.mass;
          this.ejectedMass.splice(i, 1);
        }
      }
    }

    // Bot vs Bot
    for (let i = 0; i < this.bots.length; i++) {
      if (!this.bots[i].alive) continue;
      for (let j = i + 1; j < this.bots.length; j++) {
        if (!this.bots[j].alive) continue;
        const a = this.bots[i].cell;
        const b = this.bots[j].cell;
        const d = dist(a.x, a.y, b.x, b.y);
        const overlap = a.radius + b.radius - d;

        if (overlap > Math.min(a.radius, b.radius) * EAT_OVERLAP) {
          if (a.mass > b.mass * EAT_SIZE_RATIO) {
            a.mass += b.mass;
            this.bots[j].alive = false;
            for (let p = 0; p < 6; p++) {
              this.particles.push(new Particle(b.x, b.y, b.color));
            }
          } else if (b.mass > a.mass * EAT_SIZE_RATIO) {
            b.mass += a.mass;
            this.bots[i].alive = false;
            for (let p = 0; p < 6; p++) {
              this.particles.push(new Particle(a.x, a.y, a.color));
            }
          }
        }
      }
    }
  }

  // ── Player Cell Separation ─────────────────────────────────
  separatePlayerCells() {
    for (let i = 0; i < this.playerCells.length; i++) {
      for (let j = i + 1; j < this.playerCells.length; j++) {
        const a = this.playerCells[i];
        const b = this.playerCells[j];
        const d = dist(a.x, a.y, b.x, b.y);
        const minDist = a.radius + b.radius;

        if (d < minDist && d > 0.1) {
          const now = performance.now();
          // Only separate if not ready to merge
          if (a.mergeTime > now || b.mergeTime > now) {
            const overlap = minDist - d;
            const dx = (b.x - a.x) / d;
            const dy = (b.y - a.y) / d;
            const push = overlap * 0.3;
            a.x -= dx * push;
            a.y -= dy * push;
            b.x += dx * push;
            b.y += dy * push;
            a.clampToWorld();
            b.clampToWorld();
          }
        }
      }
    }
  }

  // ── Player Cell Merge ──────────────────────────────────────
  checkPlayerMerge() {
    const now = performance.now();
    for (let i = 0; i < this.playerCells.length; i++) {
      for (let j = i + 1; j < this.playerCells.length; j++) {
        const a = this.playerCells[i];
        const b = this.playerCells[j];

        if (a.mergeTime > now || b.mergeTime > now) continue;

        const d = dist(a.x, a.y, b.x, b.y);
        if (d < Math.max(a.radius, b.radius)) {
          // Merge: bigger absorbs smaller
          if (a.mass >= b.mass) {
            a.mass += b.mass;
            a.x = (a.x * a.mass + b.x * b.mass) / (a.mass + b.mass) || a.x;
            this.playerCells.splice(j, 1);
            j--;
          } else {
            b.mass += a.mass;
            this.playerCells.splice(i, 1);
            i--;
            break;
          }
        }
      }
    }
  }

  // ── Respawning ─────────────────────────────────────────────
  respawnFood() {
    while (this.foods.length < FOOD_COUNT) {
      this.foods.push(new Food());
    }
  }

  respawnBots() {
    for (const bot of this.bots) {
      if (!bot.alive) {
        bot.respawn();
      }
    }
  }

  // ── Camera ─────────────────────────────────────────────────
  updateCamera(dt) {
    const center = this.getPlayerCenter();
    const totalMass = this.getPlayerTotalMass();
    this.camera.follow(center.x, center.y, totalMass);
    this.camera.update(dt);
  }

  // ── Score ──────────────────────────────────────────────────
  updateScore() {
    const totalMass = this.getPlayerTotalMass();
    this.score = Math.max(this.score, totalMass);
    this.maxMass = Math.max(this.maxMass, totalMass);
  }

  // ══════════════════════════════════════════════════════════
  //  RENDERING
  // ══════════════════════════════════════════════════════════
  render() {
    const ctx = this.ctx;
    const cam = this.camera;
    const w = this.canvasW;
    const h = this.canvasH;

    // Screen shake offset
    const shakeX = (Math.random() - 0.5) * this.shakeAmount;
    const shakeY = (Math.random() - 0.5) * this.shakeAmount;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // ── Background ─────────────────────────────────────────
    ctx.fillStyle = '#F2FBFF';
    ctx.fillRect(0, 0, w, h);

    // ── Grid ───────────────────────────────────────────────
    this.drawGrid(ctx, cam);

    // ── World border ───────────────────────────────────────
    this.drawWorldBorder(ctx, cam);

    // ── Food ───────────────────────────────────────────────
    this.drawFood(ctx, cam);

    // ── Ejected Mass ───────────────────────────────────────
    for (const ej of this.ejectedMass) {
      if (!cam.isVisible(ej.x, ej.y, ej.radius)) continue;
      const s = cam.worldToScreen(ej.x, ej.y);
      const sr = ej.radius * cam.zoom;
      ctx.beginPath();
      ctx.arc(s.x, s.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = ej.color;
      ctx.fill();
    }

    // ── Collect all cells and sort by mass ─────────────────
    const allCells = [];
    for (const cell of this.playerCells) {
      allCells.push({ cell, isPlayer: true });
    }
    for (const bot of this.bots) {
      if (bot.alive) allCells.push({ cell: bot.cell, isPlayer: false });
    }
    allCells.sort((a, b) => a.cell.mass - b.cell.mass);

    // ── Draw Cells ─────────────────────────────────────────
    for (const { cell, isPlayer } of allCells) {
      if (!cam.isVisible(cell.x, cell.y, cell.radius * 1.1)) continue;
      this.drawCell(ctx, cam, cell, isPlayer);
    }

    // ── Particles ──────────────────────────────────────────
    for (const p of this.particles) {
      if (!cam.isVisible(p.x, p.y, p.radius * 3)) continue;
      const s = cam.worldToScreen(p.x, p.y);
      const sr = p.radius * cam.zoom;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // ── Joystick (screen-space) ────────────────────────────
    this.joystick.draw(ctx);

    // ── HUD ────────────────────────────────────────────────
    if (this.state === 'playing') {
      this.drawHUD();
      this.drawMinimap();
    }
  }

  // ── Draw Grid ──────────────────────────────────────────────
  drawGrid(ctx, cam) {
    const bounds = cam.getViewBounds();
    const startX = Math.floor(bounds.left / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(bounds.top / GRID_SIZE) * GRID_SIZE;
    const endX = Math.ceil(bounds.right / GRID_SIZE) * GRID_SIZE;
    const endY = Math.ceil(bounds.bottom / GRID_SIZE) * GRID_SIZE;

    ctx.strokeStyle = '#DDE6EC';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x <= endX; x += GRID_SIZE) {
      if (x < 0 || x > WORLD_W) continue;
      const s = cam.worldToScreen(x, 0);
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, this.canvasH);
    }

    for (let y = startY; y <= endY; y += GRID_SIZE) {
      if (y < 0 || y > WORLD_H) continue;
      const s = cam.worldToScreen(0, y);
      ctx.moveTo(0, s.y);
      ctx.lineTo(this.canvasW, s.y);
    }

    ctx.stroke();
  }

  // ── Draw World Border ──────────────────────────────────────
  drawWorldBorder(ctx, cam) {
    const tl = cam.worldToScreen(0, 0);
    const br = cam.worldToScreen(WORLD_W, WORLD_H);

    ctx.strokeStyle = '#E74C3C';
    ctx.lineWidth = 4;
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

    // Dim outside world
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    // Top
    ctx.fillRect(0, 0, this.canvasW, tl.y);
    // Bottom
    ctx.fillRect(0, br.y, this.canvasW, this.canvasH - br.y);
    // Left
    ctx.fillRect(0, tl.y, tl.x, br.y - tl.y);
    // Right
    ctx.fillRect(br.x, tl.y, this.canvasW - br.x, br.y - tl.y);
  }

  // ── Draw Food ──────────────────────────────────────────────
  drawFood(ctx, cam) {
    const time = performance.now() / 1000;
    for (const food of this.foods) {
      if (!cam.isVisible(food.x, food.y, 10)) continue;
      const s = cam.worldToScreen(food.x, food.y);
      const pulse = 1 + Math.sin(time * 2 + food.pulsePhase) * 0.15;
      const sr = food.radius * cam.zoom * pulse;

      if (sr < 1) continue; // too small to see

      ctx.beginPath();
      ctx.arc(s.x, s.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = food.color;
      ctx.fill();
    }
  }

  // ── Draw Cell (blob style) ─────────────────────────────────
  drawCell(ctx, cam, cell, isPlayer) {
    const s = cam.worldToScreen(cell.x, cell.y);
    const sr = cell.radius * cam.zoom;

    if (sr < 2) return; // too small

    // Blob wobble
    const wobbleAmount = Math.min(0.04, 0.01 + (Math.abs(cell.vx) + Math.abs(cell.vy)) * 0.00003);
    const points = Math.max(20, Math.floor(sr * 0.8));

    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const wobble = 1 + Math.sin(angle * 7 + cell.wobblePhase) * wobbleAmount +
                         Math.sin(angle * 11 - cell.wobblePhase * 1.3) * wobbleAmount * 0.5;
      const r = sr * wobble;
      const px = s.x + Math.cos(angle) * r;
      const py = s.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Fill
    ctx.fillStyle = cell.color;
    ctx.fill();

    // Border
    ctx.strokeStyle = darkenColor(cell.color, 0.2);
    ctx.lineWidth = Math.max(2, sr * 0.06);
    ctx.stroke();

    // Name and mass (only if big enough to read)
    if (sr > 18) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Name
      const nameSize = Math.max(10, Math.min(sr * 0.38, 40));
      ctx.font = `bold ${nameSize}px Ubuntu, Arial, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = Math.max(2, nameSize * 0.12);
      ctx.strokeText(cell.name, s.x, s.y - nameSize * 0.2);
      ctx.fillText(cell.name, s.x, s.y - nameSize * 0.2);

      // Mass
      if (sr > 30) {
        const massSize = Math.max(8, nameSize * 0.6);
        ctx.font = `${massSize}px Ubuntu, Arial, sans-serif`;
        ctx.strokeText(Math.floor(cell.mass), s.x, s.y + nameSize * 0.5);
        ctx.fillText(Math.floor(cell.mass), s.x, s.y + nameSize * 0.5);
      }
    }
  }

  // ── HUD ────────────────────────────────────────────────────
  drawHUD() {
    const totalMass = this.getPlayerTotalMass();
    document.getElementById('score').textContent = `Score: ${Math.floor(totalMass).toLocaleString()}`;

    // Leaderboard
    const entries = [];
    entries.push({ name: this.playerName, mass: totalMass, isPlayer: true });
    for (const bot of this.bots) {
      if (bot.alive) {
        entries.push({ name: bot.cell.name, mass: bot.cell.mass, isPlayer: false });
      }
    }
    entries.sort((a, b) => b.mass - a.mass);

    const list = document.getElementById('leaderList');
    list.innerHTML = '';
    const top = entries.slice(0, 5);
    for (let i = 0; i < top.length; i++) {
      const li = document.createElement('li');
      li.textContent = `${i + 1}. ${top[i].name}`;
      if (top[i].isPlayer) li.className = 'me';
      list.appendChild(li);
    }
  }

  // ── Minimap ────────────────────────────────────────────────
  drawMinimap() {
    const ctx = this.minimapCtx;
    const size = this.minimapSize;
    const scale = size / WORLD_W;

    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, size, size);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    // Bots (small dots)
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      ctx.beginPath();
      ctx.arc(bot.cell.x * scale, bot.cell.y * scale, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();
    }

    // Player cells (highlighted)
    for (const cell of this.playerCells) {
      ctx.beginPath();
      ctx.arc(cell.x * scale, cell.y * scale, Math.max(3, cell.radius * scale), 0, Math.PI * 2);
      ctx.fillStyle = this.playerColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Camera viewport rectangle
    const bounds = this.camera.getViewBounds();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.max(0, bounds.left * scale),
      Math.max(0, bounds.top * scale),
      (bounds.right - bounds.left) * scale,
      (bounds.bottom - bounds.top) * scale,
    );
  }

  // ══════════════════════════════════════════════════════════
  //  GAME LOOP
  // ══════════════════════════════════════════════════════════
  gameLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    // FPS counter
    this.fpsCounter++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTime = 0;
    }

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  // ══════════════════════════════════════════════════════════
  //  INPUT HANDLING
  // ══════════════════════════════════════════════════════════
  setupInput() {
    const canvas = this.canvas;

    // ── Touch ──────────────────────────────────────────────
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        // Check if touching a button (don't start joystick)
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && (el.id === 'splitBtn' || el.id === 'ejectBtn')) continue;

        if (!this.joystick.active) {
          this.joystick.start(touch.clientX, touch.clientY, touch.identifier);
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (this.joystick.active && touch.identifier === this.joystick.touchId) {
          this.joystick.move(touch.clientX, touch.clientY);
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      for (const touch of e.changedTouches) {
        if (this.joystick.active && touch.identifier === this.joystick.touchId) {
          this.joystick.end();
        }
      }
    });

    canvas.addEventListener('touchcancel', (e) => {
      for (const touch of e.changedTouches) {
        if (this.joystick.active && touch.identifier === this.joystick.touchId) {
          this.joystick.end();
        }
      }
    });

    // ── Mouse (desktop fallback) ───────────────────────────
    canvas.addEventListener('mousedown', (e) => {
      if (!this.joystick.active) {
        this.joystick.start(e.clientX, e.clientY, -1);
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.joystick.active && this.joystick.touchId === -1) {
        this.joystick.move(e.clientX, e.clientY);
      }
    });

    canvas.addEventListener('mouseup', () => {
      if (this.joystick.active && this.joystick.touchId === -1) {
        this.joystick.end();
      }
    });

    // ── Keyboard (desktop) ─────────────────────────────────
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') this.split();
      if (e.code === 'KeyE') this.eject();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // ── Resize ─────────────────────────────────────────────
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.resizeCanvas(), 100);
    });
  }

  // ── UI Setup ───────────────────────────────────────────────
  setupUI() {
    // Play button
    document.getElementById('playBtn').addEventListener('click', () => {
      const name = document.getElementById('nameInput').value.trim();
      this.startGame(name);
    });

    // Enter key on name input
    document.getElementById('nameInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const name = document.getElementById('nameInput').value.trim();
        this.startGame(name);
      }
    });

    // Respawn button
    document.getElementById('respawnBtn').addEventListener('click', () => {
      this.startGame(this.playerName);
    });

    // Split button
    document.getElementById('splitBtn').addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.split();
    }, { passive: false });

    document.getElementById('splitBtn').addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.split();
    });

    // Eject button
    document.getElementById('ejectBtn').addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.eject();
    }, { passive: false });

    document.getElementById('ejectBtn').addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.eject();
    });
  }
}


// ═════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═════════════════════════════════════════════════════════════
window.addEventListener('load', () => {
  new Game();
});
