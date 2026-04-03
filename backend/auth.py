# backend/auth.py

import time
import hashlib
import jwt
from fastapi import HTTPException, Request

SECRET_KEY = "dev-secret-change-me"  # move later to env


# ─────────────────────────────────────────
# PASSWORD
# ─────────────────────────────────────────

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────
# TOKEN
# ─────────────────────────────────────────

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": int(time.time()) + 60 * 60 * 24 * 7,  # 7 days
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def get_current_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")

    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = auth.split(" ", 1)[1].strip()

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["user_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")