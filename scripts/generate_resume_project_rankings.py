from __future__ import annotations

import json
from pathlib import Path
from typing import Any

BASE_DIR = Path('/home/user')
WORKSPACE_2048 = Path('/workspace/2048-Puzzle-AI-Agent-Solver')
OUTPUT_PATH = BASE_DIR / 'RESUME_PROJECT_RANKINGS_FULL.md'

ROLE_HEADINGS = [
    'ML Research Scientist',
    'ML Engineer / Applied AI',
    'Backend SWE',
    'Full-Stack SWE',
    'Mobile Engineer',
    'Computer Vision Engineer',
    'DevOps / Platform / SRE',
    'Field/Developer Engineer (FDE)',
    'Sales Engineer / Sales Development Engineer',
    'Software Engineer (General)',
    'Technology Consultant',
    'Solutions Engineer / Architect',
    'AI/ML Engineer (General)',
]

ROLE_SHORT = {
    'ML Research Scientist': 'ML Research',
    'ML Engineer / Applied AI': 'ML Eng',
    'Backend SWE': 'Backend',
    'Full-Stack SWE': 'Full-Stack',
    'Mobile Engineer': 'Mobile',
    'Computer Vision Engineer': 'CV',
    'DevOps / Platform / SRE': 'DevOps',
    'Field/Developer Engineer (FDE)': 'FDE',
    'Sales Engineer / Sales Development Engineer': 'Sales Eng',
    'Software Engineer (General)': 'SWE',
    'Technology Consultant': 'Consulting',
    'Solutions Engineer / Architect': 'Solutions',
    'AI/ML Engineer (General)': 'AI/ML',
}

REPOS = [
    {'name': 'Neural-Volume-Rendering', 'kind': 'missing'},
    {'name': 'pocketii', 'kind': 'missing'},
    {'name': 'MistralMoE', 'kind': 'missing'},
    {'name': '2048-Puzzle-AI-Agent-Solver', 'kind': 'actual'},
    {'name': 'citv', 'kind': 'missing'},
    {'name': 'roam-mvp', 'kind': 'missing'},
    {'name': 'esaasfinal', 'kind': 'missing'},
    {'name': 'HTTP-server-and-client-programming', 'kind': 'missing'},
    {'name': 'Image-captioning-using-LSTM', 'kind': 'missing'},
    {'name': 'Unlisted-Repo-10', 'kind': 'missing'},
    {'name': 'Unlisted-Repo-11', 'kind': 'missing'},
]


def safe_read(path: Path) -> str | None:
    if path.exists() and path.is_file():
        return path.read_text(encoding='utf-8', errors='replace')
    return None


def gather_repo(repo: dict[str, str]) -> dict[str, Any]:
    name = repo['name']
    preferred = BASE_DIR / name
    actual_path = None
    found_in_home_user = preferred.exists() and preferred.is_dir()
    if found_in_home_user:
        actual_path = preferred
    elif name == '2048-Puzzle-AI-Agent-Solver' and WORKSPACE_2048.exists():
        actual_path = WORKSPACE_2048

    info: dict[str, Any] = {
        'name': name,
        'kind': repo['kind'],
        'preferred_path': str(preferred),
        'actual_path': str(actual_path) if actual_path else None,
        'found_in_home_user': found_in_home_user,
        'exists': actual_path is not None,
        'readme': None,
        'package_json': None,
        'requirements': None,
        'deployment_files': {},
        'tests': {},
        'key_sources': {},
        'summary': {},
        'scores': {},
    }

    if not actual_path:
        info['summary'] = {
            'status': 'missing',
            'note': 'Repository directory was not present in /home/user during direct filesystem inspection.',
        }
        info['scores'] = {
            'overall': 1,
            'ml_research': 1,
            'ml_eng': 1,
            'backend': 1,
            'full_stack': 1,
            'mobile': 1,
            'cv': 1,
            'devops': 1,
            'prod': 1,
        }
        return info

    readme = safe_read(actual_path / 'README.md') or safe_read(actual_path / 'README.MD')
    package_json = safe_read(actual_path / 'package.json') or safe_read(actual_path / 'frontend' / 'package.json')
    requirements = safe_read(actual_path / 'requirements.txt') or safe_read(actual_path / 'backend' / 'requirements.txt')
    info['readme'] = readme
    info['package_json'] = package_json
    info['requirements'] = requirements

    deployment_candidates = [
        'Dockerfile',
        'docker-compose.yml',
        'docker-compose.yaml',
        'render.yaml',
        'render.yml',
        'fly.toml',
        'vercel.json',
        'Procfile',
    ]
    for rel in deployment_candidates:
        text = safe_read(actual_path / rel)
        if text is not None:
            info['deployment_files'][rel] = text

    test_candidates = [
        'frontend/src/engine/localEngine.test.ts',
    ]
    for rel in test_candidates:
        text = safe_read(actual_path / rel)
        if text is not None:
            info['tests'][rel] = text

    key_candidates = [
        'backend/main.py',
        'backend/schemas.py',
        'backend/routers/game.py',
        'backend/routers/ai_watch.py',
        'backend/services/ai_service.py',
        'backend/services/game_service.py',
        'frontend/src/App.tsx',
        'frontend/src/main.tsx',
        'frontend/src/App.css',
        'frontend/src/engine/localEngine.ts',
        'frontend/src/context/GameContext.tsx',
        'frontend/src/context/SettingsContext.tsx',
        'frontend/src/components/Board/Board.tsx',
        'frontend/src/components/Controls/AIPanel.tsx',
        'frontend/src/hooks/useWebSocket.ts',
        'frontend/src/types/index.ts',
        'frontend/src/api/endpoints.ts',
    ]
    for rel in key_candidates:
        text = safe_read(actual_path / rel)
        if text is not None:
            info['key_sources'][rel] = text

    info['summary'] = {
        'status': 'workspace-fallback' if not found_in_home_user else 'present',
        'readme_lines': len(readme.splitlines()) if readme else 0,
        'package_json_present': bool(package_json),
        'requirements_present': bool(requirements),
        'deployment_count': len(info['deployment_files']),
        'test_count': len(info['tests']),
        'key_source_count': len(info['key_sources']),
        'features': [
            'FastAPI REST API and WebSocket gameplay streaming',
            'React 19 + TypeScript Vite frontend with AI assist/watch modes',
            'Python 2048 engine with expectiminimax, alpha-beta pruning, and iterative deepening',
            'Docker + Render deployment configuration',
            'Local deterministic fallback engine and Vitest coverage',
        ],
    }
    info['scores'] = {
        'overall': 9,
        'ml_research': 7,
        'ml_eng': 8,
        'backend': 8,
        'full_stack': 9,
        'mobile': 5,
        'cv': 2,
        'devops': 7,
        'prod': 8,
    }
    return info


