# backend/validator.py
# V0 validator: hard rules only.
# Produces:
#  - cell_status: green/red per slot
#  - issues: list of human-readable strings

from typing import Dict, List, TypedDict, Literal, Set

Role = Literal["driver", "kitchen"]


class ValidationReport(TypedDict):
    is_valid: bool
    cell_status: Dict[str, Literal["green", "red"]]
    issues: List[str]
    coverage: Dict[str, Dict[Role, int]]  # assigned counts per role


def validate(state: Dict[str, object]) -> ValidationReport:
    """
    Expects state to contain:
      - employees_by_id: Dict[id, {"id","name","roles"}]
      - demand: Dict[slot_key, {"driver":int,"kitchen":int}]
      - assigned: Dict[slot_key, List[{"employee_id": str, "role": Role}]]

    Hard rules (V0):
      1) Coverage met: assigned_count(role) >= demand(role)
      2) Role match: employee has the assigned role
      3) No duplicate employee in same slot
    """
    employees_by_id: Dict[str, Dict[str, object]] = state["employees_by_id"]  # type: ignore
    demand: Dict[str, Dict[str, int]] = state["demand"]  # type: ignore
    assigned: Dict[str, List[Dict[str, object]]] = state["assigned"]  # type: ignore

    issues: List[str] = []
    cell_status: Dict[str, Literal["green", "red"]] = {}
    coverage: Dict[str, Dict[Role, int]] = {}

    for slot_key, req in demand.items():
        slot_assignments = assigned.get(slot_key, [])
        seen: Set[str] = set()

        # Count coverage per role
        cov_driver = 0
        cov_kitchen = 0

        # Slot-local issues (we still append to global issues list)
        slot_has_error = False

        for a in slot_assignments:
            emp_id = str(a.get("employee_id", ""))
            role = a.get("role")

            # Duplicate check
            if emp_id in seen:
                slot_has_error = True
                issues.append(f"[{slot_key}] Duplicate employee assigned: {emp_id}")
            else:
                seen.add(emp_id)

            # Role field sanity
            if role not in ("driver", "kitchen"):
                slot_has_error = True
                issues.append(f"[{slot_key}] Invalid role for employee {emp_id}: {role}")
                continue

            # Role mismatch check
            emp = employees_by_id.get(emp_id)
            if not emp:
                slot_has_error = True
                issues.append(f"[{slot_key}] Unknown employee id: {emp_id}")
            else:
                emp_roles = set(emp.get("roles", []))  # type: ignore
                if role not in emp_roles:
                    slot_has_error = True
                    issues.append(f"[{slot_key}] Role mismatch: {emp_id} assigned '{role}' but has {list(emp_roles)}")

            # Count coverage
            if role == "driver":
                cov_driver += 1
            elif role == "kitchen":
                cov_kitchen += 1

        coverage[slot_key] = {"driver": cov_driver, "kitchen": cov_kitchen}

        # Coverage requirement check
        req_driver = int(req.get("driver", 0))
        req_kitchen = int(req.get("kitchen", 0))

        if cov_driver < req_driver:
            slot_has_error = True
            issues.append(f"[{slot_key}] Missing drivers: need {req_driver}, have {cov_driver}")

        if cov_kitchen < req_kitchen:
            slot_has_error = True
            issues.append(f"[{slot_key}] Missing kitchen: need {req_kitchen}, have {cov_kitchen}")

        cell_status[slot_key] = "red" if slot_has_error else "green"

    is_valid = all(color == "green" for color in cell_status.values())
    return {"is_valid": is_valid, "cell_status": cell_status, "issues": issues, "coverage": coverage}