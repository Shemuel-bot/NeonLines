# Neon Lines

Neon Lines is a neon-themed arcade game built with React, Vite, Matter.js, and PlayroomKit. Players compete in a fast-paced arena where glowing balls bounce, dodge lethal red walls, and survive explosive turret attacks while drawing lines to reshape the battlefield.

The project supports both solo play and multiplayer sessions, with a polished menu flow and physics-driven gameplay.

## Features

- Solo and multiplayer modes
- Physics-based movement powered by Matter.js
- Cursor-drawn brush lines that create new obstacles
- Turret-based projectile attacks and shockwave explosions
- Countdown, end-game, and replay flow
- Dedicated screens for home, instructions, and settings

## Tech Stack

- React 19
- Vite
- React Router DOM
- Matter.js
- PlayroomKit
- Framer Motion
- use-sound

## Project Structure

- Frontend/src/App.jsx: main entry point and home screen
- Frontend/src/Modules/: route-based screens for gameplay selection, instructions, settings, and the game environment
- Frontend/src/Components/: gameplay and UI components such as the ball, brush, countdown, and end-game manager
- Frontend/src/assets/: sound effects, fonts, and other static assets

## Getting Started

1. Clone the repository.
2. Open the Frontend folder.
3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open the local Vite URL shown in the terminal.

## Available Scripts

From the Frontend directory:

- npm run dev: start the development server
- npm run build: build the app for production
- npm run preview: preview the production build locally
- npm run lint: run ESLint checks

## Gameplay Overview

1. Enter your name on the home screen.
2. Choose Solo or Multiplayer.
3. Use your cursor to draw lines that the balls can bounce off.
4. Avoid the red walls and survive the turret attacks long enough to win.

> Note: reloading the game page during an active match can end the session, so avoid refreshing mid-game.

