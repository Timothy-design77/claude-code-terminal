// ═══════════════════════════════════════════════════════════════
//  AGAR.IO CLONE — Complete Mobile Game Engine (v2)
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

const EAT_OVERLAP = 0.33;
const EAT_SIZE_RATIO = 1.15;

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
  let r, g, b;
  if (hex[0] === '#') {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return hex;
  }
  const f = 1 - amount;
  return 'rgb(' + (r * f | 0) + ',' + (g * f | 0) + ',' + (b * f | 0) + ')';
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  return m + 'm ' + (s % 60) + 's';
}


// ── Cell Class ───────────────────────────────────────────────
class Cell {
  constructor(x, y, mass, color, name) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.color = color;
    this.name = name || '';
    this.vx = 0;
    this.vy = 0;
    this.mergeTime = 0;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 2 + Math.random() * 2;
    this.lastDirX = 0;
    this.lastDirY = 1;
  }

  get radius() { return massToRadius(this.mass); }
  get speed() { return massToSpeed(this.mass); }

  clampToWorld() {
    const r = this.radius;
    this.x = clamp(this.x, r, WORLD_W - r);
    this.y = clamp(this.y, r, WORLD_H - r);
  }
}


// ── Food Class ───────────────────────────────────────────────
class Food {
  constructor() {
    this.x = randomRange(20, WORLD_W - 20);
    this.y = randomRange(20, WORLD_H - 20);
    this.mass = FOOD_MASS;
    this.color = pick(FOOD_COLORS);
    this.radius = 6 + Math.random() * 3;
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

    // Boundary avoidance — steer away from edges (BEFORE movement)
    const margin = 150;
    if (this.cell.x < margin) dirX += 0.5;
    if (this.cell.x > WORLD_W - margin) dirX -= 0.5;
    if (this.cell.y < margin) dirY += 0.5;
    if (this.cell.y > WORLD_H - margin) dirY -= 0.5;

    // Apply movement
    const speed = this.cell.speed;
    this.cell.x += dirX * speed * dt;
    this.cell.y += dirY * speed * dt;

    if (dirX !== 0 || dirY !== 0) {
      this.cell.lastDirX = dirX;
      this.cell.lastDirY = dirY;
    }

    this.cell.clampToWorld();

    // Mass decay
    if (this.cell.mass > DECAY_THRESHOLD) {
      this.cell.mass -= this.cell.mass * DECAY_RATE * dt;
    }

    // Slowly grow to prevent bots from starving away
    if (this.cell.mass < 80) {
      this.cell.mass += 2 * dt;
    }

    // Wobble animation
    this.cell.wobblePhase += this.cell.wobbleSpeed * dt;
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
    for (let k = 0; k < game.playerCells.length; k++) {
      const pc = game.playerCells[k];
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
    for (let k = 0; k < game.bots.length; k++) {
      const bot = game.bots[k];
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
    for (let k = 0; k < game.foods.length; k++) {
      const food = game.foods[k];
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
  constructor(viewW, viewH) {
    this.viewW = viewW || 300;
    this.viewH = viewH || 300;
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
      x: (wx - this.x) * this.zoom + this.viewW / 2,
      y: (wy - this.y) * this.zoom + this.viewH / 2,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.viewW / 2) / this.zoom + this.x,
      y: (sy - this.viewH / 2) / this.zoom + this.y,
    };
  }

  getViewBounds() {
    const hw = (this.viewW / 2) / this.zoom;
    const hh = (this.viewH / 2) / this.zoom;
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
    // Normalized direction
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
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < 1) {
      this.stickX = x;
      this.stickY = y;
      this.dirX = 0;
      this.dirY = 0;
      this.magnitude = 0;
      return;
    }

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
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner stick
    ctx.beginPath();
    ctx.arc(this.stickX, this.stickY, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}


// ── Particle ─────────────────────────────────────────────────
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


// ── Settings ─────────────────────────────────────────────────
class Settings {
  constructor() {
    this.leftHanded = false;
    this.showMinimap = true;
    this.showLeaderboard = true;
    this.buttonSize = 64;
    this.load();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('agario_settings'));
      if (saved) {
        if (saved.leftHanded !== undefined) this.leftHanded = saved.leftHanded;
        if (saved.showMinimap !== undefined) this.showMinimap = saved.showMinimap;
        if (saved.showLeaderboard !== undefined) this.showLeaderboard = saved.showLeaderboard;
        if (saved.buttonSize !== undefined) this.buttonSize = saved.buttonSize;
      }
    } catch (e) {
      // ignore
    }
  }

  save() {
    try {
      localStorage.setItem('agario_settings', JSON.stringify({
        leftHanded: this.leftHanded,
        showMinimap: this.showMinimap,
        showLeaderboard: this.showLeaderboard,
        buttonSize: this.buttonSize,
      }));
    } catch (e) {
      // ignore
    }
  }

  apply() {
    const hud = document.getElementById('hud');

    // Left-handed mode
    if (this.leftHanded) {
      hud.classList.add('left-handed');
    } else {
      hud.classList.remove('left-handed');
    }

    // Show/hide elements
    document.getElementById('minimapContainer').style.display = this.showMinimap ? '' : 'none';
    document.getElementById('leaderboard').style.display = this.showLeaderboard ? '' : 'none';

    // Button size
    var btns = document.querySelectorAll('.action-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].style.width = this.buttonSize + 'px';
      btns[i].style.height = this.buttonSize + 'px';
      btns[i].style.fontSize = Math.max(9, this.buttonSize * 0.17) + 'px';
    }

    // Sync UI controls
    document.getElementById('toggleLeftHand').checked = this.leftHanded;
    document.getElementById('toggleMinimap').checked = this.showMinimap;
    document.getElementById('toggleLeaderboard').checked = this.showLeaderboard;
    document.getElementById('selectBtnSize').value = String(this.buttonSize);
  }
}


// ═════════════════════════════════════════════════════════════
//  MAIN GAME CLASS
// ═════════════════════════════════════════════════════════════
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.state = 'menu'; // menu | playing | dead | settings
    this.playerName = '';
    this.playerColor = '';

