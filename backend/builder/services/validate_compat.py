"""
builder/services/validate_compat.py — Lightweight compatibility check.

Only checks socket, RAM type, PSU wattage, and cooler compatibility.
Does NOT run any ML scoring — designed to be fast for real-time UI feedback.
"""
from parts.models import Part
from .compat import estimate_watts, psu_ok, socket_ok, ram_ok, cooler_ok


def _safe_specs(part_obj):
    """Return a merged dict of base fields + specs for a Part object."""
    d = {
        "id": part_obj.id,
        "type": part_obj.type,
        "name": part_obj.name,
        "brand": part_obj.brand,
        "price": float(part_obj.price),
    }
    d.update(part_obj.specs or {})
    return d


def check_compatibility(part_ids: dict) -> dict:
    """
    part_ids: {"CPU": 12, "GPU": 55, "MOBO": 34, ...}
    Returns: {"warnings": [...], "total_price": float, "estimated_watts": int}
    """
    parts = {}
    total_price = 0.0

    for comp, pid in part_ids.items():
        if not pid:
            continue
        try:
            p = Part.objects.get(id=int(pid), is_active=True)
            parts[comp] = _safe_specs(p)
            total_price += float(p.price)
        except Part.DoesNotExist:
            continue

    warnings = []
    cpu = parts.get("CPU")
    gpu = parts.get("GPU")
    mobo = parts.get("MOBO")
    ram = parts.get("RAM")
    psu = parts.get("PSU")
    cooler = parts.get("COOLER")

    # Socket check
    if cpu and mobo and not socket_ok(cpu, mobo):
        warnings.append(
            f"Socket mismatch: CPU is {cpu.get('socket')} but motherboard is {mobo.get('socket')}."
        )

    # RAM type check
    if mobo and ram and not ram_ok(cpu or {}, mobo, ram):
        warnings.append(
            f"RAM type mismatch: Motherboard expects {mobo.get('ram_type')} but RAM is {ram.get('ram_type')}."
        )

    # PSU wattage check
    est_watts = estimate_watts(cpu or {}, gpu or {})
    if psu:
        ok, required = psu_ok(psu, est_watts)
        if not ok:
            psu_w = psu.get("psu_watts", 0)
            warnings.append(
                f"Insufficient PSU: {psu_w}W PSU for estimated {est_watts}W system (recommend ≥{required}W)."
            )

    # Cooler brand check
    if cpu and cooler:
        cooler_name = (cooler.get("name") or "").lower()
        cpu_brand = (cpu.get("brand") or "").lower()
        if "wraith" in cooler_name and "intel" in cpu_brand:
            warnings.append("AMD Wraith cooler is not compatible with Intel CPUs.")
        if "intel" in cooler_name and "stock" in cooler_name and "amd" in cpu_brand:
            warnings.append("Intel stock cooler is not compatible with AMD CPUs.")

    return {
        "warnings": warnings,
        "total_price": round(total_price, 2),
        "estimated_watts": est_watts,
    }
