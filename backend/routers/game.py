from fastapi import APIRouter
from datetime import date

from ..schemas import (
    NewGameRequest, NewGameResponse,
    MoveRequest, MoveResponse,
    HintRequest, HintResponse,
    AnalysisRequest, AnalysisResponse,
    UndoRequest, UndoResponse,
    DailySeedResponse,
)
from ..services.game_service import new_game, apply_move, daily_seed
from ..services.ai_service import compute_move_async, compute_heuristic_all_directions
from ..services.game_service import grid_from_list

router = APIRouter()


@router.post("/new", response_model=NewGameResponse)
def create_new_game(req: NewGameRequest):
    seed = req.seed
    if req.daily and seed is None:
        seed = daily_seed()
    grid, used_seed = new_game(size=req.size, seed=seed)
    return NewGameResponse(grid=grid, seed=used_seed)


@router.post("/move", response_model=MoveResponse)
def make_move(req: MoveRequest):
    result = apply_move(req.grid, req.direction, req.score, req.size)
    return MoveResponse(**result)


@router.post("/hint", response_model=HintResponse)
async def get_hint(req: HintRequest):
    direction = await compute_move_async(
        req.grid, req.size, req.strategy, req.w_empty, req.w_mono, req.w_smooth
    )
    scores = compute_heuristic_all_directions(req.grid, req.size, req.w_empty, req.w_mono, req.w_smooth)

    g = grid_from_list(req.grid, req.size)
    from ..services.ai_service import _build_agent
    agent = _build_agent("deep", req.w_empty, req.w_mono, req.w_smooth)
    try:
        from IntelligentAgent import IntelligentAgent
        ia = IntelligentAgent()
        empty = len(g.getAvailableCells())
        mono = ia.monotocity(g)
        smooth = ia.smoothness(g)
    except Exception:
        empty, mono, smooth = 0, 0.0, 0.0

    return HintResponse(
        direction=direction if direction is not None else 0,
        heuristic_scores=scores,
        empty=empty,
        monotonicity=float(mono),
        smoothness=float(smooth),
    )


@router.post("/analysis", response_model=AnalysisResponse)
def get_analysis(req: AnalysisRequest):
    scores = compute_heuristic_all_directions(req.grid, req.size)
    dir_map = {"up": 0, "down": 1, "left": 2, "right": 3}
    valid = {k: v for k, v in scores.items() if v != float("-inf")}
    if valid:
        best_name = max(valid, key=valid.__getitem__)
        best_dir = dir_map[best_name]
    else:
        best_dir = 0
    return AnalysisResponse(scores=scores, best_direction=best_dir)


@router.post("/undo", response_model=UndoResponse)
def undo_move(req: UndoRequest):
    # Server just validates and echoes back; undo stack lives client-side
    return UndoResponse(grid=req.previous_grid, score=req.previous_score)


@router.get("/daily-seed", response_model=DailySeedResponse)
def get_daily_seed():
    seed = daily_seed()
    today = date.today().isoformat()
    return DailySeedResponse(seed=seed, date=today)
