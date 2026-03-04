# backend/data_sample.py
# V0 sample dataset: employees + weekly demand (7 days × 2 shifts)
# Keep it dead simple so the app can run immediately.

from typing import Dict, List, Literal, TypedDict

Day = Literal["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
ShiftType = Literal["early", "late"]
Role = Literal["driver", "kitchen"]

DAYS: List[Day] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
SHIFTS: List[ShiftType] = ["early", "late"]


class Employee(TypedDict):
    id: str
    name: str
    roles: List[Role]  # V0: fixed roles per person


class Demand(TypedDict):
    driver: int
    kitchen: int


def make_slot_key(day: Day, shift: ShiftType) -> str:
    return f"{day}:{shift}"


def load_sample_data() -> Dict[str, object]:
    """
    Returns a dict with:
      - employees: List[Employee]
      - demand: Dict[slot_key, Demand]
    """
    employees: List[Employee] = [
        {"id": "e01", "name": "Seif", "roles": ["driver"]},
        {"id": "e02", "name": "Ali", "roles": ["driver"]},
        {"id": "e03", "name": "Omar", "roles": ["driver"]},
        {"id": "e04", "name": "Jonas", "roles": ["driver"]},
        {"id": "e05", "name": "Mert", "roles": ["driver"]},
        {"id": "e06", "name": "Lina", "roles": ["kitchen"]},
        {"id": "e07", "name": "Sara", "roles": ["kitchen"]},
        {"id": "e08", "name": "Nour", "roles": ["kitchen"]},
        {"id": "e09", "name": "Ben", "roles": ["kitchen"]},
        {"id": "e10", "name": "Hassan", "roles": ["driver"]},
        {"id": "e11", "name": "Yara", "roles": ["kitchen"]},
        {"id": "e12", "name": "Tim", "roles": ["driver"]},
        {"id": "e13", "name": "Noah", "roles": ["driver"]},
        {"id": "e14", "name": "Mila", "roles": ["kitchen"]},
        {"id": "e15", "name": "Ziad", "roles": ["driver"]},
    ]

    # V0 demand: keep constant for simplicity.
    # You can tweak numbers later (e.g., weekends busier).
    base_early: Demand = {"driver": 2, "kitchen": 1}
    base_late: Demand = {"driver": 3, "kitchen": 2}

    demand: Dict[str, Demand] = {}
    for day in DAYS:
        for shift in SHIFTS:
            key = make_slot_key(day, shift)
            if shift == "early":
                demand[key] = dict(base_early)
            else:
                demand[key] = dict(base_late)

    # Optional: make Fri/Sat late a bit heavier (comment out if you want constant)
    demand[make_slot_key("Fri", "late")] = {"driver": 4, "kitchen": 2}
    demand[make_slot_key("Sat", "late")] = {"driver": 4, "kitchen": 2}

    return {"employees": employees, "demand": demand}