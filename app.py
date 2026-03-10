import streamlit as st
import sys, os, time, random, math, types
from copy import deepcopy

sys.path.insert(0, os.path.dirname(__file__))

from Grid import Grid
from IntelligentAgent import IntelligentAgent
from ComputerAI import ComputerAI

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(page_title="2048 AI Solver", page_icon="🧩", layout="centered")

# ── Tile colours ──────────────────────────────────────────────────────────────
TILE_COLORS = {
    0:     ("#cdc1b4", "#776e65"),
    2:     ("#eee4da", "#776e65"),
    4:     ("#ede0c8", "#776e65"),
    8:     ("#f2b179", "#f9f6f2"),
    16:    ("#f59563", "#f9f6f2"),
    32:    ("#f67c5f", "#f9f6f2"),
    64:    ("#f65e3b", "#f9f6f2"),
    128:   ("#edcf72", "#f9f6f2"),
    256:   ("#edcc61", "#f9f6f2"),
    512:   ("#edc850", "#f9f6f2"),
    1024:  ("#edc53f", "#f9f6f2"),
    2048:  ("#edc22e", "#f9f6f2"),
    4096:  ("#3e3933", "#f9f6f2"),
    8192:  ("#3e3933", "#f9f6f2"),
}

def tile_color(val):
    return TILE_COLORS.get(val, ("#3e3933", "#f9f6f2"))

ACTION_NAMES = {0: "Up", 1: "Down", 2: "Left", 3: "Right"}

# ── Greedy AI ─────────────────────────────────────────────────────────────────
class GreedyAgent:
    def getMove(self, grid):
        best_move, best_val = None, float("-inf")
        for move, next_state in grid.getAvailableMoves():
            val = self._h(next_state)
            if val > best_val:
                best_val, best_move = val, move
        return best_move

    def _h(self, grid):
        empty = len(grid.getAvailableCells())
        mx = max(c for row in grid.map for c in row) or 1
        return math.log2(mx) + empty * 2

# ── Helpers ───────────────────────────────────────────────────────────────────
def new_grid():
    g = Grid(4)
    cells = g.getAvailableCells()
    for _ in range(2):
        if cells:
            pos = random.choice(cells)
            cells.remove(pos)
            g.setCellValue(pos, 2 if random.random() < 0.9 else 4)
    return g

def add_random_tile(grid):
    cells = grid.getAvailableCells()
    if cells:
        pos = random.choice(cells)
        grid.setCellValue(pos, 2 if random.random() < 0.9 else 4)

def compute_score(grid):
    return sum(v for row in grid.map for v in row)

def is_game_over(grid):
    return not grid.canMove()

def board_html(grid_map, hint_dir=None):
    """
    Render a 4×4 board.  hint_dir (0-3) optionally draws a faint directional
    arrow overlay on the board to show the AI's suggestion.
    """
    arrow = {0: "↑", 1: "↓", 2: "←", 3: "→"}.get(hint_dir, "")
    overlay = ""
    if arrow:
        overlay = (
            f"<div style='position:absolute;top:0;left:0;width:100%;height:100%;"
            f"display:flex;align-items:center;justify-content:center;"
            f"font-size:72px;color:rgba(255,255,255,0.35);pointer-events:none;"
            f"border-radius:8px;'>{arrow}</div>"
        )

    html = (
        "<div style='display:inline-block;background:#bbada0;padding:8px;"
        "border-radius:8px;position:relative;'>"
        + overlay
    )
    for row in grid_map:
        html += "<div style='display:flex;gap:8px;margin-bottom:8px;'>"
        for val in row:
            bg, fg = tile_color(val)
            text = str(val) if val else ""
            fs = "28px" if val < 1000 else "20px" if val < 10000 else "15px"
            html += (
                f"<div style='width:80px;height:80px;background:{bg};border-radius:4px;"
                f"display:flex;align-items:center;justify-content:center;"
                f"font-size:{fs};font-weight:bold;color:{fg};'>{text}</div>"
            )
        html += "</div>"
    html += "</div>"
    return html

