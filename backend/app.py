# backend/app.py
# FastAPI glue: exposes /state, /move, /generate and serves the frontend folder.

from typing import Any, Dict, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.core import init_state, get_state_payload, apply_move, generate_draft

app = FastAPI(title="Scheduler V0", version="0.1")

# Allow local dev (V0). Tighten later.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    # Trigger: server start
    # Effect: initialize in-memory schedule state
    init_state()


@app.get("/state")
def state() -> Dict[str, Any]:
    # Trigger: UI load/refresh
    # Effect: returns current state + validation
    return get_state_payload()


@app.post("/move")
def move(payload: Dict[str, Any]) -> Dict[str, Any]:
    # Trigger: user click slot (assign/unassign)
    # Effect: apply move -> validate -> return updated payload
    return apply_move(payload)


@app.post("/generate")
def generate(params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    # Trigger: Generate Draft button
    # Effect: generate schedule -> validate -> return updated payload
    return generate_draft(params)


# Serve frontend files (so you can open http://127.0.0.1:8000 )
# NOTE: This expects a folder "frontend" next to "backend" in scheduler_v0/
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")