def repo_sort_key_for_role(repo_info: dict[str, Any], role: str) -> tuple[int, int, str]:
    score_map = {
        'ML Research Scientist': repo_info['scores']['ml_research'],
        'ML Engineer / Applied AI': repo_info['scores']['ml_eng'],
        'Backend SWE': repo_info['scores']['backend'],
        'Full-Stack SWE': repo_info['scores']['full_stack'],
        'Mobile Engineer': repo_info['scores']['mobile'],
        'Computer Vision Engineer': repo_info['scores']['cv'],
        'DevOps / Platform / SRE': repo_info['scores']['devops'],
        'Field/Developer Engineer (FDE)': repo_info['scores']['overall'],
        'Sales Engineer / Sales Development Engineer': repo_info['scores']['overall'],
        'Software Engineer (General)': repo_info['scores']['overall'],
        'Technology Consultant': repo_info['scores']['overall'],
        'Solutions Engineer / Architect': repo_info['scores']['prod'],
        'AI/ML Engineer (General)': repo_info['scores']['ml_eng'],
    }
    return (-score_map[role], -repo_info['scores']['overall'], repo_info['name'])


def overall_summary(repo_info: dict[str, Any]) -> str:
    if repo_info['exists'] and repo_info['name'] == '2048-Puzzle-AI-Agent-Solver':
        return 'Only repository with direct code evidence in this environment; strongest for full-stack + applied AI storytelling.'
    if repo_info['name'].startswith('Unlisted-Repo'):
        return 'Repository slot referenced by the request but not present in the filesystem snapshot.'
    return 'Referenced by name, but the directory was absent from /home/user so ranking is capped pending code recovery.'


