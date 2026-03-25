# backend/app.py
# FastAPI planner backend.
# Endpoints: /state, /tasks, /placements
# Database: PostgreSQL via psycopg2, connection string from DATABASE_URL env var.

import os
import json
from typing import Any, Dict, Optional

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Planner V1", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# DB CONNECTION
# ─────────────────────────────────────────────────────────────────────────────

def get_conn():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable not set")
    return psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)


# ─────────────────────────────────────────────────────────────────────────────
# STARTUP — create tables if they don't exist
# ─────────────────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id       TEXT PRIMARY KEY,
            name     TEXT NOT NULL,
            duration INTEGER NOT NULL DEFAULT 1,
            energy   TEXT NOT NULL DEFAULT 'medium',
            category TEXT NOT NULL DEFAULT 'other'
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS placements (
            slot_id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    cur.close()
    conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# GET /state  — load everything on boot
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/state")
def get_state() -> Dict[str, Any]:
    conn = get_conn()
    cur  = conn.cursor()

    cur.execute("SELECT id, name, duration, energy, category FROM tasks ORDER BY id")
    tasks_rows = cur.fetchall()

    cur.execute("SELECT slot_id, task_id FROM placements")
    placement_rows = cur.fetchall()

    cur.close()
    conn.close()

    # placements as { slotId: { taskId } } — matches R.appState.placements shape
    placements = { row["slot_id"]: { "taskId": row["task_id"] } for row in placement_rows }

    return {
        "tasks":      [dict(r) for r in tasks_rows],
        "placements": placements,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /tasks  — create a task
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/tasks")
def create_task(body: Dict[str, Any]) -> Dict[str, Any]:
    task_id  = body.get("id")
    name     = body.get("name")
    duration = body.get("duration", 1)
    energy   = body.get("energy", "medium")
    category = body.get("category", "other")

    if not task_id or not name:
        raise HTTPException(status_code=400, detail="id and name required")

    conn = get_conn()
    cur  = conn.cursor()
    cur.execute(
        "INSERT INTO tasks (id, name, duration, energy, category) VALUES (%s, %s, %s, %s, %s)",
        (task_id, name, duration, energy, category)
    )
    conn.commit()
    cur.close()
    conn.close()

    return { "ok": True, "id": task_id }


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /tasks/:id  — update task fields
# ─────────────────────────────────────────────────────────────────────────────

@app.patch("/tasks/{task_id}")
def update_task(task_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
    allowed = {"name", "duration", "energy", "category"}
    fields  = { k: v for k, v in body.items() if k in allowed }

    if not fields:
        raise HTTPException(status_code=400, detail="no valid fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in fields)
    values     = list(fields.values()) + [task_id]

    conn = get_conn()
    cur  = conn.cursor()
    cur.execute(f"UPDATE tasks SET {set_clause} WHERE id = %s", values)
    conn.commit()
    cur.close()
    conn.close()

    return { "ok": True }


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /tasks/:id  — delete task + cascade removes its placements
# ─────────────────────────────────────────────────────────────────────────────

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str) -> Dict[str, Any]:
    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
    conn.commit()
    cur.close()
    conn.close()

    return { "ok": True }


# ─────────────────────────────────────────────────────────────────────────────
# POST /placements  — place a task on a slot
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/placements")
def create_placement(body: Dict[str, Any]) -> Dict[str, Any]:
    slot_id = body.get("slotId")
    task_id = body.get("taskId")

    if not slot_id or not task_id:
        raise HTTPException(status_code=400, detail="slotId and taskId required")

    conn = get_conn()
    cur  = conn.cursor()
    # upsert — if slot already occupied, replace it
    cur.execute(
        """
        INSERT INTO placements (slot_id, task_id) VALUES (%s, %s)
        ON CONFLICT (slot_id) DO UPDATE SET task_id = EXCLUDED.task_id
        """,
        (slot_id, task_id)
    )
    conn.commit()
    cur.close()
    conn.close()

    return { "ok": True }


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /placements/:slot_id  — remove a placement
# ─────────────────────────────────────────────────────────────────────────────

@app.delete("/placements/{slot_id:path}")
def delete_placement(slot_id: str) -> Dict[str, Any]:
    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("DELETE FROM placements WHERE slot_id = %s", (slot_id,))
    conn.commit()
    cur.close()
    conn.close()

    return { "ok": True }


# ─────────────────────────────────────────────────────────────────────────────
# POST /placements/move  — move or swap placements between slots
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/placements/move")
def move_placement(body: Dict[str, Any]) -> Dict[str, Any]:
    from_slot = body.get("fromSlotId")
    to_slot   = body.get("toSlotId")

    if not from_slot or not to_slot:
        raise HTTPException(status_code=400, detail="fromSlotId and toSlotId required")

    conn = get_conn()
    cur  = conn.cursor()

    # fetch both current values
    cur.execute("SELECT task_id FROM placements WHERE slot_id = %s", (from_slot,))
    from_row = cur.fetchone()
    cur.execute("SELECT task_id FROM placements WHERE slot_id = %s", (to_slot,))
    to_row = cur.fetchone()

    if not from_row:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="source slot has no placement")

    from_task = from_row["task_id"]
    to_task   = to_row["task_id"] if to_row else None

    if to_task:
        # swap
        cur.execute("UPDATE placements SET task_id = %s WHERE slot_id = %s", (to_task,   from_slot))
        cur.execute("UPDATE placements SET task_id = %s WHERE slot_id = %s", (from_task, to_slot))
    else:
        # move
        cur.execute("DELETE FROM placements WHERE slot_id = %s", (from_slot,))
        cur.execute(
            "INSERT INTO placements (slot_id, task_id) VALUES (%s, %s)",
            (to_slot, from_task)
        )

    conn.commit()
    cur.close()
    conn.close()

    return { "ok": True }


# ─────────────────────────────────────────────────────────────────────────────
# SERVE FRONTEND
# ─────────────────────────────────────────────────────────────────────────────

app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
