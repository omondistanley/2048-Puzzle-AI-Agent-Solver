# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# VITE_API_URL=/ means API calls are same-origin (relative paths)
ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: FastAPI backend + built React static files ───────────────────────
FROM python:3.11-slim
WORKDIR /app

# Copy Python game logic (keep in root for import compatibility with existing code)
COPY Grid.py IntelligentAgent.py ComputerAI.py BaseAI.py \
     GameManager.py BaseDisplayer.py Displayer.py ./

# Copy FastAPI backend
COPY backend/ ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy built React app (FastAPI serves it as static files)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
