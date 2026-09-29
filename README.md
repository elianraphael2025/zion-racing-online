# Zion Racing Online

A small real-time multiplayer browser racing game inspired by the colorful, blocky kart-racing reference.

## Features
- Live multiplayer over Socket.IO (up to 8 players)
- Server-side movement simulation and lap tracking
- 3-lap races, live leaderboard, coin pickups, boost input
- Keyboard and mobile touch controls
- Responsive browser UI
- Railway-friendly Node.js server

## Run locally
1. Install Node.js 18 or newer.
2. In this folder, run:
   ```bash
   npm install
   npm start
   ```
3. Open http://localhost:3000 in your browser.
4. Open the same address in another browser/device to test multiplayer.

## Deploy on Railway
1. Create a GitHub repository and upload all files in this project.
2. In Railway, create a new project and deploy from that GitHub repository.
3. Railway should detect `package.json` and run `npm start`.
4. Generate a public domain for the service.
5. Share the resulting `https://....up.railway.app` URL with friends.

No separate database is required for this starter. The active race lives in server memory, so restarting the server resets the current race.

## Controls
- W / Up: accelerate
- S / Down: brake
- A / Left and D / Right: steer
- Space / Shift: boost (coins collected are tracked; boost is currently a simple arcade boost input)
- Mobile: use the on-screen buttons

## Notes
This is a playable multiplayer starter, not a full 3D Roblox experience. It uses a 2D top-down arcade presentation and simple track-position movement. Players in the same deployed instance share the same live race.
