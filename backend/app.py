# backend/app.py

import os
print(os.getcwd())
import uuid
from typing import Any, Dict

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from .auth import hash_password, create_token, get_current_user_id

load_dotenv()

app = FastAPI(title="Planner V1", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# DB CONNECTION
# ─────────────────────────────────────────

def get_conn():
    url = os.environ.get("DATABASE_URL")

    if not url:
        raise RuntimeError("DATABASE_URL not set")

    if url.startswith("sqlite:///"):
        import sqlite3
        path = url.replace("sqlite:///", "")
        conn = sqlite3.connect(path)
        conn.row_factory = sqlite3.Row
        return conn

    return psycopg2.connect(
        url,
        cursor_factory=psycopg2.extras.RealDictCursor
    )


def is_sqlite(conn):
    return conn.__class__.__module__ == "sqlite3"


def q(conn, sql: str):
    if is_sqlite(conn):
        return sql.replace("%s", "?")
    return sql


# ─────────────────────────────────────────
# STARTUP (SCHEMA)
# ─────────────────────────────────────────

@app.on_event("startup")
def startup():
    conn = get_conn()
    cur = conn.cursor()

    # USERS
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            password_hash TEXT
        )
    """)

    # TASKS
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            duration INTEGER DEFAULT 1,
            energy TEXT DEFAULT 'medium',
            category TEXT DEFAULT 'other',
            user_id TEXT
        )
    """)

    # PLACEMENTS
    cur.execute("""
        CREATE TABLE IF NOT EXISTS placements (
            slot_id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            custom_duration INTEGER,
            user_id TEXT
        )
    """)

    conn.commit()
    cur.close()
    conn.close()


# ─────────────────────────────────────────
# AUTH ROUTES
# ─────────────────────────────────────────

@app.post("/signup")
def signup(data: dict):
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        raise HTTPException(400, "Missing email or password")

    conn = get_conn()
    cur = conn.cursor()

    user_id = str(uuid.uuid4())
    pw_hash = hash_password(password)

    try:
        cur.execute(
            q(conn, "INSERT INTO users (id, email, password_hash) VALUES (%s, %s, %s)"),
            (user_id, email, pw_hash),
        )
        conn.commit()
    except Exception:
        raise HTTPException(400, "User already exists")

    return {"token": create_token(user_id)}


@app.post("/login")
def login(data: dict):
    email = data.get("email")
    password = data.get("password")

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        q(conn, "SELECT id, password_hash FROM users WHERE email=%s"),
        (email,),
    )

    user = cur.fetchone()

    if not user or user["password_hash"] != hash_password(password):
        raise HTTPException(401, "Invalid credentials")

    return {"token": create_token(user["id"])}


# ─────────────────────────────────────────
# STATE (AUTH REQUIRED)
# ─────────────────────────────────────────

@app.get("/state")
def get_state(request: Request):
    user_id = get_current_user_id(request)

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(q(conn,
        "SELECT id, name, duration, energy, category FROM tasks WHERE user_id=%s"
    ), (user_id,))
    tasks = [dict(r) for r in cur.fetchall()]

    cur.execute(q(conn,
        "SELECT slot_id, task_id, custom_duration FROM placements WHERE user_id=%s"
    ), (user_id,))
    placements = {
        r["slot_id"]: {
            "taskId": r["task_id"],
            "customDuration": r["custom_duration"]
        }
        for r in cur.fetchall()
    }

    return {"tasks": tasks, "placements": placements}


# ─────────────────────────────────────────
# TASKS
# ─────────────────────────────────────────

@app.post("/tasks")
def create_task(request: Request, body: Dict[str, Any]):
    user_id = get_current_user_id(request)

    task_id  = body.get("id")
    name     = body.get("name")
    duration = body.get("duration", 1)
    energy   = body.get("energy", "medium")
    category = body.get("category", "other")

    if not task_id or not name:
        raise HTTPException(400, "id and name required")

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        q(conn, "INSERT INTO tasks VALUES (%s, %s, %s, %s, %s, %s)"),
        (task_id, name, duration, energy, category, user_id)
    )

    conn.commit()

    return {"ok": True}


@app.patch("/tasks/{task_id}")
def update_task(request: Request, task_id: str, body: Dict[str, Any]):
    user_id = get_current_user_id(request)

    # Only allow updating these specific fields — nothing else can sneak in
    allowed = {"name", "duration", "energy", "category"}
    updates = {k: v for k, v in body.items() if k in allowed}

    if not updates:
        raise HTTPException(400, "Nothing to update")

    conn = get_conn()
    cur = conn.cursor()

    for key, val in updates.items():
        cur.execute(
            q(conn, f"UPDATE tasks SET {key}=%s WHERE id=%s AND user_id=%s"),
            (val, task_id, user_id)
        )

    conn.commit()
    cur.close()
    conn.close()

    return {"ok": True}


@app.delete("/tasks/{task_id}")
def delete_task(request: Request, task_id: str):
    user_id = get_current_user_id(request)

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        q(conn, "DELETE FROM tasks WHERE id=%s AND user_id=%s"),
        (task_id, user_id)
    )

    conn.commit()

    return {"ok": True}


# ─────────────────────────────────────────
# PLACEMENTS
# ─────────────────────────────────────────

@app.post("/placements")
def create_placement(request: Request, body: Dict[str, Any]):
    user_id = get_current_user_id(request)

    slot_id = body.get("slotId")
    task_id = body.get("taskId")
    custom  = body.get("customDuration")

    conn = get_conn()
    cur = conn.cursor()

    # FIX: SQLite doesn't support `ON CONFLICT ... DO UPDATE SET EXCLUDED.*`
    # That's Postgres-only syntax. SQLite uses INSERT OR REPLACE instead,
    # which deletes the old row and inserts a fresh one — same end result
    # for our use case since we always supply all columns.
    if is_sqlite(conn):
        cur.execute(
            "INSERT OR REPLACE INTO placements (slot_id, task_id, custom_duration, user_id) VALUES (?, ?, ?, ?)",
            (slot_id, task_id, custom, user_id)
        )
    else:
        cur.execute(
            """
            INSERT INTO placements (slot_id, task_id, custom_duration, user_id)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (slot_id) DO UPDATE SET
                task_id         = EXCLUDED.task_id,
                custom_duration = EXCLUDED.custom_duration
            """,
            (slot_id, task_id, custom, user_id)
        )

    conn.commit()
    cur.close()
    conn.close()

    return {"ok": True}


@app.patch("/placements/{slot_id}")
def update_placement(request: Request, slot_id: str, body: Dict[str, Any]):
    user_id = get_current_user_id(request)

    # FIX: frontend calls PATCH /placements/:slotId to update customDuration,
    # but this route didn't exist at all — every duration change was silently lost.
    custom = body.get("customDuration")

    if custom is None:
        raise HTTPException(400, "customDuration required")

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        q(conn, "UPDATE placements SET custom_duration=%s WHERE slot_id=%s AND user_id=%s"),
        (custom, slot_id, user_id)
    )

    conn.commit()
    cur.close()
    conn.close()

    return {"ok": True}


@app.delete("/placements/{slot_id}")
def delete_placement(request: Request, slot_id: str):
    user_id = get_current_user_id(request)

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        q(conn, "DELETE FROM placements WHERE slot_id=%s AND user_id=%s"),
        (slot_id, user_id)
    )

    conn.commit()

    return {"ok": True}


# ─────────────────────────────────────────
# FRONTEND
# ─────────────────────────────────────────

app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")