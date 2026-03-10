from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


class NewGameRequest(BaseModel):
    size: int = 4
    undo_budget: int = 3
    daily: bool = False
    seed: Optional[int] = None


class NewGameResponse(BaseModel):
    grid: list[list[int]]
    seed: Optional[int]


class MoveRequest(BaseModel):
    grid: list[list[int]]
    direction: int  # 0=UP 1=DOWN 2=LEFT 3=RIGHT
    score: int
    size: int = 4


class MoveResponse(BaseModel):
    grid: list[list[int]]
    score: int
    delta: int
    over: bool
    won: bool
    moved: bool
    new_tile_pos: Optional[list[int]]
    new_tile_value: Optional[int]
    merged_positions: list[list[int]]


class HintRequest(BaseModel):
    grid: list[list[int]]
    size: int = 4
    strategy: str = "deep"  # "deep" | "greedy"
    w_empty: float = 2.0
    w_mono: float = 1.0
    w_smooth: float = 1.0


class HintResponse(BaseModel):
    direction: int
    heuristic_scores: dict[str, float]
    empty: int
    monotonicity: float
    smoothness: float


class AnalysisRequest(BaseModel):
    grid: list[list[int]]
    size: int = 4


class AnalysisResponse(BaseModel):
    scores: dict[str, float]
    best_direction: int


class UndoRequest(BaseModel):
    previous_grid: list[list[int]]
    previous_score: int
    size: int = 4


class UndoResponse(BaseModel):
    grid: list[list[int]]
    score: int


class DailySeedResponse(BaseModel):
    seed: int
    date: str


class HealthResponse(BaseModel):
    status: str
    version: str