    this.playerCells = [];
    this.foods = [];
    this.bots = [];
    this.ejectedMass = [];
    this.particles = [];

    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.joystick = new Joystick();
    this.settings = new Settings();

    this.score = 0;
    this.maxMass = 0;
    this.startTime = 0;
    this.lastTime = 0;
    this.shakeAmount = 0;
    this.keys = {};

    // Throttle HUD updates
    this.lastHudUpdate = 0;

    this.resizeCanvas();
    this.setupInput();
    this.setupUI();
    this.spawnFood();
    this.spawnBots();
    this.settings.apply();

    // Start loop
    requestAnimationFrame(function (t) { game.gameLoop(t); });
  }

  // ── Canvas Resize ──────────────────────────────────────────
  resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth;
    var h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.canvasW = w;
    this.canvasH = h;

    // Update camera viewport (logical pixels)
    this.camera.viewW = w;
    this.camera.viewH = h;

    // Minimap — use CSS size if available, else fallback
    var mm = this.minimapCanvas;
    var mmRect = mm.getBoundingClientRect();
    var mmSize = Math.round(mmRect.width) || 120;
    mm.width = mmSize * dpr;
    mm.height = mmSize * dpr;
    this.minimapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.minimapSize = mmSize;
  }

  // ── Spawn Entities ─────────────────────────────────────────
  spawnFood() {
    this.foods = [];
    for (var i = 0; i < FOOD_COUNT; i++) {
      this.foods.push(new Food());
    }
  }

  spawnBots() {
    this.bots = [];
    for (var i = 0; i < BOT_COUNT; i++) {
      this.bots.push(new Bot());
    }
  }

  // ── Start / Restart ────────────────────────────────────────
  startGame(name) {
    this.playerName = name || 'Cell';
    this.playerColor = pick(CELL_COLORS);

    var startCell = new Cell(
      WORLD_W / 2 + randomRange(-200, 200),
      WORLD_H / 2 + randomRange(-200, 200),
      START_MASS,
      this.playerColor,
      this.playerName
    );
    this.playerCells = [startCell];
    this.score = 0;
    this.maxMass = START_MASS;
    this.startTime = performance.now();
    this.state = 'playing';
    this.shakeAmount = 0;
    this.particles = [];
    this.ejectedMass = [];

    this.spawnFood();
    this.spawnBots();

    // Camera snap
    this.camera.x = startCell.x;
    this.camera.y = startCell.y;
    this.camera.targetX = startCell.x;
    this.camera.targetY = startCell.y;

    // Show HUD, hide overlays
    document.getElementById('hud').style.display = 'block';
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('deathScreen').style.display = 'none';
    document.getElementById('settingsOverlay').style.display = 'none';

    // Re-measure now that HUD is visible
    this.resizeCanvas();
    this.settings.apply();
  }

  die() {
    this.state = 'dead';
    var aliveTime = performance.now() - this.startTime;
    document.getElementById('finalScore').textContent = Math.floor(this.score).toLocaleString();
    document.getElementById('finalMass').textContent = Math.floor(this.maxMass).toLocaleString();
    document.getElementById('finalTime').textContent = formatTime(aliveTime);
    document.getElementById('deathScreen').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
  }

  // ── Player Helpers ─────────────────────────────────────────
  getPlayerTotalMass() {
    var total = 0;
    for (var i = 0; i < this.playerCells.length; i++) total += this.playerCells[i].mass;
    return total;
  }

  getPlayerCenter() {
    if (this.playerCells.length === 0) return { x: WORLD_W / 2, y: WORLD_H / 2 };
    var cx = 0, cy = 0, total = 0;
    for (var i = 0; i < this.playerCells.length; i++) {
      var c = this.playerCells[i];
      cx += c.x * c.mass;
      cy += c.y * c.mass;
      total += c.mass;
    }
    return { x: cx / total, y: cy / total };
  }

  // Returns { dirX, dirY } normalized direction, magnitude 0-1
  getInputDir() {
    var dx = 0, dy = 0;

    // Joystick: dirX/dirY are already normalized, magnitude is 0-1
    if (this.joystick.active && this.joystick.magnitude > 0.01) {
      dx = this.joystick.dirX * this.joystick.magnitude;
      dy = this.joystick.dirY * this.joystick.magnitude;
    }

    // Keyboard fallback (adds to joystick if both used)
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) dy -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) dy += 1;

    // Clamp to unit circle
    var mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 1) { dx /= mag; dy /= mag; mag = 1; }

    return { x: dx, y: dy, mag: mag };
  }

  // Get normalized direction for split/eject (with fallback to last dir)
  getAimDir() {
    var input = this.getInputDir();
    if (input.mag > 0.1) {
      var m = input.mag;
      return { x: input.x / m, y: input.y / m };
    }
    // Fallback to first player cell's last direction
    if (this.playerCells.length > 0) {
      var c = this.playerCells[0];
      return { x: c.lastDirX, y: c.lastDirY };
    }
    return { x: 0, y: 1 };
  }

  // ── Split ──────────────────────────────────────────────────
  split() {
    if (this.state !== 'playing') return;
    var aim = this.getAimDir();
    var newCells = [];

    for (var i = 0; i < this.playerCells.length; i++) {
      var cell = this.playerCells[i];
      if (cell.mass < SPLIT_MIN_MASS * 2) continue;
      if (this.playerCells.length + newCells.length >= MAX_PLAYER_CELLS) break;

      var halfMass = cell.mass / 2;
      cell.mass = halfMass;

      var nc = new Cell(cell.x, cell.y, halfMass, cell.color, cell.name);
      nc.vx = aim.x * SPLIT_SPEED;
      nc.vy = aim.y * SPLIT_SPEED;
      nc.mergeTime = performance.now() + MERGE_DELAY;
      nc.lastDirX = aim.x;
      nc.lastDirY = aim.y;
      cell.mergeTime = performance.now() + MERGE_DELAY;

      newCells.push(nc);
    }

    for (var j = 0; j < newCells.length; j++) {
      this.playerCells.push(newCells[j]);
    }
  }

  // ── Eject Mass ─────────────────────────────────────────────
  eject() {
    if (this.state !== 'playing') return;
    var aim = this.getAimDir();

    for (var i = 0; i < this.playerCells.length; i++) {
      var cell = this.playerCells[i];
      if (cell.mass < EJECT_MASS + 50) continue;

      cell.mass -= EJECT_MASS;

      var ej = new EjectedMass(
        cell.x + aim.x * cell.radius,
        cell.y + aim.y * cell.radius,
        aim.x * EJECT_SPEED,
        aim.y * EJECT_SPEED,
        cell.color
      );
      this.ejectedMass.push(ej);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════
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
    if (this.shakeAmount > 0.01) this.shakeAmount *= 0.9;
    else this.shakeAmount = 0;
  }

  updatePlayerCells(dt) {
    var input = this.getInputDir();

    for (var i = 0; i < this.playerCells.length; i++) {
      var cell = this.playerCells[i];

      // Movement: input.x/y already encode direction * magnitude (0-1)
      // Multiply by cell speed to get final velocity. NO double-magnitude.
      var speed = cell.speed;
      cell.x += input.x * speed * dt;
      cell.y += input.y * speed * dt;

      // Split impulse (decaying)
      cell.x += cell.vx * dt;
      cell.y += cell.vy * dt;
      cell.vx *= Math.pow(0.005, dt);
      cell.vy *= Math.pow(0.005, dt);

      // Track direction for split/eject aiming
      if (input.mag > 0.1) {
        cell.lastDirX = input.x / input.mag;
        cell.lastDirY = input.y / input.mag;
      }

      // Mass decay
      if (cell.mass > DECAY_THRESHOLD) {
        cell.mass -= cell.mass * DECAY_RATE * dt;
      }

      // Wobble
      cell.wobblePhase += cell.wobbleSpeed * dt;

      cell.clampToWorld();
    }
  }

  updateBots(dt) {
    for (var i = 0; i < this.bots.length; i++) {
      this.bots[i].update(dt, this);
    }
  }

  updateEjectedMass(dt) {
    for (var i = 0; i < this.ejectedMass.length; i++) {
      this.ejectedMass[i].update(dt);
    }
  }

  updateParticles(dt) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // ── Collisions ─────────────────────────────────────────────
  checkCollisions() {
    var i, j, d, overlap, cell, food, bot, ej, a, b;

    // Player eats food
    for (i = 0; i < this.playerCells.length; i++) {
      cell = this.playerCells[i];
      for (j = this.foods.length - 1; j >= 0; j--) {
        food = this.foods[j];
        d = dist(cell.x, cell.y, food.x, food.y);
        if (d < cell.radius) {
          cell.mass += food.mass;
          this.spawnParticles(food.x, food.y, food.color, 3);
          this.foods.splice(j, 1);
        }
      }
    }

    // Player eats ejected mass
    for (i = 0; i < this.playerCells.length; i++) {
      cell = this.playerCells[i];
      for (j = this.ejectedMass.length - 1; j >= 0; j--) {
        ej = this.ejectedMass[j];
        d = dist(cell.x, cell.y, ej.x, ej.y);
        if (d < cell.radius && cell.mass > ej.mass * EAT_SIZE_RATIO) {
          cell.mass += ej.mass;
          this.ejectedMass.splice(j, 1);
        }
      }
    }

    // Player vs Bots
    for (i = this.bots.length - 1; i >= 0; i--) {
      bot = this.bots[i];
      if (!bot.alive) continue;

      for (j = this.playerCells.length - 1; j >= 0; j--) {
        cell = this.playerCells[j];
        d = dist(cell.x, cell.y, bot.cell.x, bot.cell.y);
        overlap = cell.radius + bot.cell.radius - d;

        // Player eats bot
        if (overlap > bot.cell.radius * EAT_OVERLAP && cell.mass > bot.cell.mass * EAT_SIZE_RATIO) {
          cell.mass += bot.cell.mass;
          this.spawnParticles(bot.cell.x, bot.cell.y, bot.cell.color, 8);
          this.shakeAmount = Math.min(8, bot.cell.mass * 0.02);
          bot.alive = false;
          break;
        }

        // Bot eats player cell
        if (overlap > cell.radius * EAT_OVERLAP && bot.cell.mass > cell.mass * EAT_SIZE_RATIO) {
          bot.cell.mass += cell.mass;
          this.spawnParticles(cell.x, cell.y, cell.color, 8);
          this.playerCells.splice(j, 1);
          if (this.playerCells.length === 0) {
            this.die();
            return;
          }
          break;
        }
      }
    }

    // Bot eats food
    for (i = 0; i < this.bots.length; i++) {
      bot = this.bots[i];
      if (!bot.alive) continue;
      for (j = this.foods.length - 1; j >= 0; j--) {
        food = this.foods[j];
        d = dist(bot.cell.x, bot.cell.y, food.x, food.y);
        if (d < bot.cell.radius) {
          bot.cell.mass += food.mass;
          this.foods.splice(j, 1);
        }
      }
    }

    // Bot eats ejected mass
    for (i = 0; i < this.bots.length; i++) {
      bot = this.bots[i];
      if (!bot.alive) continue;
      for (j = this.ejectedMass.length - 1; j >= 0; j--) {
        ej = this.ejectedMass[j];
        d = dist(bot.cell.x, bot.cell.y, ej.x, ej.y);
        if (d < bot.cell.radius && bot.cell.mass > ej.mass * EAT_SIZE_RATIO) {
          bot.cell.mass += ej.mass;
          this.ejectedMass.splice(j, 1);
        }
      }
    }

    // Bot vs Bot
    for (i = 0; i < this.bots.length; i++) {
      if (!this.bots[i].alive) continue;
      for (j = i + 1; j < this.bots.length; j++) {
        if (!this.bots[j].alive) continue;
        a = this.bots[i].cell;
        b = this.bots[j].cell;
        d = dist(a.x, a.y, b.x, b.y);
        overlap = a.radius + b.radius - d;

        if (overlap > Math.min(a.radius, b.radius) * EAT_OVERLAP) {
          if (a.mass > b.mass * EAT_SIZE_RATIO) {
            a.mass += b.mass;
            this.bots[j].alive = false;
            this.spawnParticles(b.x, b.y, b.color, 6);
          } else if (b.mass > a.mass * EAT_SIZE_RATIO) {
            b.mass += a.mass;
            this.bots[i].alive = false;
            this.spawnParticles(a.x, a.y, a.color, 6);
          }
        }
      }
    }
  }

  spawnParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  // ── Player Cell Separation ─────────────────────────────────
  separatePlayerCells() {
    var now = performance.now();
    for (var i = 0; i < this.playerCells.length; i++) {
      for (var j = i + 1; j < this.playerCells.length; j++) {
        var a = this.playerCells[i];
        var b = this.playerCells[j];
        var d = dist(a.x, a.y, b.x, b.y);
        var minDist = a.radius + b.radius;

        if (d < minDist && d > 0.1) {
          if (a.mergeTime > now || b.mergeTime > now) {
            var push = (minDist - d) * 0.3;
            var dx = (b.x - a.x) / d;
            var dy = (b.y - a.y) / d;
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
    var now = performance.now();
    for (var i = 0; i < this.playerCells.length; i++) {
      for (var j = i + 1; j < this.playerCells.length; j++) {
        var a = this.playerCells[i];
        var b = this.playerCells[j];

        if (a.mergeTime > now || b.mergeTime > now) continue;

        var d = dist(a.x, a.y, b.x, b.y);
        if (d < Math.max(a.radius, b.radius)) {
          if (a.mass >= b.mass) {
            var totalMass = a.mass + b.mass;
            a.x = (a.x * a.mass + b.x * b.mass) / totalMass;
            a.y = (a.y * a.mass + b.y * b.mass) / totalMass;
            a.mass = totalMass;
            this.playerCells.splice(j, 1);
            j--;
          } else {
            var totalMass2 = a.mass + b.mass;
            b.x = (b.x * b.mass + a.x * a.mass) / totalMass2;
            b.y = (b.y * b.mass + a.y * a.mass) / totalMass2;
            b.mass = totalMass2;
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
    for (var i = 0; i < this.bots.length; i++) {
      if (!this.bots[i].alive) {
        this.bots[i].respawn();
      }
    }
  }

  updateCamera(dt) {
    var center = this.getPlayerCenter();
    var totalMass = this.getPlayerTotalMass();
    this.camera.follow(center.x, center.y, totalMass);
    this.camera.update(dt);
  }

  updateScore() {
    var totalMass = this.getPlayerTotalMass();
    this.score = Math.max(this.score, totalMass);
    this.maxMass = Math.max(this.maxMass, totalMass);
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDERING
  // ═══════════════════════════════════════════════════════════
  render() {
    var ctx = this.ctx;
    var cam = this.camera;
    var w = this.canvasW;
    var h = this.canvasH;

    // Screen shake
    var shakeX = 0, shakeY = 0;
    if (this.shakeAmount > 0.1) {
      shakeX = (Math.random() - 0.5) * this.shakeAmount;
      shakeY = (Math.random() - 0.5) * this.shakeAmount;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background
    ctx.fillStyle = '#F2FBFF';
    ctx.fillRect(-10, -10, w + 20, h + 20);

    // Grid
    this.drawGrid(ctx, cam);

    // World border
    this.drawWorldBorder(ctx, cam);

    // Food
    this.drawFood(ctx, cam);

    // Ejected mass
    for (var i = 0; i < this.ejectedMass.length; i++) {
      var ej = this.ejectedMass[i];
      if (!cam.isVisible(ej.x, ej.y, ej.radius)) continue;
      var s = cam.worldToScreen(ej.x, ej.y);
      var sr = ej.radius * cam.zoom;
      ctx.beginPath();
      ctx.arc(s.x, s.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = ej.color;
      ctx.fill();
    }

    // Collect and sort all cells by mass
    var allCells = [];
    for (var i = 0; i < this.playerCells.length; i++) {
      allCells.push({ cell: this.playerCells[i], isPlayer: true });
    }
    for (var i = 0; i < this.bots.length; i++) {
      if (this.bots[i].alive) {
        allCells.push({ cell: this.bots[i].cell, isPlayer: false });
      }
    }
    allCells.sort(function(a, b) { return a.cell.mass - b.cell.mass; });

    // Draw cells
    for (var i = 0; i < allCells.length; i++) {
      var entry = allCells[i];
      if (!cam.isVisible(entry.cell.x, entry.cell.y, entry.cell.radius * 1.1)) continue;
      this.drawCell(ctx, cam, entry.cell);
    }

    // Particles
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      if (!cam.isVisible(p.x, p.y, 10)) continue;
      var ps = cam.worldToScreen(p.x, p.y);
      var pr = p.radius * cam.zoom;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, pr, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Joystick (screen-space, outside save/restore)
    this.joystick.draw(ctx);

    // HUD updates (throttled)
    if (this.state === 'playing') {
      var now = performance.now();
      if (now - this.lastHudUpdate > 250) {
        this.lastHudUpdate = now;
        this.drawHUD();
      }
      if (this.settings.showMinimap) {
        this.drawMinimap();
      }
    }
  }

  // ── Grid ───────────────────────────────────────────────────
  drawGrid(ctx, cam) {
    var bounds = cam.getViewBounds();
    var startX = Math.floor(bounds.left / GRID_SIZE) * GRID_SIZE;
    var startY = Math.floor(bounds.top / GRID_SIZE) * GRID_SIZE;
    var endX = Math.ceil(bounds.right / GRID_SIZE) * GRID_SIZE;
    var endY = Math.ceil(bounds.bottom / GRID_SIZE) * GRID_SIZE;

    ctx.strokeStyle = '#DDE6EC';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (var x = startX; x <= endX; x += GRID_SIZE) {
      if (x < 0 || x > WORLD_W) continue;
      var sx = cam.worldToScreen(x, 0).x;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, this.canvasH);
    }

    for (var y = startY; y <= endY; y += GRID_SIZE) {
      if (y < 0 || y > WORLD_H) continue;
      var sy = cam.worldToScreen(0, y).y;
      ctx.moveTo(0, sy);
      ctx.lineTo(this.canvasW, sy);
    }

    ctx.stroke();
  }

  // ── World Border ───────────────────────────────────────────
  drawWorldBorder(ctx, cam) {
    var tl = cam.worldToScreen(0, 0);
    var br = cam.worldToScreen(WORLD_W, WORLD_H);

    ctx.strokeStyle = '#E74C3C';
    ctx.lineWidth = 4;
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

    // Dim outside
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(-10, -10, this.canvasW + 20, tl.y + 10);
    ctx.fillRect(-10, br.y, this.canvasW + 20, this.canvasH - br.y + 10);
    ctx.fillRect(-10, tl.y, tl.x + 10, br.y - tl.y);
    ctx.fillRect(br.x, tl.y, this.canvasW - br.x + 10, br.y - tl.y);
  }

  // ── Food ───────────────────────────────────────────────────
  drawFood(ctx, cam) {
    var time = performance.now() * 0.001;
    for (var i = 0; i < this.foods.length; i++) {
      var food = this.foods[i];
      if (!cam.isVisible(food.x, food.y, 10)) continue;
      var s = cam.worldToScreen(food.x, food.y);
      var pulse = 1 + Math.sin(time * 2 + food.pulsePhase) * 0.15;
      var sr = food.radius * cam.zoom * pulse;
      if (sr < 0.8) continue;

      ctx.beginPath();
      ctx.arc(s.x, s.y, sr, 0, Math.PI * 2);
      ctx.fillStyle = food.color;
      ctx.fill();
    }
  }

  // ── Cell (blob style) ─────────────────────────────────────
  drawCell(ctx, cam, cell) {
    var s = cam.worldToScreen(cell.x, cell.y);
    var sr = cell.radius * cam.zoom;
    if (sr < 2) return;

    // Blob wobble
    var wobbleAmt = Math.min(0.04, 0.01 + (Math.abs(cell.vx) + Math.abs(cell.vy)) * 0.00003);
    var points = Math.max(20, Math.floor(sr * 0.8));

    ctx.beginPath();
    for (var i = 0; i <= points; i++) {
      var angle = (i / points) * Math.PI * 2;
      var wobble = 1 + Math.sin(angle * 7 + cell.wobblePhase) * wobbleAmt +
                       Math.sin(angle * 11 - cell.wobblePhase * 1.3) * wobbleAmt * 0.5;
      var r = sr * wobble;
      var px = s.x + Math.cos(angle) * r;
      var py = s.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = cell.color;
    ctx.fill();

    ctx.strokeStyle = darkenColor(cell.color, 0.2);
    ctx.lineWidth = Math.max(2, sr * 0.06);
    ctx.stroke();

    // Name + mass
    if (sr > 18) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var nameSize = Math.max(10, Math.min(sr * 0.38, 40));
      ctx.font = 'bold ' + nameSize + 'px Ubuntu, Arial, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = Math.max(2, nameSize * 0.12);
      ctx.strokeText(cell.name, s.x, s.y - nameSize * 0.2);
      ctx.fillText(cell.name, s.x, s.y - nameSize * 0.2);

      if (sr > 30) {
        var massSize = Math.max(8, nameSize * 0.6);
        ctx.font = massSize + 'px Ubuntu, Arial, sans-serif';
        ctx.strokeText(Math.floor(cell.mass), s.x, s.y + nameSize * 0.5);
        ctx.fillText(Math.floor(cell.mass), s.x, s.y + nameSize * 0.5);
      }
    }
  }

  // ── HUD (throttled DOM updates) ────────────────────────────
  drawHUD() {
    var totalMass = this.getPlayerTotalMass();
    document.getElementById('score').textContent = 'Score: ' + Math.floor(totalMass).toLocaleString();

    if (!this.settings.showLeaderboard) return;

    // Leaderboard
    var entries = [];
    entries.push({ name: this.playerName, mass: totalMass, isPlayer: true });
    for (var i = 0; i < this.bots.length; i++) {
      if (this.bots[i].alive) {
        entries.push({ name: this.bots[i].cell.name, mass: this.bots[i].cell.mass, isPlayer: false });
      }
    }
    entries.sort(function(a, b) { return b.mass - a.mass; });

    var list = document.getElementById('leaderList');
    var html = '';
    var top = entries.slice(0, 5);
    for (var i = 0; i < top.length; i++) {
      var cls = top[i].isPlayer ? ' class="me"' : '';
      html += '<li' + cls + '>' + (i + 1) + '. ' + top[i].name + '</li>';
    }
    list.innerHTML = html;
  }

  // ── Minimap ────────────────────────────────────────────────
  drawMinimap() {
    var ctx = this.minimapCtx;
    var size = this.minimapSize;
    if (size <= 0) return;
    var scale = size / WORLD_W;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    // Bots
    for (var i = 0; i < this.bots.length; i++) {
      if (!this.bots[i].alive) continue;
      ctx.beginPath();
      ctx.arc(this.bots[i].cell.x * scale, this.bots[i].cell.y * scale, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();
    }

    // Player
    for (var i = 0; i < this.playerCells.length; i++) {
      var c = this.playerCells[i];
      ctx.beginPath();
      ctx.arc(c.x * scale, c.y * scale, Math.max(3, c.radius * scale), 0, Math.PI * 2);
      ctx.fillStyle = this.playerColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Viewport rect
    var bounds = this.camera.getViewBounds();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.max(0, bounds.left * scale),
      Math.max(0, bounds.top * scale),
      (bounds.right - bounds.left) * scale,
      (bounds.bottom - bounds.top) * scale
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════════════
  gameLoop(timestamp) {
    var dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(function(t) { game.gameLoop(t); });
  }

  // ═══════════════════════════════════════════════════════════
  //  INPUT HANDLING
  // ═══════════════════════════════════════════════════════════
  setupInput() {
    var self = this;
    var canvas = this.canvas;

    // ── Touch ────────────────────────────────────────────
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (self.state !== 'playing') return;

      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var touch = touches[i];
        // Don't start joystick if touching a button
        var el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && (el.id === 'splitBtn' || el.id === 'ejectBtn' || el.id === 'settingsBtn')) continue;

        if (!self.joystick.active) {
          self.joystick.start(touch.clientX, touch.clientY, touch.identifier);
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        if (self.joystick.active && touches[i].identifier === self.joystick.touchId) {
          self.joystick.move(touches[i].clientX, touches[i].clientY);
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        if (self.joystick.active && touches[i].identifier === self.joystick.touchId) {
          self.joystick.end();
        }
      }
    });

    canvas.addEventListener('touchcancel', function(e) {
      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        if (self.joystick.active && touches[i].identifier === self.joystick.touchId) {
          self.joystick.end();
        }
      }
    });

    // ── Mouse (desktop) ──────────────────────────────────
    canvas.addEventListener('mousedown', function(e) {
      if (self.state !== 'playing') return;
      if (!self.joystick.active) {
        self.joystick.start(e.clientX, e.clientY, -1);
      }
    });

    canvas.addEventListener('mousemove', function(e) {
      if (self.joystick.active && self.joystick.touchId === -1) {
        self.joystick.move(e.clientX, e.clientY);
      }
    });

    canvas.addEventListener('mouseup', function() {
      if (self.joystick.active && self.joystick.touchId === -1) {
        self.joystick.end();
      }
    });

    // ── Keyboard ─────────────────────────────────────────
    window.addEventListener('keydown', function(e) {
      self.keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); self.split(); }
      if (e.code === 'KeyE') self.eject();
    });

    window.addEventListener('keyup', function(e) {
      self.keys[e.code] = false;
    });

    // ── Resize ───────────────────────────────────────────
    window.addEventListener('resize', function() { self.resizeCanvas(); });
    window.addEventListener('orientationchange', function() {
      setTimeout(function() { self.resizeCanvas(); }, 150);
    });
  }

  // ── UI Setup ───────────────────────────────────────────────
  setupUI() {
    var self = this;

    // Play button
    var playBtn = document.getElementById('playBtn');
    playBtn.addEventListener('click', function() {
      self.startGame(document.getElementById('nameInput').value.trim());
    });
    playBtn.addEventListener('touchend', function(e) {
      e.preventDefault();
      self.startGame(document.getElementById('nameInput').value.trim());
    });

    // Name input enter
    document.getElementById('nameInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        self.startGame(document.getElementById('nameInput').value.trim());
      }
    });

    // Respawn button
    var respawnBtn = document.getElementById('respawnBtn');
    respawnBtn.addEventListener('click', function() {
      self.startGame(self.playerName);
    });
    respawnBtn.addEventListener('touchend', function(e) {
      e.preventDefault();
      self.startGame(self.playerName);
    });

    // Split button
    var splitBtn = document.getElementById('splitBtn');
    splitBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      self.split();
    }, { passive: false });
    splitBtn.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      self.split();
    });

    // Eject button
    var ejectBtn = document.getElementById('ejectBtn');
    ejectBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      self.eject();
    }, { passive: false });
    ejectBtn.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      self.eject();
    });

    // ── Settings ─────────────────────────────────────────
    document.getElementById('settingsBtn').addEventListener('click', function() {
      self.openSettings();
    });
    document.getElementById('settingsBtn').addEventListener('touchend', function(e) {
      e.preventDefault();
      self.openSettings();
    });

    document.getElementById('settingsDone').addEventListener('click', function() {
      self.closeSettings();
    });
    document.getElementById('settingsDone').addEventListener('touchend', function(e) {
      e.preventDefault();
      self.closeSettings();
    });

    // Setting toggles
    document.getElementById('toggleLeftHand').addEventListener('change', function() {
      self.settings.leftHanded = this.checked;
      self.settings.save();
      self.settings.apply();
    });

    document.getElementById('toggleMinimap').addEventListener('change', function() {
      self.settings.showMinimap = this.checked;
      self.settings.save();
      self.settings.apply();
    });

    document.getElementById('toggleLeaderboard').addEventListener('change', function() {
      self.settings.showLeaderboard = this.checked;
      self.settings.save();
      self.settings.apply();
    });

    document.getElementById('selectBtnSize').addEventListener('change', function() {
      self.settings.buttonSize = parseInt(this.value) || 64;
      self.settings.save();
      self.settings.apply();
    });
  }

  openSettings() {
    this.settings.apply(); // sync UI
    document.getElementById('settingsOverlay').style.display = 'flex';
    this.prevState = this.state;
    if (this.state === 'playing') this.state = 'settings';
  }

  closeSettings() {
    document.getElementById('settingsOverlay').style.display = 'none';
    if (this.state === 'settings') this.state = this.prevState || 'playing';
    this.resizeCanvas();
  }
}


// ═════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═════════════════════════════════════════════════════════════
var game;
window.addEventListener('load', function() {
  game = new Game();
});