def render_board(grid, score, label="", hint_dir=None):
    if label:
        st.markdown(
            f"<div style='text-align:center;font-size:14px;color:#888;"
            f"margin-bottom:4px'>{label}</div>",
            unsafe_allow_html=True,
        )
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown(board_html(grid.map, hint_dir=hint_dir), unsafe_allow_html=True)
        st.markdown(
            f"<div style='text-align:center;margin-top:8px;font-size:20px;"
            f"font-weight:bold;'>Score: {score}"
            f" &nbsp;|&nbsp; Max: {grid.getMaxTile()}</div>",
            unsafe_allow_html=True,
        )

# ── D-pad component ───────────────────────────────────────────────────────────
def dpad(hint_dir=None, key_prefix="dpad"):
    """
    Compact HTML D-pad centered below the board.
    Uses hidden Streamlit buttons triggered by the HTML buttons via JS,
    so session state / rerun still works correctly.
    Returns the chosen direction int (0-3) or None.
    """
    # Colour each button: amber if it's the hinted direction, else default grey
    def _bg(d):
        return "#f59563" if d == hint_dir else "#8f7a66"
    def _fg(d):
        return "#fff" if d == hint_dir else "#f9f6f2"

    btn_css = (
        "width:56px;height:56px;font-size:20px;border:none;border-radius:8px;"
        "cursor:pointer;font-weight:bold;touch-action:manipulation;"
    )

    html = f"""
    <div style="display:flex;justify-content:center;margin:8px 0 4px;">
      <div style="display:grid;grid-template-columns:56px 56px 56px;
                  grid-template-rows:56px 56px 56px;gap:6px;">
        <!-- Up -->
        <div></div>
        <button id="{key_prefix}_up_html"
          style="{btn_css}background:{_bg(0)};color:{_fg(0)};grid-column:2;grid-row:1;"
          onclick="window._dpadClick(0)">⬆</button>
        <div></div>
        <!-- Left -->
        <button id="{key_prefix}_left_html"
          style="{btn_css}background:{_bg(2)};color:{_fg(2)};grid-column:1;grid-row:2;"
          onclick="window._dpadClick(2)">⬅</button>
        <!-- Centre: hint label or blank -->
        <div style="display:flex;align-items:center;justify-content:center;
                    font-size:10px;color:#f59563;font-weight:bold;text-align:center;
                    line-height:1.2;">
          {"AI<br>" + {0:"↑",1:"↓",2:"←",3:"→"}[hint_dir] if hint_dir is not None else ""}
        </div>
        <!-- Right -->
        <button id="{key_prefix}_right_html"
          style="{btn_css}background:{_bg(3)};color:{_fg(3)};grid-column:3;grid-row:2;"
          onclick="window._dpadClick(3)">➡</button>
        <!-- Down -->
        <div></div>
        <button id="{key_prefix}_down_html"
          style="{btn_css}background:{_bg(1)};color:{_fg(1)};grid-column:2;grid-row:3;"
          onclick="window._dpadClick(1)">⬇</button>
        <div></div>
      </div>
    </div>
    <script>
    window._dpadClick = function(dir) {{
        var url = new URL(window.parent.location.href);
        url.searchParams.set('move', dir);
        window.parent.history.replaceState(null, '', url.toString());
        window.parent.dispatchEvent(new PopStateEvent('popstate'));
    }};
    </script>
    """
    st.components.v1.html(html, height=200)
    # All D-pad clicks go through the ?move= query param (same as swipe/keyboard)
    return None

