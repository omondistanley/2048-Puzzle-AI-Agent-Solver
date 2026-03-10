import asyncio
import json
import sys
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from ..services.game_service import grid_from_list, apply_move
from ..services.ai_service import compute_move_async

router = APIRouter()


@router.websocket("/ws/ai-watch")
async def ai_watch(ws: WebSocket):
    await ws.accept()

    grid_data: list[list[int]] | None = None
    size = 4
    strategy = "deep"
    speed_ms = 500
    score = 0
    running = False
    paused = False

    async def send(msg: dict):
        await ws.send_text(json.dumps(msg))

    try:
        while True:
            # Check for incoming command (non-blocking when running)
            try:
                if running and not paused:
                    raw = await asyncio.wait_for(ws.receive_text(), timeout=0.05)
                else:
                    raw = await ws.receive_text()

                cmd = json.loads(raw)
                action = cmd.get("action")

                if action == "start":
                    grid_data = cmd["grid"]
                    size = cmd.get("size", 4)
                    strategy = cmd.get("strategy", "deep")
                    speed_ms = cmd.get("speed_ms", 500)
                    score = cmd.get("score", 0)
                    running = True
                    paused = False

                elif action == "pause":
                    paused = True
                    await send({"type": "status", "status": "paused"})

                elif action == "resume":
                    paused = False
                    if "speed_ms" in cmd:
                        speed_ms = cmd["speed_ms"]
                    running = True

                elif action == "stop":
                    running = False
                    paused = False
                    await send({"type": "status", "status": "stopped"})
                    break

                elif action == "speed":
                    speed_ms = cmd.get("speed_ms", speed_ms)

            except asyncio.TimeoutError:
                pass  # No incoming message, continue loop

            # Execute one AI move if running
            if running and not paused and grid_data is not None:
                await send({"type": "status", "status": "thinking"})

                try:
                    direction = await compute_move_async(grid_data, size, strategy)
                except Exception as e:
                    await send({"type": "error", "message": str(e)})
                    running = False
                    continue

                if direction is None:
                    await send({"type": "status", "status": "done"})
                    running = False
                    continue

                result = apply_move(grid_data, direction, score, size)
                grid_data = result["grid"]
                score = result["score"]

                await send({
                    "type": "move",
                    "direction": direction,
                    "grid": grid_data,
                    "score": score,
                    "delta": result["delta"],
                    "over": result["over"],
                    "won": result["won"],
                    "new_tile_pos": result["new_tile_pos"],
                    "new_tile_value": result["new_tile_value"],
                    "merged_positions": result["merged_positions"],
                })

                if result["over"] or result["won"]:
                    await send({"type": "status", "status": "done"})
                    running = False
                    continue

                await asyncio.sleep(speed_ms / 1000)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await send({"type": "error", "message": str(e)})
        except Exception:
            pass
