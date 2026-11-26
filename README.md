# Zombie Shooter Online Co-op

This project contains your existing Zombie Shooter game with an online co-op lobby added, plus the Node.js + Socket.IO server.

## Run locally

1. Install Node.js (LTS) from https://nodejs.org/
2. Open a terminal in this folder.
3. Run `npm install`
4. Run `npm start`
5. Open http://localhost:10000
6. Choose **ONLINE MULTIPLAYER**. One player creates a room; the other enters the six-character code.

To test two players on one computer, open the page in two separate browser windows. For a real friend, both players need to use the deployed website URL.

## Deploy free test version on Render

1. Create a GitHub account if you do not already have one.
2. Create a new GitHub repository and upload the contents of this folder (not the outer ZIP file).
3. In Render, choose **New + → Web Service**, connect the repository, and deploy.
4. Render should detect `render.yaml`. If it asks, use:
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/health`
   - Instance type: Free
5. Open the Render `onrender.com` address after deployment finishes.
6. Share the website address and six-character room code with your friend.

## Controls

- Host / Player 1: WASD, mouse aim, hold left-click to shoot, E for store, 1–8 to switch weapons.
- Guest / Player 2: WASD, hold left-click to shoot (auto-aim), Q or 1–8 to change weapons, E for store.
- The original local split-screen mode remains available.

## Prototype limitations

The host browser runs the authoritative simulation and streams snapshots to the guest. If the host closes the tab or disconnects, the room ends. The free Render service may sleep after inactivity, so the first connection after a quiet period can take a little time. This is a free testing setup, not a cheat-proof public game service.