# ── Keyboard + swipe JS injection ────────────────────────────────────────────
def inject_controls():
    """
    Injects JS that:
    - Listens for arrow-key presses
    - Listens for touch swipe gestures
    Both write ?move=<0-3> into the URL, causing Streamlit to rerun.
    """
    st.components.v1.html(
        """
        <script>
        (function() {
            const keyMap = {
                'ArrowUp': 0, 'ArrowDown': 1,
                'ArrowLeft': 2, 'ArrowRight': 3
            };

            function sendMove(dir) {
                const url = new URL(window.parent.location.href);
                url.searchParams.set('move', dir);
                window.parent.history.replaceState(null, '', url.toString());
                // Trigger Streamlit rerun by dispatching a popstate event
                window.parent.dispatchEvent(new PopStateEvent('popstate'));
            }

            // ── Keyboard ──────────────────────────────────────────────────
            window.parent.document.addEventListener('keydown', function(e) {
                if (e.key in keyMap) {
                    e.preventDefault();
                    sendMove(keyMap[e.key]);
                }
            }, { once: false });

            // ── Touch / swipe ─────────────────────────────────────────────
            let touchStartX = null, touchStartY = null;

            window.parent.document.addEventListener('touchstart', function(e) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            window.parent.document.addEventListener('touchend', function(e) {
                if (touchStartX === null) return;
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                const adx = Math.abs(dx), ady = Math.abs(dy);
                if (Math.max(adx, ady) < 30) return; // too short
                if (adx > ady) {
                    sendMove(dx > 0 ? 3 : 2); // Right : Left
                } else {
                    sendMove(dy > 0 ? 1 : 0); // Down  : Up
                }
                touchStartX = touchStartY = null;
            }, { passive: true });
        })();
        </script>
        """,
        height=0,
    )

def read_swipe_move():
    """Read ?move= param set by the JS and clear it. Returns int or None."""
    params = st.query_params
    raw = params.get("move")
    if raw is not None:
        try:
            direction = int(raw)
            if 0 <= direction <= 3:
                st.query_params.clear()   # consume it
                return direction
        except (ValueError, TypeError):
            pass
    return None

# ── Session state ─────────────────────────────────────────────────────────────
def init_state(mode):
    st.session_state.grid         = new_grid()
    st.session_state.score        = 0
    st.session_state.mode         = mode
    st.session_state.game_over    = False
    st.session_state.ai_agent     = IntelligentAgent()
    st.session_state.ai_running   = False
    st.session_state.ai_took_over = False
    st.session_state.move_log     = []
    st.session_state.snapshots    = []
    st.session_state.undo_stack   = []   # list of (map_copy, score)
    st.session_state.hint_dir     = None

def ensure_persistent_state():
    if "stats" not in st.session_state:
        st.session_state.stats = {"games": 0, "wins": 0, "scores": [], "max_tiles": []}
    if "replays" not in st.session_state:
        st.session_state.replays = []
    if "replay_idx" not in st.session_state:
        st.session_state.replay_idx = 0
    if "replay_step" not in st.session_state:
        st.session_state.replay_step = 0
    if "viewing_replay" not in st.session_state:
        st.session_state.viewing_replay = False

def save_completed_game():
    stats = st.session_state.stats
    stats["games"] += 1
    stats["scores"].append(st.session_state.score)
    stats["max_tiles"].append(st.session_state.grid.getMaxTile())
    if st.session_state.grid.getMaxTile() >= 2048:
        stats["wins"] += 1
    st.session_state.replays.append({
        "game_num":  stats["games"],
        "max_tile":  st.session_state.grid.getMaxTile(),
        "score":     st.session_state.score,
        "moves":     list(st.session_state.move_log),
        "snapshots": [deepcopy(s) for s in st.session_state.snapshots],
    })

# ── Sidebar ───────────────────────────────────────────────────────────────────
st.title("🧩 2048 — AI Solver")
ensure_persistent_state()

