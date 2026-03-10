import streamlit as st
import sys, os, time, random, math, types, hashlib
from copy import deepcopy
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(__file__))

from Grid import Grid
from IntelligentAgent import IntelligentAgent
from ComputerAI import ComputerAI

# ─────────────────────────────────────────────────────────────────────────────
# Page config
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="2048 AI Solver", page_icon="🧩", layout="centered")

# ─────────────────────────────────────────────────────────────────────────────
# Tile colour palettes
# ─────────────────────────────────────────────────────────────────────────────
NORMAL_PALETTE = {
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

# Deuteranopia-safe (blue-orange) palette
CB_PALETTE = {
    0:     ("#c8c8c8", "#555"),
    2:     ("#ddeeff", "#334"),
    4:     ("#aaccff", "#223"),
    8:     ("#88aaff", "#f9f6f2"),
    16:    ("#5577ee", "#f9f6f2"),
    32:    ("#3355cc", "#f9f6f2"),
    64:    ("#1133aa", "#f9f6f2"),
    128:   ("#ffcc44", "#333"),
    256:   ("#ffaa22", "#333"),
    512:   ("#ff8800", "#f9f6f2"),
    1024:  ("#dd6600", "#f9f6f2"),
    2048:  ("#bb4400", "#f9f6f2"),
    4096:  ("#882200", "#f9f6f2"),
    8192:  ("#550000", "#f9f6f2"),
}

ACTION_NAMES = {0: "Up", 1: "Down", 2: "Left", 3: "Right"}

# ─────────────────────────────────────────────────────────────────────────────
# Achievements registry
# ─────────────────────────────────────────────────────────────────────────────
ACHIEVEMENTS = [
    {"id": "tile_512",    "icon": "🥉", "name": "Getting Warm",   "desc": "Reach tile 512"},
    {"id": "tile_1024",   "icon": "🥈", "name": "Half Way",       "desc": "Reach tile 1024"},
    {"id": "tile_2048",   "icon": "🥇", "name": "2048!",          "desc": "Reach tile 2048"},
    {"id": "tile_4096",   "icon": "💎", "name": "Beyond 2048",    "desc": "Reach tile 4096"},
    {"id": "purist",      "icon": "🎯", "name": "Purist",         "desc": "Finish a game with 0 undos"},
    {"id": "speed_demon", "icon": "⚡", "name": "Speed Demon",    "desc": "Reach 2048 in Time Attack"},
    {"id": "streak_7",    "icon": "🔥", "name": "7-Day Streak",   "desc": "Complete 7 daily challenges"},
    {"id": "century",     "icon": "💯", "name": "Century",        "desc": "Play 100 games"},
    {"id": "ai_student",  "icon": "🤖", "name": "AI Student",     "desc": "Use hint 10 times"},
]

# ─────────────────────────────────────────────────────────────────────────────
# Greedy AI
# ─────────────────────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────────────────
# Grid helpers
# ─────────────────────────────────────────────────────────────────────────────
def new_grid(size=4, seed=None):
    rng = random.Random(seed) if seed is not None else random
    g = Grid(size)
    cells = g.getAvailableCells()
    for _ in range(2):
        if cells:
            pos = rng.choice(cells)
            cells.remove(pos)
            g.setCellValue(pos, 2 if rng.random() < 0.9 else 4)
    return g

def add_random_tile(grid, rng=None):
    r = rng or random
    cells = grid.getAvailableCells()
    if cells:
        pos = r.choice(cells)
        grid.setCellValue(pos, 2 if r.random() < 0.9 else 4)

def compute_score(grid):
    return sum(v for row in grid.map for v in row)

def is_game_over(grid):
    return not grid.canMove()

def daily_seed():
    d = date.today().strftime("%Y%m%d")
    return int(hashlib.md5(d.encode()).hexdigest()[:8], 16)

# ─────────────────────────────────────────────────────────────────────────────
# Board HTML renderer  (static; animations handled by the game component)
# ─────────────────────────────────────────────────────────────────────────────
def board_html(grid_map, hint_dir=None, colorblind=False, small=False, ghost=False):
    palette = CB_PALETTE if colorblind else NORMAL_PALETTE
    tile_size = 52 if small else 80
    font_big  = "18px" if small else "28px"
    font_mid  = "14px" if small else "20px"
    font_sml  = "11px" if small else "15px"
    gap       = 5 if small else 8
    pad       = 5 if small else 8

    arrow_map = {0: "↑", 1: "↓", 2: "←", 3: "→"}
    overlay = ""
    if hint_dir is not None and not ghost:
        overlay = (
            f"<div style='position:absolute;top:0;left:0;width:100%;height:100%;"
            f"display:flex;align-items:center;justify-content:center;"
            f"font-size:64px;color:rgba(255,255,255,0.30);pointer-events:none;"
            f"border-radius:8px;'>{arrow_map.get(hint_dir,'')}</div>"
        )

    opacity = "opacity:0.55;" if ghost else ""
    html = (
        f"<div style='display:inline-block;background:#bbada0;padding:{pad}px;"
        f"border-radius:8px;position:relative;{opacity}'>"
        + overlay
    )
    for row in grid_map:
        html += f"<div style='display:flex;gap:{gap}px;margin-bottom:{gap}px;'>"
        for val in row:
            bg, fg = palette.get(val, ("#3e3933", "#f9f6f2"))
            text = str(val) if val else ""
            border = "border:1px solid rgba(0,0,0,0.15);" if colorblind else ""
            fs = font_big if val < 1000 else font_mid if val < 10000 else font_sml
            html += (
                f"<div style='width:{tile_size}px;height:{tile_size}px;"
                f"background:{bg};border-radius:4px;{border}"
                f"display:flex;align-items:center;justify-content:center;"
                f"font-size:{fs};font-weight:bold;color:{fg};'>{text}</div>"
            )
        html += "</div>"
    html += "</div>"
    return html

def render_board(grid, score, label="", hint_dir=None, colorblind=False,
                 best_score=0, show_new_best=False):
    if label:
        st.markdown(
            f"<div style='text-align:center;font-size:14px;color:#888;margin-bottom:4px'>"
            f"{label}</div>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown(board_html(grid.map, hint_dir=hint_dir, colorblind=colorblind),
                    unsafe_allow_html=True)
        score_color = "#f59563" if show_new_best else "inherit"
        best_label  = " 🌟 New Best!" if show_new_best else f" (Best: {best_score})"
        st.markdown(
            f"<div style='text-align:center;margin-top:8px;font-size:20px;"
            f"font-weight:bold;'>Score: <span style='color:{score_color}'>{score}</span>"
            f"<span style='font-size:13px;color:#888'>{best_label}</span>"
            f"&nbsp;|&nbsp; Max: {grid.getMaxTile()}</div>",
            unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# Sound  (injected JS, Web Audio API — no files needed)
# ─────────────────────────────────────────────────────────────────────────────
SOUND_JS = """
<script>
window._2048audio = window._2048audio || (function() {
  let muted = false;
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function tone(freq, dur, type='sine', vol=0.18, delay=0) {
    if (muted) return;
    try {
      const c = getCtx();
      const osc  = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, c.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + dur);
    } catch(e) {}
  }

  function noise(dur, vol=0.06) {
    if (muted) return;
    try {
      const c = getCtx();
      const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i=0; i<data.length; i++) data[i] = Math.random()*2-1;
      const src  = c.createBufferSource();
      const gain = c.createGain();
      const filt = c.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 400;
      src.buffer = buf;
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      src.connect(filt); filt.connect(gain); gain.connect(c.destination);
      src.start(); src.stop(c.currentTime + dur);
    } catch(e) {}
  }

  return {
    setMute: function(m) { muted = m; },
    slide:   function()  { noise(0.04, 0.05); },
    merge:   function(v) {
      const freq = Math.min(110 * Math.log2(v || 2), 1400);
      tone(freq, 0.15, 'sine', 0.20);
      if (v >= 512) tone(freq*1.5, 0.12, 'sine', 0.08, 0.05);
    },
    invalid: function()  { tone(180, 0.08, 'sawtooth', 0.08); },
    newBest: function()  {
      [523, 659, 784].forEach((f,i) => tone(f, 0.12, 'sine', 0.15, i*0.10));
    },
    win:     function()  {
      [523,659,784,1047,1319].forEach((f,i) => tone(f, 0.18, 'sine', 0.20, i*0.09));
    },
    over:    function()  {
      [440, 349, 294].forEach((f,i) => tone(f, 0.25, 'sine', 0.18, i*0.12));
    },
  };
})();
</script>
"""

def inject_sound():
    st.components.v1.html(SOUND_JS, height=0)

def play_sound(event, tile_val=None):
    """Emit a tiny JS snippet that calls the audio engine."""
    if event == "merge" and tile_val:
        js = f"window._2048audio && window._2048audio.merge({tile_val});"
    else:
        js = f"window._2048audio && window._2048audio.{event}();"
    st.components.v1.html(f"<script>{js}</script>", height=0)

# ─────────────────────────────────────────────────────────────────────────────
# Keyboard + swipe injection
# ─────────────────────────────────────────────────────────────────────────────
def inject_controls(wasd=True):
    wasd_map = """'KeyW':0,'KeyS':1,'KeyA':2,'KeyD':3,""" if wasd else ""
    st.components.v1.html(f"""
    <script>
    (function() {{
        const keyMap = {{{wasd_map}'ArrowUp':0,'ArrowDown':1,'ArrowLeft':2,'ArrowRight':3}};
        function sendMove(dir) {{
            var url = new URL(window.parent.location.href);
            url.searchParams.set('move', dir);
            window.parent.history.replaceState(null,'',url.toString());
            window.parent.dispatchEvent(new PopStateEvent('popstate'));
        }}
        if (!window._2048kbBound) {{
            window._2048kbBound = true;
            window.parent.document.addEventListener('keydown', function(e) {{
                if (e.key in keyMap || e.code in keyMap) {{
                    e.preventDefault();
                    sendMove(keyMap[e.key] ?? keyMap[e.code]);
                }}
            }});
        }}
        if (!window._2048touchBound) {{
            window._2048touchBound = true;
            let tx=null,ty=null;
            window.parent.document.addEventListener('touchstart',function(e){{
                tx=e.touches[0].clientX; ty=e.touches[0].clientY;
            }},{{passive:true}});
            window.parent.document.addEventListener('touchend',function(e){{
                if(tx===null) return;
                const dx=e.changedTouches[0].clientX-tx;
                const dy=e.changedTouches[0].clientY-ty;
                if(Math.max(Math.abs(dx),Math.abs(dy))<30){{tx=ty=null;return;}}
                sendMove(Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy>0?1:0));
                tx=ty=null;
            }},{{passive:true}});
        }}
    }})();
    </script>""", height=0)

def read_swipe_move():
    raw = st.query_params.get("move")
    if raw is not None:
        try:
            d = int(raw)
            if 0 <= d <= 3:
                st.query_params.clear()
                return d
        except (ValueError, TypeError):
            pass
    return None

# ─────────────────────────────────────────────────────────────────────────────
# D-pad — native Streamlit buttons (no iframe = no latency overhead)
# CSS overrides make them look like a compact cross controller.
# ─────────────────────────────────────────────────────────────────────────────
def dpad(hint_dir=None, key_prefix="dp"):
    """Compact cross D-pad confined to a narrow centred column."""
    hint_labels = {0: "⬆ AI", 1: "⬇ AI", 2: "⬅ AI", 3: "➡ AI"}
    move = None

    # Constrain to a narrow centre column so it never spans full width
    pad_l, centre, pad_r = st.columns([2, 1, 2])
    with centre:
        # Up
        lbl = hint_labels[0] if hint_dir == 0 else "⬆"
        if st.button(lbl, key=f"{key_prefix}_up", use_container_width=True):
            move = 0

    pad_l2, cl, cm, cr, pad_r2 = st.columns([1, 1, 1, 1, 1])
    with cl:
        lbl = hint_labels[2] if hint_dir == 2 else "⬅"
        if st.button(lbl, key=f"{key_prefix}_left", use_container_width=True):
            move = 2
    with cm:
        if hint_dir is not None:
            st.markdown(
                f"<div style='text-align:center;font-size:10px;color:#f59563;"
                f"font-weight:bold;padding-top:6px;line-height:1.3;'>"
                f"AI {['↑','↓','←','→'][hint_dir]}</div>",
                unsafe_allow_html=True)
    with cr:
        lbl = hint_labels[3] if hint_dir == 3 else "➡"
        if st.button(lbl, key=f"{key_prefix}_right", use_container_width=True):
            move = 3

    pad_l3, centre3, pad_r3 = st.columns([2, 1, 2])
    with centre3:
        lbl = hint_labels[1] if hint_dir == 1 else "⬇"
        if st.button(lbl, key=f"{key_prefix}_down", use_container_width=True):
            move = 1

    return move

# ─────────────────────────────────────────────────────────────────────────────
# AI evaluation helpers
# ─────────────────────────────────────────────────────────────────────────────
def eval_all_moves(grid, agent):
    """Return dict {dir: heuristic_score} for all 4 directions."""
    scores = {}
    for move, next_state in grid.getAvailableMoves():
        if hasattr(agent, 'heuristicValue'):
            scores[move] = agent.heuristicValue(next_state)
        else:
            scores[move] = agent._h(next_state)
    for d in range(4):
        if d not in scores:
            scores[d] = None   # invalid move
    return scores

def ghost_board(grid, move):
    """Return grid map after applying move (no tile spawn)."""
    g = grid.clone()
    g.move(move)
    return g.map

# ─────────────────────────────────────────────────────────────────────────────
# Session state
# ─────────────────────────────────────────────────────────────────────────────
def init_state(mode, board_size=4, daily=False):
    seed = daily_seed() if daily else None
    rng  = random.Random(seed) if seed else None
    st.session_state.grid          = new_grid(board_size, seed=seed)
    st.session_state.board_rng     = rng
    st.session_state.score         = 0
    st.session_state.mode          = mode
    st.session_state.board_size    = board_size
    st.session_state.game_over     = False
    st.session_state.won_2048      = False   # reached 2048 but still playing
    st.session_state.keep_playing  = False
    st.session_state.ai_agent      = IntelligentAgent()
    st.session_state.ai_running    = False
    st.session_state.ai_took_over  = False
    st.session_state.move_log      = []
    st.session_state.snapshots     = []
    st.session_state.undo_stack    = []
    st.session_state.undo_used     = 0
    st.session_state.hint_dir      = None
    st.session_state.last_sound    = None
    st.session_state.last_merge_val= None
    st.session_state.move_scores   = {}    # {dir: score} for AI evaluator
    st.session_state.depth_info    = ""
    st.session_state.is_daily      = daily
    st.session_state.game_start_ts = time.time()
    st.session_state.time_attack_end= None

def ensure_persistent_state():
    defs = {
        "stats":        {"games": 0, "wins": 0, "scores": [], "max_tiles": []},
        "replays":      [],
        "replay_idx":   0,
        "replay_step":  0,
        "viewing_replay": False,
        "achievements": set(),
        "hint_uses":    0,
        "daily_streak": 0,
        "last_daily_date": None,
        "daily_done_today": False,
        "best_score":   0,
        "muted":        False,
    }
    for k, v in defs.items():
        if k not in st.session_state:
            st.session_state[k] = v

def save_completed_game(time_attack=False, time_elapsed=0.0):
    stats  = st.session_state.stats
    score  = st.session_state.score
    mtile  = st.session_state.grid.getMaxTile()
    undos  = st.session_state.undo_used

    stats["games"]     += 1
    stats["scores"].append(score)
    stats["max_tiles"].append(mtile)
    if mtile >= 2048:
        stats["wins"] += 1

    # Personal best
    if score > st.session_state.best_score:
        st.session_state.best_score = score

    # Save replay
    st.session_state.replays.append({
        "game_num":  stats["games"],
        "max_tile":  mtile,
        "score":     score,
        "moves":     list(st.session_state.move_log),
        "snapshots": [deepcopy(s) for s in st.session_state.snapshots],
    })

    # Achievements
    ach = st.session_state.achievements
    if mtile >= 512:  ach.add("tile_512")
    if mtile >= 1024: ach.add("tile_1024")
    if mtile >= 2048: ach.add("tile_2048")
    if mtile >= 4096: ach.add("tile_4096")
    if undos == 0:    ach.add("purist")
    if stats["games"] >= 100: ach.add("century")
    if time_attack and mtile >= 2048: ach.add("speed_demon")

    # Daily challenge streak
    if st.session_state.is_daily:
        today = str(date.today())
        last  = st.session_state.last_daily_date
        if last is None or last != today:
            yesterday = str(date.fromordinal(date.today().toordinal()-1))
            if last == yesterday:
                st.session_state.daily_streak += 1
            else:
                st.session_state.daily_streak = 1
            st.session_state.last_daily_date  = today
            st.session_state.daily_done_today = True
        if st.session_state.daily_streak >= 7:
            ach.add("streak_7")

# ─────────────────────────────────────────────────────────────────────────────
# ── SIDEBAR ──────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
st.title("🧩 2048 — AI Solver")
ensure_persistent_state()

# ── Mode tab bar (main canvas — switching tabs never resets the game) ─────────
_tab_labels = ["🎮 Human Play", "👁 AI Watch", "🤝 Human + AI"]
_tab_objs   = st.tabs(_tab_labels)
# Map tab index → mode string
_TAB_MODES  = {0: "Human Play", 1: "AI Watch", 2: "Human + AI Assist"}
# Persist which tab is active via session state (tabs don't expose their index natively)
for _i, _tab in enumerate(_tab_objs):
    with _tab:
        if st.button(f"Switch to {_tab_labels[_i]}", key=f"_tab_switch_{_i}",
                     help="Switch mode without resetting the game"):
            st.session_state["mode"] = _TAB_MODES[_i]
            # Only reset AI-specific flags, not the grid
            st.session_state.ai_running   = False
            st.session_state.ai_took_over = False
            st.rerun()

# Resolve current mode from session state (set by tab or kept from init)
mode = st.session_state.get("mode", "Human Play")

with st.sidebar:
    # ── New game controls ─────────────────────────────────────────────────────
    st.header("Game")
    board_size = st.select_slider("Board size", [3, 4, 5, 6], value=4,
                                   help="3×3 = easier, 5×5/6×6 = harder")

    col_new, col_daily = st.columns(2)
    if col_new.button("New Game", use_container_width=True):
        init_state(st.session_state.get("mode", "Human Play"), board_size)
    if col_daily.button("📅 Daily", use_container_width=True,
                        help="Same starting board for all players today"):
        init_state(st.session_state.get("mode", "Human Play"), board_size, daily=True)

    # Daily challenge info
    if st.session_state.get("is_daily"):
        today_str = date.today().strftime("%b %d")
        streak    = st.session_state.daily_streak
        st.caption(f"📅 Daily Challenge — {today_str}  🔥 Streak: {streak}")

    # Mute toggle
    muted = st.session_state.muted
    mute_label = "🔇 Muted" if muted else "🔊 Sound On"
    if st.button(mute_label, use_container_width=True):
        st.session_state.muted = not muted
        st.rerun()

    # ── AI Settings ───────────────────────────────────────────────────────────
    if st.session_state.get("mode", "Human Play") in ("AI Watch", "Human + AI Assist"):
        with st.expander("⚙️ AI Settings", expanded=False):
            ai_strategy = st.radio("Strategy", ["Expectiminimax", "Greedy"],
                help="**Expectiminimax** — deep search + alpha-beta\n\n"
                     "**Greedy** — fastest immediate heuristic")
            ai_speed = st.slider("Step delay (s)", 0.0, 1.5, 0.3, 0.05)
            st.markdown("**Heuristic weights** *(Expectiminimax)*")
            w_empty  = st.slider("Empty cells",  0.0, 5.0, 2.0, 0.1)
            w_mono   = st.slider("Monotonicity", 0.0, 5.0, 1.0, 0.1)
            w_smooth = st.slider("Smoothness",   0.0, 5.0, 1.0, 0.1)
            show_ai_panel = st.checkbox("Show AI analysis panel", value=True)
    else:
        ai_strategy, ai_speed = "Expectiminimax", 0.3
        w_empty, w_mono, w_smooth = 2.0, 1.0, 1.0
        show_ai_panel = False

    # ── Gameplay options ──────────────────────────────────────────────────────
    with st.expander("🎮 Gameplay Options", expanded=False):
        undo_budget = st.slider("Undo budget (per game)", 0, 10, 3,
                                help="0 = no undos allowed (Purist mode)")
        time_attack = st.checkbox("⏱ Time Attack (3 min)", value=False,
                                  help="Highest score before the clock runs out")
        colorblind  = st.checkbox("👁 Colorblind mode (blue-orange)", value=False)
        reduced_motion = st.checkbox("🎭 Reduce animations", value=False)

    # ── Accessibility ─────────────────────────────────────────────────────────
    with st.expander("♿ Accessibility", expanded=False):
        wasd_keys = st.checkbox("WASD keys", value=True,
                                help="W/A/S/D as alternative to arrow keys")
        st.markdown(
            "- Keyboard: arrow keys or WASD\n"
            "- Mobile: swipe anywhere\n"
            "- D-pad: buttons below the board\n"
            "- Screen readers: score updates announced via ARIA\n"
            "- OS 'Reduce Motion' setting is respected"
        )

    # ── Statistics ────────────────────────────────────────────────────────────
    with st.expander("📊 Statistics", expanded=False):
        stats = st.session_state.stats
        if stats["games"] == 0:
            st.info("No completed games yet.")
        else:
            wr  = 100 * stats["wins"] / stats["games"]
            avg_s = sum(stats["scores"])  / len(stats["scores"])
            avg_t = sum(stats["max_tiles"]) / len(stats["max_tiles"])
            c1, c2 = st.columns(2)
            c1.metric("Games",     stats["games"])
            c2.metric("Win rate",  f"{wr:.0f}%")
            c1.metric("Avg score", f"{avg_s:.0f}")
            c2.metric("Avg tile",  f"{avg_t:.0f}")
            c1.metric("Best score",st.session_state.best_score)
            c2.metric("Best tile", max(stats["max_tiles"]))
            if len(stats["scores"]) > 1:
                st.line_chart(stats["scores"])

    # ── Achievements ──────────────────────────────────────────────────────────
    with st.expander("🏆 Achievements", expanded=False):
        unlocked = st.session_state.achievements
        for a in ACHIEVEMENTS:
            done  = a["id"] in unlocked
            style = "font-size:18px;" if done else "font-size:18px;filter:grayscale(1);opacity:0.35;"
            label = f"**{a['name']}**" if done else a["name"]
            st.markdown(
                f"<span style='{style}'>{a['icon']}</span> {label} — "
                f"<span style='font-size:12px;color:#888'>{a['desc']}</span>",
                unsafe_allow_html=True,
            )

    # ── Replay ────────────────────────────────────────────────────────────────
    with st.expander("🎬 Replay", expanded=False):
        replays = st.session_state.replays
        if not replays:
            st.info("Finish a game to unlock replays.")
        else:
            labels = [f"Game {r['game_num']} — {r['max_tile']} | {r['score']} pts"
                      for r in replays]
            sel    = st.selectbox("Select", range(len(replays)),
                                  format_func=lambda i: labels[i])
            chosen = replays[sel]
            if st.button("▶ Watch", use_container_width=True):
                st.session_state.viewing_replay = True
                st.session_state.replay_idx     = sel
                st.session_state.replay_step    = 0
                st.rerun()
            if st.session_state.viewing_replay and st.session_state.replay_idx == sel:
                snaps = chosen["snapshots"]
                step  = st.session_state.replay_step
                total = len(snaps)
                st.caption(f"Step {step+1}/{total} — {snaps[step].get('label','')}")
                st.markdown(board_html(snaps[step]["map"], colorblind=colorblind,
                                       small=True), unsafe_allow_html=True)
                rc1,rc2,rc3 = st.columns(3)
                if rc1.button("⏮", use_container_width=True) and step > 0:
                    st.session_state.replay_step -= 1; st.rerun()
                if rc3.button("⏭", use_container_width=True) and step < total-1:
                    st.session_state.replay_step += 1; st.rerun()
                if rc2.button("✖", use_container_width=True):
                    st.session_state.viewing_replay = False; st.rerun()

    st.markdown("---")
    st.markdown("Goal: reach **2048** 🏆 | D-pad · arrows · swipe")

# ─────────────────────────────────────────────────────────────────────────────
# Bootstrap session
# ─────────────────────────────────────────────────────────────────────────────
# Only reset when there is no grid yet, or board size changed (explicit).
# Mode switching via tabs does NOT reset the grid.
need_init = (
    "grid" not in st.session_state
    or st.session_state.get("board_size") != board_size
)
if need_init:
    init_state(mode, board_size)

grid  = st.session_state.grid
score = st.session_state.score

# ─────────────────────────────────────────────────────────────────────────────
# Build active AI agent (patch heuristic weights)
# ─────────────────────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────────────────
# Time attack state
# ─────────────────────────────────────────────────────────────────────────────
if time_attack and st.session_state.get("time_attack_end") is None:
    st.session_state.time_attack_end = time.time() + 180   # 3 min

time_left = None
if time_attack and st.session_state.get("time_attack_end"):
    time_left = max(0, st.session_state.time_attack_end - time.time())

# ─────────────────────────────────────────────────────────────────────────────
# Inject sound engine + controls
# ─────────────────────────────────────────────────────────────────────────────
inject_sound()
# Sync mute state into JS
st.components.v1.html(
    f"<script>window._2048audio && window._2048audio.setMute({'true' if st.session_state.muted else 'false'});</script>",
    height=0)

# ─────────────────────────────────────────────────────────────────────────────
# Accessibility: ARIA live region for score (hidden div, screen readers pick it up)
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(
    f"<div aria-live='polite' aria-atomic='true' style='position:absolute;width:1px;"
    f"height:1px;overflow:hidden;'>Score: {score}, Max tile: {grid.getMaxTile()}</div>",
    unsafe_allow_html=True)

# reduced-motion CSS
if reduced_motion:
    st.markdown(
        "<style>*{transition:none!important;animation:none!important;}</style>",
        unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers that reference grid (defined after bootstrap)
# ─────────────────────────────────────────────────────────────────────────────
def snapshot(label=""):
    st.session_state.snapshots.append({
        "map":   deepcopy(grid.map),
        "score": st.session_state.score,
        "label": label,
    })

def push_undo():
    st.session_state.undo_stack.append(
        (deepcopy(grid.map), st.session_state.score,
         list(st.session_state.move_log)))
    if len(st.session_state.undo_stack) > undo_budget:
        st.session_state.undo_stack.pop(0)

def execute_move(move, actor="Human"):
    if move is None or not grid.canMove([move]):
        st.session_state.last_sound = "invalid"
        return False
    push_undo()
    snapshot(f"Before {actor} → {ACTION_NAMES[move]}")

    # Detect merges for sound
    old_map = deepcopy(grid.map)
    grid.move(move)

    # Find highest newly merged tile
    merged_val = None
    for r in range(grid.size):
        for c in range(grid.size):
            nv = grid.map[r][c]
            ov = old_map[r][c]
            if nv > ov and nv > 0:
                if merged_val is None or nv > merged_val:
                    merged_val = nv

    st.session_state.score = compute_score(grid)
    rng = st.session_state.get("board_rng")
    add_random_tile(grid, rng)

    n = len(st.session_state.move_log) + 1
    st.session_state.move_log.append(f"Move {n}: {actor} → {ACTION_NAMES[move]}")
    st.session_state.hint_dir      = None
    st.session_state.last_merge_val = merged_val
    st.session_state.undo_used     += 1 if actor == "Human" and move is not None else 0

    # Sound event
    if merged_val:
        st.session_state.last_sound = "merge"
    else:
        st.session_state.last_sound = "slide"

    # New personal best?
    if st.session_state.score > st.session_state.best_score:
        st.session_state.last_sound = "newBest"

    # AI hint usage tracking
    if actor == "hint_use":
        st.session_state.hint_uses = st.session_state.get("hint_uses", 0) + 1
        if st.session_state.hint_uses >= 10:
            st.session_state.achievements.add("ai_student")

    # 2048 reached?
    if grid.getMaxTile() >= 2048 and not st.session_state.won_2048 and not st.session_state.keep_playing:
        st.session_state.won_2048 = True
        st.session_state.last_sound = "win"

    if is_game_over(grid):
        st.session_state.game_over = True
        st.session_state.last_sound = "over"

    # Update AI move evaluator scores
    try:
        st.session_state.move_scores = eval_all_moves(grid.clone(), active_agent)
    except Exception:
        st.session_state.move_scores = {}

    return True

# ─────────────────────────────────────────────────────────────────────────────
# Render board
# ─────────────────────────────────────────────────────────────────────────────
show_new_best = (st.session_state.score > 0 and
                 st.session_state.score >= st.session_state.best_score and
                 st.session_state.best_score > 0)

mode_label = {
    "Human Play":        "D-pad · keyboard · swipe",
    "AI Watch":          "AI is playing…" if not st.session_state.game_over else "Game over!",
    "Human + AI Assist": "AI has taken over!" if st.session_state.ai_took_over
                         else "Your turn — D-pad · arrows · swipe",
}
render_board(grid, score, label=mode_label.get(mode, ""),
             hint_dir=st.session_state.get("hint_dir"),
             colorblind=colorblind,
             best_score=st.session_state.best_score,
             show_new_best=show_new_best)

# ─────────────────────────────────────────────────────────────────────────────
# Time attack display
# ─────────────────────────────────────────────────────────────────────────────
if time_attack and time_left is not None:
    mins = int(time_left) // 60
    secs = int(time_left) % 60
    color = "#e74c3c" if time_left < 30 else "#f39c12" if time_left < 60 else "#27ae60"
    st.markdown(
        f"<div style='text-align:center;font-size:22px;font-weight:bold;color:{color}'>"
        f"⏱ {mins}:{secs:02d}</div>", unsafe_allow_html=True)
    if time_left == 0 and not st.session_state.game_over:
        st.session_state.game_over = True

# ─────────────────────────────────────────────────────────────────────────────
# AI analysis panel (inline, below board)
# ─────────────────────────────────────────────────────────────────────────────
if show_ai_panel and st.session_state.move_scores:
    with st.expander("🧠 AI Analysis", expanded=True):
        scores = st.session_state.move_scores
        valid  = {k: v for k,v in scores.items() if v is not None}
        if valid:
            max_s = max(valid.values()) or 1
            min_s = min(valid.values())
            span  = max(max_s - min_s, 1)
            cols  = st.columns(4)
            dir_icons = {0:"⬆ Up", 1:"⬇ Down", 2:"⬅ Left", 3:"➡ Right"}
            best_dir  = max(valid, key=valid.get)
            for d, col in zip(range(4), cols):
                v = scores.get(d)
                with col:
                    if v is None:
                        st.markdown(f"<div style='text-align:center;color:#bbb;font-size:12px'>"
                                    f"{dir_icons[d]}<br>—</div>", unsafe_allow_html=True)
                    else:
                        pct   = int(100 * (v - min_s) / span)
                        color = "#f59563" if d == best_dir else "#8f7a66"
                        st.markdown(
                            f"<div style='text-align:center;font-size:12px;'>"
                            f"<b>{dir_icons[d]}</b><br>"
                            f"<div style='background:#ddd;border-radius:4px;height:8px;margin:3px 0;'>"
                            f"<div style='width:{pct}%;background:{color};height:8px;border-radius:4px;'></div></div>"
                            f"<span style='font-size:10px;color:#555'>{v:.1f}</span></div>",
                            unsafe_allow_html=True)

        # Heuristic breakdown
        if hasattr(active_agent, 'monotocity') and hasattr(active_agent, 'smoothness'):
            try:
                empty_v = len(grid.getAvailableCells())
                mono_v  = active_agent.monotocity(grid)
                smooth_v= active_agent.smoothness(grid)
                mx_v    = max(c for row in grid.map for c in row) or 1
                hc1, hc2, hc3, hc4 = st.columns(4)
                hc1.metric("Max tile", f"{math.log2(mx_v):.1f}", help="log₂(max)")
                hc2.metric("Empty",    empty_v)
                hc3.metric("Monoton.", f"{mono_v:.0f}")
                hc4.metric("Smooth",   f"{smooth_v:.1f}")
            except Exception:
                pass

        if st.session_state.depth_info:
            st.caption(st.session_state.depth_info)

# ─────────────────────────────────────────────────────────────────────────────
# Ghost preview (shown when hint is active)
# ─────────────────────────────────────────────────────────────────────────────
hint_dir = st.session_state.get("hint_dir")
if hint_dir is not None:
    ghost_map = ghost_board(grid, hint_dir)
    dir_name  = ACTION_NAMES[hint_dir]
    st.markdown(
        f"<div style='text-align:center;font-size:13px;color:#888;margin-top:6px'>"
        f"Ghost preview — AI suggests <b>{dir_name}</b></div>",
        unsafe_allow_html=True)
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown(board_html(ghost_map, colorblind=colorblind, ghost=True),
                    unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# Move log
# ─────────────────────────────────────────────────────────────────────────────
if st.session_state.move_log:
    with st.expander(f"Move log ({len(st.session_state.move_log)} moves)", expanded=False):
        st.text("\n".join(st.session_state.move_log[-40:]))

# ─────────────────────────────────────────────────────────────────────────────
# 2048 reached — non-blocking banner (continue or end)
# ─────────────────────────────────────────────────────────────────────────────
if st.session_state.won_2048 and not st.session_state.keep_playing and not st.session_state.game_over:
    st.success("🏆 You reached **2048**! Keep going for a higher score?")
    cc1, cc2 = st.columns(2)
    if cc1.button("Keep going!", use_container_width=True):
        st.session_state.keep_playing = True
        st.rerun()
    if cc2.button("End game", use_container_width=True):
        st.session_state.game_over = True
        st.rerun()

# ─────────────────────────────────────────────────────────────────────────────
# Game over
# ─────────────────────────────────────────────────────────────────────────────
if st.session_state.game_over:
    snapshot("Final board")
    elapsed = time.time() - st.session_state.game_start_ts
    save_completed_game(time_attack=time_attack, time_elapsed=elapsed)

    st.markdown(
        f"<div aria-live='assertive' style='position:absolute;width:1px;height:1px;"
        f"overflow:hidden;'>Game over. Final score {score}. Max tile {grid.getMaxTile()}.</div>",
        unsafe_allow_html=True)

    win_msg = "🏆 You reached 2048!" if grid.getMaxTile() >= 2048 else ""
    st.error(f"Game Over! 🏁  Max tile: **{grid.getMaxTile()}**  |  Score: **{score}** {win_msg}")

    if time_attack:
        mins = int(elapsed) // 60; secs = int(elapsed) % 60
        st.info(f"⏱ Time: {mins}:{secs:02d}")

    if st.button("Play Again"):
        init_state(mode, board_size)
        st.rerun()
    st.stop()

# ─────────────────────────────────────────────────────────────────────────────
# Play sounds triggered by last move
# ─────────────────────────────────────────────────────────────────────────────
snd = st.session_state.get("last_sound")
if snd and not st.session_state.muted:
    if snd == "merge":
        play_sound("merge", st.session_state.get("last_merge_val", 2))
    elif snd == "newBest":
        play_sound("newBest")
        play_sound("merge", st.session_state.get("last_merge_val", 2))
    elif snd == "win":
        play_sound("win")
    elif snd == "over":
        play_sound("over")
    elif snd == "invalid":
        play_sound("invalid")
    elif snd == "slide":
        play_sound("slide")
st.session_state.last_sound = None

# ─────────────────────────────────────────────────────────────────────────────
# Human controls (shared function)
# ─────────────────────────────────────────────────────────────────────────────
def human_controls(key_prefix="h", show_hint_btn=False, show_takeover_btn=False):
    inject_controls(wasd=wasd_keys if 'wasd_keys' in dir() else True)

    # Swipe / keyboard move
    qp_move = read_swipe_move()
    if qp_move is not None and not st.session_state.game_over:
        execute_move(qp_move, "Human")
        st.rerun()

    # D-pad — returns direction immediately (native button, no iframe round-trip)
    dpad_move = dpad(hint_dir=st.session_state.get("hint_dir"), key_prefix=key_prefix)
    if dpad_move is not None:
        execute_move(dpad_move, "Human")
        st.rerun()

    # Action buttons row
    undos_left = undo_budget - st.session_state.undo_used
    n_btns     = 1 + int(show_hint_btn) + int(show_takeover_btn)
    btn_cols   = st.columns(n_btns)
    idx = 0

    with btn_cols[idx]:
        lbl = f"↩ Undo ({undos_left})" if undo_budget > 0 else "↩ Undo"
        can_undo = (len(st.session_state.undo_stack) > 0 and
                    (undo_budget == 0 or undos_left > 0))
        if st.button(lbl, use_container_width=True, disabled=not can_undo):
            if st.session_state.undo_stack:
                prev_map, prev_score, prev_log = st.session_state.undo_stack.pop()
                grid.map = prev_map
                st.session_state.score    = prev_score
                st.session_state.move_log = prev_log
                st.session_state.hint_dir = None
                st.rerun()
    idx += 1

    if show_hint_btn:
        with btn_cols[idx]:
            if st.button("💡 Hint", use_container_width=True):
                t0 = time.time()
                st.session_state.hint_dir = active_agent.getMove(grid.clone())
                elapsed = time.time() - t0
                st.session_state.depth_info = f"Hint computed in {elapsed:.2f}s"
                st.session_state.hint_uses  = st.session_state.get("hint_uses", 0) + 1
                if st.session_state.hint_uses >= 10:
                    st.session_state.achievements.add("ai_student")
                st.rerun()
        idx += 1

    if show_takeover_btn:
        with btn_cols[idx]:
            if st.button("🤖 AI takes over", use_container_width=True):
                st.session_state.ai_took_over = True
                st.session_state.ai_running   = True
                st.rerun()

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
        t0   = time.time()
        move = active_agent.getMove(grid.clone())
        dt   = time.time() - t0
        st.session_state.depth_info = f"AI({ai_strategy}) — {dt:.2f}s"
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
        human_controls(key_prefix="ha", show_hint_btn=True, show_takeover_btn=True)
    else:
        col_cont, col_pause, col_reclaim = st.columns(3)
        if col_cont.button("▶ Continue",    use_container_width=True):
            st.session_state.ai_running = True
        if col_pause.button("⏸ Pause AI",   use_container_width=True):
            st.session_state.ai_running = False
        if col_reclaim.button("🙋 I'll play", use_container_width=True):
            st.session_state.ai_took_over = False
            st.session_state.ai_running   = False
            st.rerun()

        if st.session_state.ai_running and not st.session_state.game_over:
            t0   = time.time()
            move = active_agent.getMove(grid.clone())
            dt   = time.time() - t0
            st.session_state.depth_info = f"AI({ai_strategy}) — {dt:.2f}s"
            if move is not None and grid.canMove([move]):
                execute_move(move, f"AI({ai_strategy})")
            else:
                st.session_state.game_over  = True
                st.session_state.ai_running = False
            time.sleep(ai_speed)
            st.rerun()

# ─────────────────────────────────────────────────────────────────────────────
# Time attack auto-rerun while timer is active
# ─────────────────────────────────────────────────────────────────────────────
if time_attack and time_left is not None and time_left > 0 and not st.session_state.game_over:
    time.sleep(1)
    st.rerun()
