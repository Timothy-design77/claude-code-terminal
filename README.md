# Space Flight Simulator

A 2D space flight simulator with realistic orbital mechanics, inspired by Kerbal Space Program. Built with PixiJS and TypeScript.

## Play Now

**No install needed** — open `docs/index.html` directly in any browser (mobile or desktop).

Or enable GitHub Pages (Settings > Pages > deploy from `/docs` on `main`) and play at your GitHub Pages URL.

## Features

- Newtonian gravity with Velocity Verlet integration
- Orbit prediction with color-coded trajectories
- Solar system with star, 5 planets, and 4 moons
- Ship controls with thrust, rotation, fuel, and boost
- HUD with velocity, altitude, fuel, orbital elements
- Minimap with solar system overview
- Time warp (1x - 50x)
- Parallax starfield background
- Engine exhaust particle system
- Full mobile touch controls (joystick + buttons)
- Pinch-to-zoom on mobile

## Controls

### Mobile
- **Left joystick** — push up to thrust, left/right to rotate
- **THR** — thrust | **BST** — boost | **RST** — reset
- **<< / >>** — time warp | **+/-** — zoom
- **Pinch** — zoom in/out

### Desktop
- **W** — thrust | **A/D** — rotate | **Shift** — boost
- **,/.** — time warp | **C** — camera mode | **R** — reset
- **Scroll** — zoom

## Development

```bash
npm install
npm run dev
# Open localhost:3000
```

## Tech Stack

- **Renderer**: PixiJS 8 (WebGL2)
- **Physics**: Custom Newtonian gravity engine
- **Framework**: Next.js 14 + TypeScript
- **Standalone**: Single HTML file with CDN PixiJS (no build needed)