with st.sidebar:
    st.header("Game Mode")
    mode = st.radio(
        "Choose mode",
        ["Human Play", "AI Watch", "Human + AI Assist"],
        help=(
            "**Human Play** – D-pad, keyboard arrows, or swipe\n\n"
            "**AI Watch** – watch the AI solve the puzzle\n\n"
            "**Human + AI Assist** – play, get hints, or hand off"
        ),
    )

    if st.button("New Game", use_container_width=True):
        init_state(mode)

    # ── AI Settings ───────────────────────────────────────────────────────────
    if mode in ("AI Watch", "Human + AI Assist"):
        with st.expander("⚙️ AI Settings", expanded=False):
            ai_strategy = st.radio(
                "Strategy",
                ["Expectiminimax", "Greedy"],
                help=(
                    "**Expectiminimax** — deep search + alpha-beta (stronger)\n\n"
                    "**Greedy** — fastest immediate heuristic move"
                ),
            )
            ai_speed = st.slider("Step delay (s)", 0.0, 1.5, 0.3, 0.05)
            st.markdown("**Heuristic weights** *(Expectiminimax)*")
            w_empty  = st.slider("Empty cells",   0.0, 5.0, 2.0, 0.1)
            w_mono   = st.slider("Monotonicity",  0.0, 5.0, 1.0, 0.1)
            w_smooth = st.slider("Smoothness",    0.0, 5.0, 1.0, 0.1)
    else:
        ai_strategy = "Expectiminimax"
        ai_speed = 0.3
        w_empty, w_mono, w_smooth = 2.0, 1.0, 1.0

    # ── Statistics ────────────────────────────────────────────────────────────
    with st.expander("📊 Statistics", expanded=False):
        stats = st.session_state.stats
        if stats["games"] == 0:
            st.info("No completed games yet.")
        else:
            win_rate  = 100 * stats["wins"] / stats["games"]
            avg_score = sum(stats["scores"]) / len(stats["scores"])
            avg_tile  = sum(stats["max_tiles"]) / len(stats["max_tiles"])
            c1, c2 = st.columns(2)
            c1.metric("Games",      stats["games"])
            c2.metric("Win rate",   f"{win_rate:.0f}%")
            c1.metric("Avg score",  f"{avg_score:.0f}")
            c2.metric("Avg tile",   f"{avg_tile:.0f}")
            c1.metric("Best score", max(stats["scores"]))
            c2.metric("Best tile",  max(stats["max_tiles"]))
            if len(stats["scores"]) > 1:
                st.markdown("**Score history**")
                st.line_chart(stats["scores"])

    # ── Replay viewer ─────────────────────────────────────────────────────────
    with st.expander("🎬 Replay", expanded=False):
        replays = st.session_state.replays
        if not replays:
            st.info("Finish a game to unlock replays.")
        else:
            labels = [
                f"Game {r['game_num']} — {r['max_tile']} | {r['score']} pts"
                for r in replays
            ]
            sel = st.selectbox("Select game", range(len(replays)),
                               format_func=lambda i: labels[i])
            chosen = replays[sel]
            if st.button("▶ Watch replay", use_container_width=True):
                st.session_state.viewing_replay = True
                st.session_state.replay_idx     = sel
                st.session_state.replay_step    = 0
                st.rerun()

            if st.session_state.viewing_replay and st.session_state.replay_idx == sel:
                snaps = chosen["snapshots"]
                step  = st.session_state.replay_step
                total = len(snaps)
                st.markdown(
                    f"<div style='text-align:center;font-size:13px;color:#888'>"
                    f"Step {step+1}/{total} — {snaps[step].get('label','')}</div>",
                    unsafe_allow_html=True,
                )
                st.markdown(board_html(snaps[step]["map"]), unsafe_allow_html=True)
                rc1, rc2, rc3 = st.columns(3)
                if rc1.button("⏮", use_container_width=True) and step > 0:
                    st.session_state.replay_step -= 1
                    st.rerun()
                if rc3.button("⏭", use_container_width=True) and step < total - 1:
                    st.session_state.replay_step += 1
                    st.rerun()
                if rc2.button("✖ Close", use_container_width=True):
                    st.session_state.viewing_replay = False
                    st.rerun()

    st.markdown("---")
    st.markdown(
        "**Controls (Human modes)**\n"
        "- D-pad buttons below the board\n"
        "- Keyboard arrow keys\n"
        "- Swipe on mobile\n\n"
        "Goal: reach **2048** 🏆"
    )