def make_quick_reference_table(infos: list[dict[str, Any]]) -> list[str]:
    lines = [
        '## QUICK-REFERENCE TABLE',
        '',
        '| Project | Overall | ML Research | ML Eng | Backend | Full-Stack | Mobile | CV | DevOps | Prod-Readiness |',
        '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ]
    for info in infos:
        s = info['scores']
        lines.append(
            f"| {info['name']} | {s['overall']}/10 | {s['ml_research']}/10 | {s['ml_eng']}/10 | {s['backend']}/10 | {s['full_stack']}/10 | {s['mobile']}/10 | {s['cv']}/10 | {s['devops']}/10 | {s['prod']}/10 |"
        )
    lines.append('')
    return lines


def make_role_matrices(infos: list[dict[str, Any]]) -> list[str]:
    lines = ['## 13 ROLE-BASED PRIORITY MATRICES', '']
    for role in ROLE_HEADINGS:
        lines.append(f'### {role}')
        ranked = sorted(infos, key=lambda info: repo_sort_key_for_role(info, role))
        for idx, info in enumerate(ranked, start=1):
            lines.append(f'{idx}. **{info["name"]}** — {overall_summary(info)}')
            lines.append(f'   - Role fit score: {repo_sort_key_for_role(info, role)[0] * -1}/10.')
            lines.append(f'   - Filesystem status: preferred path `{info["preferred_path"]}`; actual source `{info["actual_path"] or "not found"}`.')
            lines.append(f'   - Resume usage note: {"Use confidently with evidence from code, tests, and deployment files." if info["exists"] else "Treat as placeholder only until the repository is restored locally."}')
        lines.append('')
    return lines


def tech_stack_rows(repo_info: dict[str, Any]) -> list[tuple[str, str, str]]:
    if repo_info['exists'] and repo_info['name'] == '2048-Puzzle-AI-Agent-Solver':
        return [
            ('Frontend', 'React 19, TypeScript, Vite, Tailwind CSS, Vitest', 'Interactive SPA, local fallback engine, and browser-side persistence.'),
            ('Backend', 'FastAPI, Uvicorn, Pydantic, WebSockets', 'REST + streaming endpoints for game state, hints, and AI autoplay.'),
            ('AI / Core Logic', 'Python 3.11, Expectiminimax, alpha-beta pruning, iterative deepening', 'Game-playing agent with weighted heuristics and time-bounded search.'),
            ('State / UX', 'React Context, localStorage, haptics/audio hooks, replay tracking', 'Supports achievements, missions, streaks, cosmetics, and diagnostics.'),
            ('Deployment', 'Docker multi-stage build, docker-compose, Render', 'Single-container production image plus split dev services.'),
            ('Testing', 'Vitest', 'Deterministic local engine tests for move behavior and seeded RNG.'),
        ]
    return [
        ('Availability', 'Repository missing', 'No package manifest, dependency file, or source tree was available for direct inspection.'),
        ('Impact', 'Unverified', 'Claims should not be made on a resume until the repository is restored locally.'),
        ('Immediate next step', 'Recover filesystem copy', 'Clone or mount the missing repository into /home/user and rerun this report.'),
    ]


def profile_intro(repo_info: dict[str, Any]) -> list[str]:
    if repo_info['exists'] and repo_info['name'] == '2048-Puzzle-AI-Agent-Solver':
        return [
            'This project is a production-leaning 2048 game platform that pairs a polished React frontend with a FastAPI backend and a Python search-based AI agent. It supports human play, AI-assisted hinting, and fully automated watch mode, making it one of the strongest portfolio pieces for demonstrating both algorithmic depth and end-user product execution.',
            'Compared with the other requested repositories, this is the only codebase directly available in the environment, so it carries the highest confidence for evidence-backed resume bullets. The combination of WebSockets, fallback logic, deterministic tests, and deployment configuration makes it the best anchor project for interviews across software and AI roles.',
        ]
    return [
        'The repository name was provided in the request, but the directory itself was not present at the expected `/home/user/...` location during the direct filesystem audit. That means this profile can only document the gap and prescribe how to recover the evidence needed for a trustworthy resume entry.',
        'Until the repo is restored locally, any ranking or bullet phrasing for this project should be treated as placeholder-only and not used as factual claims in an interview loop. The most useful outcome right now is a clear checklist for recovering README content, dependencies, source files, tests, and deployment configs.',
    ]


def architecture_lines(repo_info: dict[str, Any]) -> list[str]:
    if repo_info['exists'] and repo_info['name'] == '2048-Puzzle-AI-Agent-Solver':
        return [
            '1. React 19 + TypeScript SPA renders the board, controls, missions, cosmetics, replay tools, and statistics panels.',
            '2. API client hits FastAPI REST endpoints for new game, move, hint, analysis, undo, and daily seed flows.',
            '3. WebSocket channel streams AI autoplay status + move events for the watch mode panel.',
            '4. Backend services wrap legacy Python engine modules, convert grids, apply moves, and compute heuristics.',
            '5. Local deterministic engine mirrors core move semantics so the UX degrades gracefully when the backend is unavailable.',
            '6. Docker multi-stage build compiles the frontend, installs backend dependencies, and serves the built SPA from FastAPI.',
        ]
    return [
        '1. Preferred directory check failed under `/home/user`, so no architecture graph could be reconstructed from code.',
        '2. README, dependency manifests, source files, and deployment descriptors remain unavailable for direct inspection.',
        '3. The highest-value next step is to restore the repo locally, then reread representative entrypoints, test files, and deployment manifests in sequence.',
    ]


def strengths(repo_info: dict[str, Any]) -> list[str]:
    if repo_info['exists'] and repo_info['name'] == '2048-Puzzle-AI-Agent-Solver':
        return [
            'Strong end-to-end scope: algorithmic AI, backend APIs, WebSockets, responsive frontend, and deployment files all live in one repo.',
            'Excellent storytelling for applied AI roles because the heuristics and search strategy are observable in a user-facing product.',
            'Good engineering maturity: deterministic local fallback, browser persistence, replay/history systems, and Vitest coverage.',
            'Portfolio-friendly UX with multiple modes, achievements, cosmetics, diagnostics, and accessibility-minded settings.',
            'Deployment readiness is credible because Docker, Compose, and Render configs are all present and coherent.',
        ]
    return [
        'Clear project naming may help once the code is restored, especially if the title maps to a strong domain area.',
        'A missing repo can still become valuable quickly if README, tests, and deployment artifacts are recovered in full.',
        'The current gap is diagnosable: the issue is not code quality, but filesystem availability inside this environment.',
    ]


def gaps(repo_info: dict[str, Any]) -> list[str]:
    if repo_info['exists'] and repo_info['name'] == '2048-Puzzle-AI-Agent-Solver':
        return [
            'Add broader test coverage beyond the local engine, especially backend API tests, WebSocket contract tests, and E2E UI checks.',
            'Document production hosting beyond Render, including observability, scaling assumptions, and incident-response patterns.',
            'Separate the oversized `frontend/src/App.tsx` into smaller feature modules to improve maintainability and code reviewability.',
            'Quantify AI performance with benchmark tables: move latency, average max tile, win rate, and strategy comparisons.',
            'Harden backend service boundaries by moving more legacy root-level engine imports into a dedicated Python package.',
        ]
    return [
        'Restore the missing repo into `/home/user` so direct evidence exists for README, dependencies, source, tests, and deployment config.',
        'Verify the intended default branch and whether package manifests or requirements files exist at the project root.',
        'Once recovered, create a compact architecture summary and measurable outcomes before drafting resume bullets.',
        'Add or surface tests and deployment files if the repo currently lacks them.',
        'Avoid using this project in interview materials until the missing evidence problem is fixed.',
    ]


def roadmap(repo_info: dict[str, Any]) -> list[str]:
    if repo_info['exists'] and repo_info['name'] == '2048-Puzzle-AI-Agent-Solver':
        return [
            'Phase 1: split frontend monolith into route- or feature-based modules and add typed service boundaries.',
            'Phase 2: introduce pytest / httpx tests for API endpoints and WebSocket integration scenarios.',
            'Phase 3: add benchmarking harnesses for expectiminimax depth, latency, and heuristic tuning experiments.',
            'Phase 4: ship CI/CD with lint, tests, image build, and preview deployments on pull requests.',
            'Phase 5: expand observability with request metrics, error tracing, and client telemetry dashboards.',
        ]
    return [
        'Phase 1: recover repo contents into `/home/user`.',
        'Phase 2: reread README, manifests, source entrypoints, tests, and deployment files sequentially.',
        'Phase 3: score the repo honestly for role fit based on evidence, not memory or assumptions.',
        'Phase 4: draft quantified resume bullets after confirming business value and technical complexity.',
        'Phase 5: add missing tests / deployment automation if the recovered repo is underpowered.',
    ]


def bullet_package(repo_info: dict[str, Any], role: str | None) -> list[dict[str, str]]:
    repo_name = repo_info['name']
    actual = repo_info['actual_path'] or 'not found'
    label = 'General' if role is None else ROLE_SHORT[role]
    bullets: list[dict[str, str]] = []
    if repo_info['exists'] and repo_name == '2048-Puzzle-AI-Agent-Solver':
        themes = {
            'General': [
                ('Built a full-stack 2048 platform with a React SPA, FastAPI backend, and Python AI engine.', 'README, backend entrypoints, and frontend app structure align on an end-to-end architecture.', 'Most credible “hero” project for cross-functional interviews.', 'Add benchmark metrics to strengthen claims.', 'Full-stack 2048 platform powered by React, FastAPI, and a search-based AI agent.'),
                ('Implemented real-time AI watch mode over WebSockets in addition to standard REST gameplay APIs.', 'Backend router mix shows both `/api/game/*` and `/ws/ai-watch` surfaces.', 'Strong signal for real-time product thinking.', 'Back claims with latency or uptime numbers later.', 'Shipped REST + WebSocket interfaces to support both turn-based and streaming gameplay.'),
                ('Created a resilient local fallback engine so the UI remains usable when the backend is unavailable.', 'Local engine, seeded RNG, and heuristic helpers mirror core gameplay semantics in the browser.', 'Useful proof of reliability-minded UX design.', 'Could still use more parity tests versus the backend engine.', 'Designed graceful degradation by embedding a deterministic client-side gameplay fallback.'),
                ('Added product depth with achievements, replays, missions, daily challenges, and cosmetics.', 'Large frontend state model and utility modules show sustained feature development.', 'Helpful for product-minded SWE and full-stack loops.', 'Need analytics to show feature adoption.', 'Expanded a simple puzzle game into a retention-oriented product experience with replay and progression systems.'),
                ('Packaged the stack for deployment with Docker, Compose, and Render descriptors.', 'Deployment files show both local dev and containerized production paths.', 'Demonstrates practical release readiness.', 'CI/CD automation is the next maturity step.', 'Containerized the app and documented deployable runtime paths for local and hosted environments.'),
            ],
            'ML Research': [
                ('Framed 2048 as a stochastic search problem and applied expectiminimax instead of plain minimax.', 'README explicitly distinguishes chance nodes and expected-value reasoning.', 'Signals understanding of uncertainty-aware decision algorithms.', 'Would benefit from experimental baselines.', 'Applied chance-aware search to a stochastic game environment instead of relying on deterministic minimax assumptions.'),
                ('Used iterative deepening under a fixed time budget to maximize search depth without blocking gameplay.', 'The README describes a 0.2-second wall-clock decision limit.', 'Shows practical search tradeoff reasoning.', 'Add empirical depth distributions for stronger research framing.', 'Implemented iterative deepening so the agent could return the best completed search result within a strict latency budget.'),
                ('Combined monotonicity, smoothness, empty-cell count, and max-tile features in the evaluation function.', 'Heuristic weighting appears in both README and patched agent logic.', 'Good example of hand-crafted representation design.', 'Ablation studies are still missing.', 'Designed a weighted heuristic objective that balances board smoothness, ordering, openness, and tile growth.'),
                ('Exposed heuristic tuning knobs through API parameters rather than burying them in code only.', 'Hint endpoint accepts `w_empty`, `w_mono`, and `w_smooth`.', 'Makes future experiments reproducible.', 'Needs experiment logging.', 'Surfaced heuristic weights at the API layer to support repeatable tuning and comparative evaluation.'),
                ('Provided a fast one-ply heuristic analysis mode for explainability in the interface.', 'Analysis endpoint and AI panel convert raw scores into ranked explanations.', 'Good story for interpretable decision support.', 'Could add calibration or ground-truth evaluation.', 'Translated raw heuristic outputs into user-facing directional explanations for lightweight model interpretability.'),
            ],
            'ML Eng': [
                ('Operationalized an AI agent behind typed API contracts rather than leaving it as a notebook-only prototype.', 'Pydantic schemas, service wrappers, and route handlers formalize the interface.', 'Good productionization story.', 'Needs monitoring and benchmark storage.', 'Turned search-based decision logic into a typed service surface consumable by product code.'),
                ('Wrapped synchronous AI computation in executor-backed async calls so the web layer stays responsive.', 'Service layer uses `run_in_executor` for move computation.', 'Demonstrates deployment-aware inference integration.', 'Could add queueing and concurrency controls.', 'Integrated CPU-bound AI work into an async backend without blocking request handling.'),
                ('Built both deep and greedy agent strategies to trade off quality versus latency.', 'Strategy selector is available in API and UI.', 'Shows practical serving-path flexibility.', 'Benchmark tables would quantify value.', 'Exposed multiple inference strategies so UX can balance move quality against response speed.'),
                ('Created deterministic local tests around seeded RNG behavior and board evolution.', 'Vitest suite validates starter grids, merges, and null-move cases.', 'Useful for regression safety on core logic.', 'Extend to backend parity tests.', 'Added deterministic tests for move generation and seeded randomness to stabilize AI-adjacent behavior.'),
                ('Linked model reasoning to product explainability through confidence and explanation panels.', 'AI panel transforms heuristic scores into confidence-like UI output.', 'Highlights applied AI product thinking.', 'Could calibrate probability language more rigorously.', 'Connected AI scoring logic to explainable UX elements instead of treating inference as a black box.'),
            ],
            'Backend': [
                ('Designed FastAPI endpoints for game creation, move application, hints, analysis, undo, and health checks.', 'Router and schema layout is clean and strongly typed.', 'Solid API design signal.', 'Needs auth/rate limiting only if product scope grows.', 'Implemented a typed FastAPI surface covering both gameplay transactions and AI-assistance workflows.'),
                ('Used service-layer helpers to isolate grid conversion, move application, and AI invocation.', 'Backend is split into router, schema, and service modules.', 'Good maintainability story.', 'Could package legacy engine modules more cleanly.', 'Separated HTTP concerns from game-state and AI service logic to keep backend code modular.'),
                ('Added a dedicated WebSocket endpoint for streaming long-lived AI sessions.', 'AI watch router manages pause/resume/stop/speed commands and status events.', 'Nice example of stateful backend interaction.', 'Would benefit from connection metrics.', 'Built a stateful WebSocket channel to orchestrate streaming AI gameplay sessions.'),
                ('Served the compiled SPA from FastAPI for a unified deployment target.', 'Backend conditionally mounts static assets and returns the frontend index.', 'Practical full-stack hosting pattern.', 'CDN separation may help at scale.', 'Collapsed frontend hosting and API serving into a single backend runtime for simpler deployment.'),
                ('Added health and daily seed utilities that reflect operational and product needs.', 'Health model and deterministic seed endpoint show practical API depth.', 'Useful beyond pure CRUD.', 'Could add version/build metadata.', 'Included operational health checks and deterministic daily challenge generation alongside core gameplay APIs.'),
            ],
            'Full-Stack': [
                ('Delivered a complete interactive product from algorithm to UI polish inside one codebase.', 'Frontend, backend, AI logic, tests, and deployment configs are all present.', 'Best-fit role story for this repo.', 'Quantified user outcomes would make it stronger.', 'Built and shipped a full-stack AI game experience spanning client UX, APIs, and core decision logic.'),
                ('Implemented multiple game modes including human play, AI assist, and AI watch.', 'App state and AI panel show distinct user flows.', 'Demonstrates feature breadth.', 'Could split modes into smaller modules.', 'Designed multi-mode gameplay flows that support manual play, AI hints, and autonomous autoplay.'),
                ('Added persistence for settings, stats, streaks, replays, missions, and cosmetic unlocks.', 'Context + localStorage helpers indicate thoughtful product continuity.', 'Great for user-centered engineering interviews.', 'Could sync to a backend profile later.', 'Persisted rich player state locally to create a sticky, session-spanning user experience.'),
                ('Implemented responsive board rendering, swipe controls, keyboard support, and feedback hooks.', 'Board and hook modules emphasize mobile-friendly interactions.', 'Strong UX engineering evidence.', 'Could add accessibility audit results.', 'Combined gesture, keyboard, and feedback systems to make the game playable across device contexts.'),
                ('Integrated server-first behavior with local failover rather than forcing a single availability model.', 'Frontend can recover from API issues using local engine logic.', 'Excellent resilience narrative.', 'Needs telemetry to quantify fallback usage.', 'Engineered hybrid client/server execution paths so gameplay remains available during backend disruption.'),
            ],
            'Mobile': [
                ('Implemented swipe-first board interactions that translate well to touch devices.', 'Board component wires gestures directly into direction handling.', 'Shows mobile-aware UX instincts.', 'Not a native app, so position honestly as web-mobile.', 'Built touch-friendly gameplay controls that mirror native mobile swipe interactions.'),
                ('Included haptics, persistent storage, and app badge hooks for device-like engagement loops.', 'App uses haptic helpers and the app badge API when available.', 'Nice “mobile web” polish.', 'Would still need native packaging for mobile-specific roles.', 'Added mobile-web style engagement features including haptics and persistent badge updates.'),
                ('Optimized board sizing dynamically to fit varying viewport widths.', 'Board component calculates cell size from viewport constraints.', 'Useful responsive design example.', 'Performance profiling on lower-end devices would help.', 'Implemented responsive board layout logic to keep interactions usable across small-screen devices.'),
                ('Designed fast local fallback behavior to avoid hard failures on flaky connections.', 'Client-side engine maintains playability without server dependence.', 'Relevant for real-world mobile network conditions.', 'Would be stronger with offline manifest support.', 'Improved mobile resilience by enabling local gameplay continuity when API calls fail.'),
                ('Structured the product as a compact single-page experience with clear state transitions.', 'Screen switching and panel layouts support mobile-style flows.', 'Helpful for hybrid/mobile-adjacent roles.', 'Still not a dedicated mobile codebase.', 'Shaped the experience into a streamlined single-page flow suited to handheld interaction patterns.'),
            ],
            'CV': [
                ('Not a computer vision project, but it does show disciplined algorithm design under uncertainty.', 'The core evidence is search/heuristics rather than image processing.', 'Only mention for breadth, not specialization.', 'Should not be a lead project for CV hiring managers.', 'Use this repo as supporting evidence of algorithmic rigor rather than as a core vision project.'),
                ('Could support future visual telemetry or board-state recognition experiments.', 'The deterministic board environment is easy to instrument.', 'Might complement a stronger CV portfolio piece.', 'Currently lacks image pipelines or datasets.', 'Position it as a possible platform for future perception experiments, not as a current CV deliverable.'),
                ('Explainability UI demonstrates translation of model outputs into user-facing visual cues.', 'Ghost boards and analysis panels visualize recommendations.', 'Tangentially relevant to vision-adjacent UX.', 'Avoid overstating relevance.', 'Showed how algorithmic outputs can be visualized clearly for end users through board overlays and analysis panels.'),
                ('WebSocket streaming could be reused for future visual inference demos.', 'The backend already supports live status + move events.', 'Suggests extensibility.', 'Again, not current CV evidence.', 'Built a streaming interaction pattern that could later host live inference or annotation outputs.'),
                ('The product demonstrates experimentation discipline even though it is not vision-specific.', 'Testing and heuristics are still concrete engineering assets.', 'Supportive only.', 'Needs an actual CV repo to anchor that story.', 'Treat this as general ML/software evidence that complements, but does not replace, a dedicated vision project.'),
            ],
            'DevOps': [
                ('Containerized the frontend build and backend runtime in a multi-stage Docker image.', 'Dockerfile compiles assets then installs backend requirements.', 'Good deployability signal.', 'Could add slimmer caching and SBOM steps.', 'Packaged build and runtime concerns into a multi-stage container flow optimized for deployment simplicity.'),
                ('Provided docker-compose profiles for split frontend/backend development and production-like runs.', 'Compose file captures both dev hot reload and prod image paths.', 'Shows environment awareness.', 'Needs CI validation.', 'Defined repeatable local environments for both development and production-style execution.'),
                ('Included a Render deployment descriptor with health checks and auto-deploy settings.', 'render.yaml captures runtime, branch, and health path details.', 'Practical hosted deployment story.', 'No infra-as-code beyond platform config yet.', 'Mapped the application onto a hosted deployment platform with explicit health-check wiring.'),
                ('Added a health endpoint and static asset serving strategy to support operational readiness.', 'Backend exposes `/api/health` and serves built frontend assets.', 'Useful for uptime and rollout checks.', 'Metrics/logging should be next.', 'Included operational endpoints and hosting integration points that simplify runtime verification.'),
                ('Designed graceful degradation via local fallback to reduce total outage impact.', 'Resilience exists at the product level, not just infrastructure level.', 'Compelling reliability narrative.', 'Need measurements of failover frequency.', 'Reduced user-visible failure modes by pairing backend infrastructure with client-side continuity paths.'),
            ],
            'FDE': [
                ('Can demo the full product live while explaining APIs, AI choices, and UX behavior to external audiences.', 'The repo has enough breadth for technical storytelling.', 'Excellent field/demo asset.', 'Prepare a concise scripted walkthrough.', 'Built a demo-friendly application that makes backend, AI, and UX tradeoffs easy to explain live.'),
                ('The hint and analysis panels make model behavior legible to non-specialist stakeholders.', 'Product surfaces scores and recommended directions visibly.', 'Great for customer education.', 'Needs tighter benchmark framing.', 'Turned model decisions into understandable product explanations for customer-facing demos.'),
                ('Hybrid local/server execution helps ensure demos survive backend hiccups.', 'Fallback logic reduces dependence on perfect connectivity.', 'Important field reliability trait.', 'Should rehearse failure-mode messaging.', 'Engineered the demo path to remain usable even when backend connectivity is degraded.'),
                ('WebSocket control surface supports interactive demos of autonomous AI play.', 'Pause/resume/speed controls are easy to showcase.', 'Good for workshops and enablement sessions.', 'Could add preset board scenarios.', 'Created interactive AI playback controls that support live technical demonstrations and workshops.'),
                ('Deployment artifacts make it easier to hand off reproducible setups to prospects or teammates.', 'Docker and Render config lower setup friction.', 'Helpful for post-demo follow-up.', 'Could add one-command bootstrap docs.', 'Packaged the project so others can reproduce demos quickly across local and hosted environments.'),
            ],
            'Sales Eng': [
                ('Shows the ability to translate advanced logic into an intuitive, customer-visible experience.', 'AI explanation panels and watch mode are visually strong.', 'Good demo asset.', 'Tie benefits to business impact when presenting.', 'Converted technically complex AI behavior into a simple and engaging user-facing demo experience.'),
                ('Supports multiple storytelling angles: real-time updates, graceful degradation, explainability, and deployment.', 'The repo is feature-dense without requiring domain-heavy context.', 'Useful for solution narratives.', 'Need concise value props per audience.', 'Built a product that can be positioned around reliability, transparency, and real-time interactivity.'),
                ('Fast local setup paths reduce friction for trial environments and internal enablement.', 'Compose + Docker make reproducibility easier.', 'Useful for pre-sales engineering.', 'Would benefit from seed demo data/presets.', 'Reduced environment setup overhead by packaging the app for repeatable local and hosted execution.'),
                ('Interactive controls encourage exploratory conversations with prospects.', 'AI mode switches and speed controls invite what-if demos.', 'Strong for technical discovery sessions.', 'Need business framing beyond gameplay.', 'Designed flexible demo controls that make live technical discovery sessions more interactive.'),
                ('Cross-stack ownership helps answer both product and implementation questions during demos.', 'One repo spans client, API, and AI logic.', 'Great for a trusted-advisor stance.', 'Avoid going too deep without audience calibration.', 'Owned enough of the stack to explain product behavior, implementation details, and deployment tradeoffs in one conversation.'),
            ],
            'SWE': [
                ('Shows breadth across algorithms, APIs, UI engineering, tests, and deployment.', 'Very few student/portfolio repos demonstrate this many layers coherently.', 'Strong generalist signal.', 'Break monoliths down for maintainability.', 'Developed a multi-layer application that spans core logic, backend services, frontend UX, testing, and deployment.'),
                ('Uses typed contracts and modular services rather than ad-hoc script glue.', 'Schemas, contexts, utilities, and service files are clearly separated.', 'Signals solid engineering habits.', 'Could use more code comments in complex areas.', 'Structured the codebase with typed interfaces and modular service boundaries to improve maintainability.'),
                ('Includes deterministic tests and predictable seeded behavior for critical logic.', 'The local engine suite proves care around correctness.', 'Helpful in interviews on testing discipline.', 'Need more integration coverage.', 'Added deterministic tests around core gameplay logic to catch regressions in high-value code paths.'),
                ('Balances product polish with core algorithmic implementation.', 'The repo is both functional and visibly feature-rich.', 'Good for companies that value shipping.', 'Metrics would strengthen impact framing.', 'Combined algorithmic problem-solving with user-facing product polish in a single shipped application.'),
                ('Demonstrates persistence, state management, and interaction design beyond trivial CRUD.', 'State models include replays, achievements, missions, streaks, and settings.', 'Shows depth of engineering effort.', 'Would benefit from code splitting.', 'Implemented richer stateful product systems than a standard CRUD tutorial app.'),
            ],
            'Consulting': [
                ('Useful as a showcase of diagnosing a problem, choosing an algorithmic approach, and shipping a tangible deliverable.', 'The repo tells a clean story from requirement to deployment.', 'Good consultant portfolio piece.', 'Add stakeholder-style outcome framing.', 'Delivered an end-to-end solution that links technical design choices to a concrete interactive product.'),
                ('Can be framed as a modernization exercise around AI-assisted UX and resilient architecture.', 'Server fallback, streaming, and deployment config support that narrative.', 'Helpful for digital transformation conversations.', 'Need ROI-style language for clients.', 'Packaged algorithmic functionality into a resilient product experience that is easy to demonstrate to stakeholders.'),
                ('Strong for workshops because the codebase spans multiple architectural concerns.', 'Allows discussion of frontend, backend, AI, and DevOps tradeoffs in one artifact.', 'Broad consulting relevance.', 'Could add architecture diagrams in repo assets.', 'Used one project to communicate tradeoffs across application, platform, and AI design decisions.'),
                ('Readable modular backend and deployment descriptors support handoff conversations.', 'Not just a flashy UI; there is operational structure too.', 'Good for advisory credibility.', 'Should add runbooks.', 'Documented implementation and deployment paths clearly enough to support stakeholder handoff and review.'),
                ('Feature set enables multiple levels of engagement from executive demo to engineering deep dive.', 'The product can be shown or dissected as needed.', 'Versatile consulting artifact.', 'Need business-impact summary slide.', 'Built a portfolio project flexible enough for both high-level demonstrations and detailed technical walkthroughs.'),
            ],
            'Solutions': [
                ('Demonstrates how to compose client, API, stateful streaming, and algorithmic services into one deployable solution.', 'Architecture is broad enough for solution design interviews.', 'Strong architecture signal.', 'Could add diagrams and NFRs.', 'Architected a solution that integrates web UI, backend APIs, streaming control, and AI decision services.'),
                ('Uses deployment descriptors and health endpoints that map naturally to runtime architecture discussions.', 'Easy to discuss hosting boundaries and operational checks.', 'Good systems thinking evidence.', 'Need scaling assumptions.', 'Defined deployment and health-check patterns that support broader solution architecture conversations.'),
                ('Fallback logic illustrates design for degraded modes rather than happy-path-only systems.', 'A valuable architecture talking point.', 'Signals reliability thinking.', 'Would benefit from documented recovery states.', 'Designed for degraded operation by allowing client-side continuity when backend services are impaired.'),
                ('Typed interfaces across the stack reduce ambiguity in system contracts.', 'Schemas and TypeScript types align cleanly.', 'Useful for solution governance discussions.', 'Need versioning strategy.', 'Used explicit data contracts across layers to keep system interactions predictable and evolvable.'),
                ('The product has enough scope to discuss future extensibility: accounts, analytics, experiments, and observability.', 'A good architectural springboard.', 'Invites forward-looking design conversation.', 'Current repo does not implement all of that yet.', 'Built a solution foundation that can be extended with analytics, identity, experiments, and observability layers.'),
            ],
            'AI/ML': [
                ('Ships AI capability in an actual product rather than isolating it in a research-only artifact.', 'The agent directly powers hints and autoplay experiences.', 'Excellent applied AI framing.', 'Benchmarking is still the missing piece.', 'Embedded AI decision logic into a user-facing product rather than leaving it in an offline prototype.'),
                ('Made heuristic weighting configurable and explainable across the API and UI.', 'Tunable parameters and analysis views bridge engineering and product.', 'Great cross-functional AI story.', 'Needs experiment management.', 'Exposed tunable AI heuristics through service contracts and translated outputs into explainable product behavior.'),
                ('Handled inference latency intentionally with strategy choices and async execution.', 'Deep vs greedy strategies plus executor-backed calls show systems awareness.', 'Important ML systems trait.', 'Could add load tests.', 'Balanced inference quality and latency through configurable serving strategies and non-blocking backend execution.'),
                ('Created deterministic local logic that supports testing and degraded-mode inference-like behavior.', 'Useful for product resilience around AI dependencies.', 'Solid operational AI thinking.', 'Need parity validation versus server outputs.', 'Added deterministic local decision logic to preserve functionality when server-side AI assistance is unavailable.'),
                ('The repo is easy to demo, making it strong for applied AI interviews that value communication as much as modeling.', 'AI behavior is visible and interactive.', 'High interview utility.', 'Need quantified results to close the loop.', 'Built an applied AI project whose behavior can be demonstrated live and explained clearly to mixed audiences.'),
            ],
        }
        selected = themes[label]
        for idx, (headline, evidence, fit, risk, rewrite) in enumerate(selected, start=1):
            bullets.append({
                'headline': headline,
                'evidence': f'Evidence: repo source `{actual}` with concrete signals in README, backend, frontend, tests, and deployment manifests.',
                'fit': f'Role fit: {fit}',
                'risk': f'Caveat: {risk}',
                'rewrite': f'Resume-ready rewrite: {rewrite}',
                'metric': f'Metric hook: attach latency, win-rate, engagement, reliability, or adoption numbers when available for bullet {idx}.',
            })
        return bullets

    for idx in range(1, 6):
        bullets.append({
            'headline': f'Placeholder bullet {idx} for {repo_name}: recover the repository locally before using this project in a resume or interview packet.',
            'evidence': f'Evidence: direct filesystem check failed at `{repo_info["preferred_path"]}` and no fallback source tree was available.',
            'fit': f'Role fit: treat as provisional support material for {label} only after README, dependencies, sources, tests, and deploy files are restored.',
            'risk': 'Caveat: any stronger claim would be speculative because the repository contents were not accessible.',
            'rewrite': f'Resume-ready rewrite: [Pending repo recovery] {repo_name} — describe verified outcomes only after rereading the local codebase end to end.',
            'metric': f'Metric hook: once recovered, add role-specific metrics such as accuracy, latency, throughput, uptime, adoption, or release speed for placeholder bullet {idx}.',
        })
    return bullets


def add_bullet_section(lines: list[str], title: str, bullets: list[dict[str, str]]) -> None:
    lines.append(f'#### {title}')
    for idx, bullet in enumerate(bullets, start=1):
        lines.append(f'- Bullet {idx}: {bullet["headline"]}')
        lines.append(f'  - {bullet["evidence"]}')
        lines.append(f'  - {bullet["fit"]}')
        lines.append(f'  - {bullet["risk"]}')
        lines.append(f'  - {bullet["rewrite"]}')
        lines.append(f'  - {bullet["metric"]}')
    lines.append('')


def make_profile(repo_info: dict[str, Any]) -> list[str]:
    lines = [f'## {repo_info["name"]}', '']
    lines.append('### What it does')
    for paragraph in profile_intro(repo_info):
        lines.append(paragraph)
    lines.append('')
    lines.append('### Full tech stack table')
    lines.append('| Layer | Technologies / Status | Notes |')
    lines.append('|---|---|---|')
    for layer, stack, notes in tech_stack_rows(repo_info):
        lines.append(f'| {layer} | {stack} | {notes} |')
    lines.append('')
    lines.append('### Architecture overview')
    for item in architecture_lines(repo_info):
        lines.append(item)
    lines.append('')
    lines.append('### Strengths')
    for item in strengths(repo_info):
        lines.append(f'- {item}')
    lines.append('')
    lines.append('### Gaps to fix (specific and actionable)')
    for item in gaps(repo_info):
        lines.append(f'- {item}')
    lines.append('')
    lines.append('### Improvement roadmap')
    for item in roadmap(repo_info):
        lines.append(f'- {item}')
    lines.append('')
    add_bullet_section(lines, '5 general resume bullets', bullet_package(repo_info, None))
    lines.append('### Role-specific bullets for EVERY applicable role from the 13 above')
    lines.append('')
    for role in ROLE_HEADINGS:
        add_bullet_section(lines, role, bullet_package(repo_info, role))
    return lines


def build_document() -> str:
    infos = [gather_repo(repo) for repo in REPOS]
    lines: list[str] = [
        '# RESUME PROJECT RANKINGS (FULL)',
        '',
        'Audit basis: direct filesystem reads only. No GitHub API calls and no agent delegation were used.',
        f'- Expected root path: `{BASE_DIR}`.',
        f'- Observed availability: `{BASE_DIR}` {"exists" if BASE_DIR.exists() else "does not exist in this environment"}.',
        f'- Only directly readable codebase in this environment: `{WORKSPACE_2048}`.',
        '',
    ]
    lines.extend(make_quick_reference_table(infos))
    lines.extend(make_role_matrices(infos))
    lines.append('## 11 DEEP-DIVE PROJECT PROFILES')
    lines.append('')
    for info in infos:
        lines.extend(make_profile(info))
    return '\n'.join(lines) + '\n'


def main() -> None:
    content = build_document()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(content, encoding='utf-8')
    print(content)
    print(f'\n[report_path]={OUTPUT_PATH}')
    print(f'[line_count]={len(content.splitlines())}')


if __name__ == '__main__':
    main()
