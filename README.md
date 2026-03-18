# 2048 Puzzle AI Agent Solver

An intelligent agent that plays and assists with the 2048 puzzle game using **Expectiminimax search**, **alpha-beta pruning**, and **iterative deepening**. Available as a full-stack web application with a React UI, FastAPI backend, and real-time AI gameplay streaming — or run directly from the terminal.

**Live Demo:** [2048-puzzle-ai-agent-solver.fly.dev](https://2048-puzzle-ai-agent-solver.fly.dev/)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [AI Algorithm](#ai-algorithm)
- [Running Locally](#running-locally)
- [API Reference](#api-reference)
- [Frontend Features](#frontend-features)
- [Project Structure](#project-structure)
- [CLI Mode](#cli-mode)
- [Customization](#customization)
- [References](#references)

---

## Overview

The AI agent plays 2048 by searching a game tree that models both the player's deterministic moves and the computer's stochastic tile placements. Each move is computed within a strict **0.2-second time limit** using iterative deepening — the agent deepens its search as far as time allows, always returning the best move found so far.

**Three ways to use it:**
- **Watch** the AI play in real-time via WebSocket streaming
- **Assist** mode — get AI hints while you play
- **CLI** — run a fully automated game in the terminal

---

## Architecture

```
┌─────────────────────────────────┐
│       React Frontend            │  Keyboard / UI input
│  (Vite + TypeScript + Tailwind) │  ← REST API + WebSocket →
└─────────────────┬───────────────┘
                  │
┌─────────────────▼───────────────┐
│       FastAPI Backend           │  /api/game/*  +  /ws/ai-watch
│       (Uvicorn ASGI)            │
└─────────────────┬───────────────┘
                  │
┌─────────────────▼───────────────┐
│     Python Game Engine          │
│  Grid.py · IntelligentAgent.py  │
│  GameManager.py · ComputerAI.py │
└─────────────────────────────────┘
```

- The **React frontend** handles input and renders the board. It communicates with the backend over REST for single moves/hints and over WebSocket for streaming AI gameplay.
- The **FastAPI backend** wraps the Python game engine, exposes endpoints, and manages WebSocket sessions.
- The **Python engine** contains all game logic and the AI search algorithm — it can also run standalone from the terminal.

**Stack:**
| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, Uvicorn, Pydantic |
| Game Engine | Python 3.11 |
| Deployment | Docker (multi-stage), Fly.io |

---

## AI Algorithm

### Expectiminimax with Alpha-Beta Pruning

Standard minimax assumes a deterministic opponent. 2048 is stochastic — the computer places a tile randomly on any empty cell. Expectiminimax extends minimax with **chance nodes** that compute the expected value across all possible tile placements, weighted by probability (90% for a "2" tile, 10% for a "4" tile).

```
getMove(grid)
  └── iterativeDeepening(grid)         # depth 1, 2, 3, ... until 0.2s
        └── maximizingLogic(grid, α, β)  # player: pick best direction
              └── expectiminimax(grid)    # chance: average over tile placements
                    └── maximizingLogic(grid, α, β)
                          └── ...
                                └── heuristicValue(grid)  # leaf node
```

**Alpha-beta pruning** is applied on the maximizing side: branches where `alpha >= beta` are skipped entirely, reducing the effective search space without affecting the result.

**Iterative deepening** ensures the agent always has a move to return. It searches to depth 1, saves the result, then depth 2, and so on — stopping when the 0.2s wall-clock limit is hit and returning the deepest result completed.

### Heuristic Function

Board states at leaf nodes are evaluated with:

```
score = log₂(max_tile) + empty_cells × 2 + monotonicity + smoothness
```

| Term | What it measures |
|---|---|
| `log₂(max_tile)` | Rewards reaching higher tile values |
| `empty_cells × 2` | More free space = more future moves |
| `monotonicity` | Tiles arranged in increasing/decreasing order along rows/columns |
| `smoothness` | Penalizes large differences between adjacent tiles |

### AI Strategies

| Strategy | Description | When to use |
|---|---|---|
| `deep` | Full expectiminimax + iterative deepening | Best moves, slightly slower |
| `greedy` | One-ply lookahead only | Fast response, good for hints |

---

## Running Locally

### Option 1: Docker (recommended)

```bash
git clone https://github.com/omondistanley/2048-AI-Agent-solver.git
cd 2048-AI-Agent-solver
docker-compose up
```

Open [http://localhost:8000](http://localhost:8000).

### Option 2: Manual

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (in a separate terminal):
```bash
cd frontend
npm install
npm run dev        # dev server at http://localhost:5173
# or
npm run build      # production build served by FastAPI at :8000
```

**Environment variables** (copy `.env.example` → `.env`):
```
VITE_API_URL=http://localhost:8000
```

### Option 3: CLI only

No dependencies required. See [CLI Mode](#cli-mode).

---

## API Reference

### REST Endpoints

All endpoints are prefixed with `/api/game`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/new` | Start a new game. Returns initial grid and seed. |
| `POST` | `/move` | Apply a move (`direction`: 0=up, 1=down, 2=left, 3=right). Returns new grid, score, delta. |
| `POST` | `/hint` | Get AI-recommended direction + heuristic breakdown per direction. |
| `POST` | `/analysis` | Heuristic scores for all 4 directions + best direction. |
| `POST` | `/undo` | Rewind one move. Returns previous grid and score. |
| `GET` | `/daily-seed` | Seed for today's daily challenge. |
| `GET` | `/health` | Health check. |

**Example — get a hint:**
```bash
curl -X POST http://localhost:8000/api/game/hint \
  -H "Content-Type: application/json" \
  -d '{"grid": [[0,2,4,0],[0,0,2,8],[4,0,0,16],[0,0,0,32]]}'
```
```json
{
  "direction": 2,
  "heuristic_scores": {"0": 14.3, "1": 12.1, "2": 18.7, "3": 11.0},
  "empty": 10,
  "monotonicity": 3.2,
  "smoothness": -1.4
}
```

### WebSocket: `/ws/ai-watch`

Stream AI moves in real-time.

**Client → Server commands:**
```jsonc
// Start AI play
{"action": "start", "grid": [[...]], "strategy": "deep", "speed_ms": 500}

// Pause / resume / stop
{"action": "pause"}
{"action": "resume"}
{"action": "stop"}

// Change speed while running
{"action": "speed", "speed_ms": 200}
```

**Server → Client messages:**
```jsonc
// AI played a move
{"type": "move", "direction": 2, "grid": [[...]], "score": 1024, "best_tile": 128}

// Status update
{"type": "status", "status": "thinking"}   // or "paused", "done", "stopped"

// Error
{"type": "error", "message": "..."}
```

---

## Frontend Features

### Game Modes

| Mode | Description |
|---|---|
| `human` | Keyboard controls (arrow keys or WASD) |
| `ai_watch` | Watch the AI play via WebSocket stream |
| `ai_assist` | You play; AI suggests the best move |

### UI Features

- **Heuristic Analysis Panel** — live scores for all 4 directions
- **Undo** — configurable move budget
- **Replay** — record and replay any game
- **Daily Challenge** — same starting board for all players each day
- **Achievements** — 9 unlockable achievements (tile milestones, speed records, streaks)
- **Themes** — multiple color schemes including colorblind-safe options
- **Settings** — dark mode, sound, haptics, hint visibility

---

## Project Structure

```
2048-Puzzle-AI-Agent-Solver/
│
├── # Python Game Engine (CLI)
├── Grid.py                    # Board state & movement logic
├── IntelligentAgent.py        # Expectiminimax AI agent
├── GameManager.py             # Main game loop & turn management
├── ComputerAI.py              # Random tile placement
├── Displayer.py               # Terminal board display (ANSI colors)
├── BaseAI.py                  # Abstract base for AI agents
├── BaseDisplayer.py           # Abstract base for displayers
│
├── backend/
│   ├── main.py                # FastAPI app, CORS, static file serving
│   ├── schemas.py             # Pydantic request/response models
│   ├── requirements.txt       # Python dependencies
│   ├── routers/
│   │   ├── game.py            # REST endpoints (/new, /move, /hint, /analysis, /undo)
│   │   └── ai_watch.py        # WebSocket endpoint (/ws/ai-watch)
│   └── services/
│       ├── game_service.py    # new_game(), apply_move(), daily_seed()
│       └── ai_service.py      # compute_move_async(), heuristic calculation
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── main.tsx           # React entry point
│   │   ├── components/        # Board, Tiles, Sidebar, Modals, Controls, Header
│   │   ├── context/           # Game & Settings state (React Context)
│   │   ├── api/               # API client functions
│   │   ├── hooks/             # Custom React hooks
│   │   ├── engine/            # Client-side game engine
│   │   ├── utils/             # Tile colors, achievements, board utilities
│   │   └── types/             # TypeScript type definitions
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── Dockerfile                 # Multi-stage: Node (frontend) + Python (backend)
├── docker-compose.yml
├── fly.toml                   # Fly.io deployment config
├── render.yaml                # Render.com deployment config
├── .env.example
└── output2.txt                # CLI game results log
```

---

## CLI Mode

Run a fully automated game in the terminal with no dependencies:

```bash
python GameManager.py
```

The AI plays automatically. The board is printed after each move and the maximum tile achieved is appended to `output2.txt`.

**Customization:**

| What | Where |
|---|---|
| Board size | `size` parameter in `GameManager.py` |
| Time limit per move | `timeLimit` in `GameManager.py` (default: 0.2s) |
| Heuristic weights | `heuristicValue()` in `IntelligentAgent.py` |
| Output file | Filename in `GameManager.py` |

---

## References

- [Expectiminimax Algorithm — Wikipedia](https://en.wikipedia.org/wiki/Expectiminimax)
- [2048 Game Mechanics — Wikipedia](https://en.wikipedia.org/wiki/2048_(video_game))
- [AI for 2048 — Theresa Migler](https://theresamigler.com/wp-content/uploads/2020/03/2048.pdf)
- [Stanford CS221: Games](https://web.stanford.edu/class/archive/cs/cs221/cs221.1186/lectures/games1.pdf)