# ── Bootstrap session ─────────────────────────────────────────────────────────
if "grid" not in st.session_state or st.session_state.get("mode") != mode:
    init_state(mode)

grid  = st.session_state.grid
score = st.session_state.score

# ── Build active AI agent ─────────────────────────────────────────────────────
if ai_strategy == "Greedy":
    active_agent = GreedyAgent()
else:
    active_agent = st.session_state.ai_agent
    _we, _wm, _ws = w_empty, w_mono, w_smooth
    def _patched(self, g, we=_we, wm=_wm, ws=_ws):
        empty = len(g.getAvailableCells())
        mx    = max(c for row in g.map for c in row) or 1
        return math.log2(mx) + we*empty + wm*self.monotocity(g) + ws*self.smoothness(g)
    active_agent.heuristicValue = types.MethodType(_patched, active_agent)

# ── Helpers ───────────────────────────────────────────────────────────────────
def snapshot(label=""):
    st.session_state.snapshots.append({
        "map":   deepcopy(grid.map),
        "score": st.session_state.score,
        "label": label,
    })

def push_undo():
    st.session_state.undo_stack.append(
        (deepcopy(grid.map), st.session_state.score,
         list(st.session_state.move_log))
    )
    if len(st.session_state.undo_stack) > 10:
        st.session_state.undo_stack.pop(0)

def execute_move(move, actor="Human"):
    if move is not None and grid.canMove([move]):
        push_undo()
        snapshot(f"Before {actor} → {ACTION_NAMES[move]}")
        grid.move(move)
        st.session_state.score = compute_score(grid)
        add_random_tile(grid)
        n = len(st.session_state.move_log) + 1
        st.session_state.move_log.append(
            f"Move {n}: {actor} → {ACTION_NAMES[move]}"
        )
        st.session_state.hint_dir = None   # clear stale hint
        if is_game_over(grid):
            st.session_state.game_over = True
        return True
    return False

# ── Render board ──────────────────────────────────────────────────────────────
mode_label = {
    "Human Play":        "D-pad · keyboard arrows · swipe",
    "AI Watch":          "AI is playing…" if not st.session_state.game_over else "Game over!",
    "Human + AI Assist": (
        "AI has taken over!" if st.session_state.ai_took_over
        else "Your turn — D-pad · arrows · swipe"
    ),
}
render_board(
    grid, score,
    label=mode_label.get(mode, ""),
    hint_dir=st.session_state.get("hint_dir"),
)

# ── Move log ──────────────────────────────────────────────────────────────────
if st.session_state.move_log:
    with st.expander(f"Move log ({len(st.session_state.move_log)} moves)", expanded=False):
        st.text("\n".join(st.session_state.move_log[-40:]))

# ── Game over ─────────────────────────────────────────────────────────────────
if st.session_state.game_over:
    snapshot("Final board")
    save_completed_game()
    st.error(
        f"Game Over! 🏁  Max tile: **{grid.getMaxTile()}**  |  Score: **{score}**"
        + ("  🏆 You reached 2048!" if grid.getMaxTile() >= 2048 else "")
    )
    if st.button("Play Again"):
        init_state(mode)
    st.stop()

