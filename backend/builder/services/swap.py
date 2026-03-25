from parts.models import Part
from .generator_llm import generate_build

COMP_MAP = {
    "CPU": "CPU",
    "GPU": "GPU",
    "MOTHERBOARD": "MOBO",
    "MOBO": "MOBO",
    "RAM": "RAM",
    "SSD": "SSD",
    "PSU": "PSU",
    "CPU COOLER": "COOLER",
    "COOLER": "COOLER",
    "CASE": "CASE",
}

def _norm_component(name: str) -> str:
    name = (name or "").strip().upper()
    return COMP_MAP.get(name, name)

def swap_and_rebuild(budget: float, preferences: dict, current_build: list, component: str, new_part_id: int):
    component = _norm_component(component)

    forced_ids = {}
    for row in current_build or []:
        comp = _norm_component(row.get("component"))
        part = row.get("part") or {}
        pid = part.get("id")
        if pid:
            forced_ids[comp] = int(pid)

    forced_ids[component] = int(new_part_id)

    Part.objects.get(id=int(new_part_id))  # ensure exists
    return generate_build(budget, preferences=preferences, forced_ids=forced_ids)
