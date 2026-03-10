import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from .routers.game import router as game_router
from .routers.ai_watch import router as ai_watch_router
from .schemas import HealthResponse

app = FastAPI(title="2048 AI Solver", version="2.0.0")

# CORS — allow localhost dev server during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(game_router, prefix="/api/game", tags=["game"])
app.include_router(ai_watch_router, tags=["ai-watch"])


@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", version="2.0.0")


# Serve built React app (production)
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        index = os.path.join(FRONTEND_DIST, "index.html")
        return FileResponse(index)
