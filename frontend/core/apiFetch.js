export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("planner_token");

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: token ? "Bearer " + token : undefined,
    },
  });

  if (res.status === 401) {
    // 🔥 key change
    window.dispatchEvent(new Event("auth_required"));
    throw new Error("Unauthorized");
  }

  return res.json();
}