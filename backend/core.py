# backend/core.py
# V0 in-memory runtime: state + moves + simple greedy generator.

from typing import Dict, List, Literal, Optional, TypedDict, Tuple
from backend.data_sample import load_sample_data, DAYS, SHIFTS, make_slot_key
from backend.validator import validate, ValidationReport

Role = Literal["driver", "kitchen"]


class Assignment(TypedDict):
    employee_id: str
    role: Role


# Single in-memory state (V0)
CURRENT_STATE: Dict[str, object] = {}


def init_state() -> None:
    """
    Trigger: backend startup
    Effect: loads sample data and initializes empty schedule assignments
    """
    global CURRENT_STATE

    data = load_sample_data()
    employees: List[Dict[str, object]] = data["employees"]  # type: ignore
    demand: Dict[str, Dict[str, int]] = data["demand"]  # type: ignore

    employees_by_id: Dict[str, Dict[str, object]] = {e["id"]: e for e in employees}  # type: ignore

    # assigned: slot_key -> list of {employee_id, role}
    assigned: Dict[str, List[Assignment]] = {slot_key: [] for slot_key in demand.keys()}

    CURRENT_STATE = {
        "employees": employees,
        "employees_by_id": employees_by_id,
        "demand": demand,
        "assigned": assigned,
    }


def _payload(state: Dict[str, object]) -> Dict[str, object]:
    """
    Always return state + validation to UI.
    Trigger: /state, /move, /generate
    """
    report: ValidationReport = validate(state)
    return {
        "employees": state["employees"],
        "demand": state["demand"],
        "assigned": state["assigned"],
        "report": report,
    }


def get_state_payload() -> Dict[str, object]:
    """
    Trigger: GET /state
    Effect: returns current state + validation report
    """
    return _payload(CURRENT_STATE)


def apply_move(move: Dict[str, object]) -> Dict[str, object]:
    """
    Trigger: POST /move from UI
    Input move (V0):
      - type: "assign" | "unassign"
      - employee_id: str
      - day: "Mon".."Sun"
      - shift: "early"|"late"
      - role: optional ("driver"|"kitchen")  # defaulted if missing
    Effect:
      - mutates CURRENT_STATE assigned for that slot
      - returns updated payload
    """
    global CURRENT_STATE

    mtype = str(move.get("type", ""))
    emp_id = str(move.get("employee_id", ""))
    day = str(move.get("day", ""))
    shift = str(move.get("shift", ""))

    slot_key = make_slot_key(day, shift)  # type: ignore

    assigned: Dict[str, List[Assignment]] = CURRENT_STATE["assigned"]  # type: ignore
    employees_by_id: Dict[str, Dict[str, object]] = CURRENT_STATE["employees_by_id"]  # type: ignore

    if slot_key not in assigned:
        # unknown slot; ignore
        return _payload(CURRENT_STATE)

    if emp_id not in employees_by_id:
        return _payload(CURRENT_STATE)

    emp_roles: List[str] = employees_by_id[emp_id].get("roles", [])  # type: ignore

    # Choose role
    role = move.get("role")
    if role not in ("driver", "kitchen"):
        # Default: if employee has only one role, use it; else pick first.
        role = emp_roles[0] if emp_roles else "driver"
    role = "driver" if role == "driver" else "kitchen"  # normalize

    slot_list = assigned[slot_key]

    if mtype == "unassign":
        assigned[slot_key] = [a for a in slot_list if a["employee_id"] != emp_id]
        return _payload(CURRENT_STATE)

    if mtype == "assign":
        # Prevent duplicates in same slot (V0)
        if any(a["employee_id"] == emp_id for a in slot_list):
            return _payload(CURRENT_STATE)
        slot_list.append({"employee_id": emp_id, "role": role})  # type: ignore
        return _payload(CURRENT_STATE)

    # Unknown action
    return _payload(CURRENT_STATE)


def generate_draft(params: Optional[Dict[str, object]] = None) -> Dict[str, object]:
    """
    Trigger: POST /generate
    Effect: fills schedule with a simple greedy heuristic:
      - For each slot, fill kitchen then drivers until demand met.
      - Select employees with that role, preferring those with fewer total assignments so far.
    """
    global CURRENT_STATE

    demand: Dict[str, Dict[str, int]] = CURRENT_STATE["demand"]  # type: ignore
    employees: List[Dict[str, object]] = CURRENT_STATE["employees"]  # type: ignore
    assigned: Dict[str, List[Assignment]] = CURRENT_STATE["assigned"]  # type: ignore

    # Clear assignments
    for k in assigned.keys():
        assigned[k] = []

    # Track total assigned shifts per employee for simple fairness
    total_count: Dict[str, int] = {e["id"]: 0 for e in employees}  # type: ignore

    def pick(role: Role, already_in_slot: List[str]) -> Optional[str]:
        # eligible employees with role and not already in this slot
        eligible = []
        for e in employees:
            eid = e["id"]  # type: ignore
            roles = e.get("roles", [])  # type: ignore
            if role in roles and eid not in already_in_slot:
                eligible.append(eid)
        if not eligible:
            return None
        eligible.sort(key=lambda eid: total_count.get(eid, 0))
        return eligible[0]

    # Iterate slots in a stable order
    for day in DAYS:
        for shift in SHIFTS:
            slot_key = make_slot_key(day, shift)
            req = demand[slot_key]
            need_k = int(req.get("kitchen", 0))
            need_d = int(req.get("driver", 0))

            already = []
            # Fill kitchen first
            for _ in range(need_k):
                eid = pick("kitchen", already)
                if eid is None:
                    break
                assigned[slot_key].append({"employee_id": eid, "role": "kitchen"})
                total_count[eid] += 1
                already.append(eid)

            # Fill drivers
            for _ in range(need_d):
                eid = pick("driver", already)
                if eid is None:
                    break
                assigned[slot_key].append({"employee_id": eid, "role": "driver"})
                total_count[eid] += 1
                already.append(eid)

    return _payload(CURRENT_STATE)