"""
builder/services/validate_compat.py — Lightweight compatibility check.

Only checks socket, RAM type, PSU wattage, and cooler compatibility.
Does NOT run any ML scoring — designed to be fast for real-time UI feedback.
"""
from parts.models import Part
from .compat import (
    estimate_watts, psu_ok, socket_ok, ram_ok, cooler_ok, 
    cooler_fits_case, gpu_fits_case, mobo_fits_case
)


def _safe_specs(part_obj):
    """Return a merged dict of base fields + specs for a Part object."""
    d = {
        "id": part_obj.id,
        "type": part_obj.type,
        "name": part_obj.name,
        "brand": part_obj.brand,
        "price": float(part_obj.price),
        "specs": part_obj.specs or {},
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
    est_watts = estimate_watts(parts)
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

    if cpu and cooler and not cooler_ok(cpu, cooler):
        warnings.append("Cooler may be insufficient for this CPU (low TDP support).")

    # Missing cooler warning: CPU doesn't include stock cooler and no aftermarket selected
    if cpu and not cooler:
        from .compat import _extract_spec
        inc = _extract_spec(cpu, "includes_cooler")
        if inc not in (1, True, "1", "true", "True", "Yes", "yes"):
            warnings.append("This CPU does not include a stock cooler. Please add an aftermarket CPU cooler.")

    pc_case = parts.get("CASE")
    if pc_case:
        if gpu and not gpu_fits_case(gpu, pc_case):
            g_len = gpu.get("length_mm") or gpu.get("specs", {}).get("length_mm")
            c_max = pc_case.get("gpu_max_mm") or pc_case.get("specs", {}).get("gpu_max_mm")
            warnings.append(f"GPU length ({g_len}mm) exceeds case maximum ({c_max}mm).")
        
        if cooler and not cooler_fits_case(cooler, pc_case):
            c_h = cooler.get("height_mm") or cooler.get("specs", {}).get("height_mm")
            c_max = pc_case.get("cooler_max_mm") or pc_case.get("specs", {}).get("cooler_max_mm")
            warnings.append(f"Cooler height ({c_h}mm) exceeds case maximum ({c_max}mm).")

        if mobo and not mobo_fits_case(mobo, pc_case):
            m_ff = mobo.get("form_factor") or mobo.get("specs", {}).get("form_factor")
            warnings.append(f"Motherboard form factor ({m_ff}) is not supported by this case.")

    return {
        "warnings": warnings,
        "total_price": round(total_price, 2),
        "estimated_watts": est_watts,
    }
