import { R } from "./runtime.js";

export async function apiFetch(path, options = {}) {
  const token = R.auth?.token;

  const res = await fetch(`http://127.0.0.1:8000${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  return res; // 🔥 RETURN REAL RESPONSE
}