# ─────────────────────────────────────────────────────────────────────────────
# HUMAN INPUT — shared across Human Play + Human + AI Assist (human phase)
# Reads swipe/keyboard move from query params, then shows D-pad
# ─────────────────────────────────────────────────────────────────────────────
def human_controls(key_prefix="h", show_hint_btn=False, show_takeover_btn=False):
    """
    Injects swipe/keyboard JS, reads any pending move from query params,
    renders D-pad. Returns True if a move was executed.
    """
    inject_controls()

    moved = False

    # 1. Swipe / keyboard move (arrives via query param)
    qp_move = read_swipe_move()
    if qp_move is not None and not st.session_state.game_over:
        if execute_move(qp_move, "Human"):
            moved = True
            st.rerun()

    # 2. D-pad (clicks go through ?move= query param, same as swipe/keyboard)
    hint = st.session_state.get("hint_dir")
    dpad(hint_dir=hint, key_prefix=key_prefix)

    # 3. Undo button
    undo_col, *extra_cols = st.columns(
        [1, 1, 1] if (show_hint_btn or show_takeover_btn) else [1, 2]
    )
    with undo_col:
        if st.button("↩ Undo", use_container_width=True,
                     disabled=len(st.session_state.undo_stack) == 0):
            if st.session_state.undo_stack:
                prev_map, prev_score, prev_log = st.session_state.undo_stack.pop()
                grid.map = prev_map
                st.session_state.score    = prev_score
                st.session_state.move_log = prev_log
                st.session_state.hint_dir = None
                st.rerun()

    if show_hint_btn and len(extra_cols) >= 1:
        with extra_cols[0]:
            if st.button("💡 Hint", use_container_width=True):
                st.session_state.hint_dir = active_agent.getMove(grid.clone())
                st.rerun()

    if show_takeover_btn and len(extra_cols) >= 2:
        with extra_cols[1]:
            if st.button("🤖 AI takes over", use_container_width=True):
                st.session_state.ai_took_over = True
                st.session_state.ai_running   = True
                st.rerun()

    return moved

# ─────────────────────────────────────────────────────────────────────────────
# MODE: HUMAN PLAY
# ─────────────────────────────────────────────────────────────────────────────
if mode == "Human Play":
    human_controls(key_prefix="hp")

# ─────────────────────────────────────────────────────────────────────────────
# MODE: AI WATCH
# ─────────────────────────────────────────────────────────────────────────────
elif mode == "AI Watch":
    col_start, col_stop = st.columns(2)
    if col_start.button("▶ Start / Step", use_container_width=True):
        st.session_state.ai_running = True
    if col_stop.button("⏸ Pause", use_container_width=True):
        st.session_state.ai_running = False

    if st.session_state.ai_running and not st.session_state.game_over:
        move = active_agent.getMove(grid.clone())
        if move is not None and grid.canMove([move]):
            execute_move(move, f"AI({ai_strategy})")
        else:
            st.session_state.game_over  = True
            st.session_state.ai_running = False
        time.sleep(ai_speed)
        st.rerun()
    elif not st.session_state.ai_running:
        st.info("Press **▶ Start / Step** to watch the AI play.")

# ─────────────────────────────────────────────────────────────────────────────
# MODE: HUMAN + AI ASSIST
# ─────────────────────────────────────────────────────────────────────────────
elif mode == "Human + AI Assist":
    if not st.session_state.ai_took_over:
        human_controls(
            key_prefix="ha",
            show_hint_btn=True,
            show_takeover_btn=True,
        )
    else:
        col_cont, col_pause, col_reclaim = st.columns(3)
        if col_cont.button("▶ Continue",   use_container_width=True):
            st.session_state.ai_running = True
        if col_pause.button("⏸ Pause AI",  use_container_width=True):
            st.session_state.ai_running = False
        if col_reclaim.button("🙋 I'll play", use_container_width=True):
            st.session_state.ai_took_over = False
            st.session_state.ai_running   = False
            st.rerun()

        if st.session_state.ai_running and not st.session_state.game_over:
            move = active_agent.getMove(grid.clone())
            if move is not None and grid.canMove([move]):
                execute_move(move, f"AI({ai_strategy})")
            else:
                st.session_state.game_over  = True
                st.session_state.ai_running = False
            time.sleep(ai_speed)
            st.rerun()
