import { R } from "./runtime.js";

export async function loadState(setProgress) {
  let token = R.auth?.token || localStorage.getItem("planner_token");
  
  // sync runtime
  if (token){
    R.auth.token = token;
    R.auth.email = localStorage.getItem("planner_email");
  } 

  if (!token) {
    R.openModal("auth", { mode: "login" });
    return null;
  }

  setProgress?.(0.25);

  try {
    const res = await fetch("/state", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    // 🔴 AUTH FAIL → open modal + stop
    if (res.status === 401) {
      R.auth.token = null;
      localStorage.removeItem("planner_token");

      R.openModal("auth", { mode: "login" });
      return null;
    }

    setProgress?.(0.7);

    const state = await res.json();

    console.log(
      `[loadState] loaded ${state.tasks?.length ?? 0} tasks, ${
        Object.keys(state.placements ?? {}).length
      } placements`
    );

    setProgress?.(1.0);

    return state;

  } catch (e) {
    console.error("[loadState] failed", e);
    return null;
  }
}