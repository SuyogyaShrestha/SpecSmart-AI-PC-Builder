"""
builder/services/score_build.py — Score an existing build WITHOUT re-generating.

This is used by the "Calculate Scores" button in the frontend.
Unlike validate_build (which used to call generate_build and re-pick parts),
this function takes exact part IDs and only computes scores + warnings.

Integrates the knowledge engine for ComponentQuality scoring.
"""
from __future__ import annotations
from parts.models import Part
from .compat import (
    estimate_watts, psu_ok, socket_ok, ram_ok, cooler_ok,
    cooler_fits_case, gpu_fits_case, mobo_fits_case
)
from .knowledge import component_quality_score, get_usecase_requirements


def _load_part(pid: int) -> dict | None:
    """Load a Part by ID and return a merged dict (base fields + specs)."""
    try:
        p = Part.objects.get(id=int(pid), is_active=True)
        return p.full_dict()
    except Part.DoesNotExist:
        return None


def score_existing_build(part_ids: dict, usecase: str = "Gaming") -> dict:
    """
    Score a build from exact part IDs without altering any selections.

    Returns: {
        "total_price": float,
        "warnings": [...],
        "metrics": {...},       # ML scores + knowledge quality
        "estimated_watts": int,
    }
    """
    parts = {}
    for comp, pid in part_ids.items():
        if pid:
            p = _load_part(pid)
            if p:
                parts[comp] = p

    cpu = parts.get("CPU")
    gpu = parts.get("GPU")
    mobo = parts.get("MOBO")
    ram = parts.get("RAM")
    ssd = parts.get("SSD")
    psu = parts.get("PSU")
    cooler = parts.get("COOLER")
    case = parts.get("CASE")

    total_price = sum(p["price"] for p in parts.values())
    est_watts = estimate_watts(parts)

    # ── Compatibility warnings ──────────────────────────────────────────
    warnings = []

    if cpu and mobo and not socket_ok(cpu, mobo):
        warnings.append(
            f"Socket mismatch: CPU is {cpu.get('socket')} but motherboard is {mobo.get('socket')}."
        )

    if mobo and ram and not ram_ok(cpu or {}, mobo, ram):
        warnings.append(
            f"RAM type mismatch: Motherboard expects {mobo.get('ram_type')} but RAM is {ram.get('ram_type')}."
        )

    if psu:
        ok, required = psu_ok(psu, est_watts)
        if not ok:
            psu_w = psu.get("psu_watts", 0)
            warnings.append(
                f"Insufficient PSU: {psu_w}W PSU for estimated {est_watts}W system (recommend ≥{required}W)."
            )

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

    # Physical clearance checks
    if case:
        if gpu and not gpu_fits_case(gpu, case):
            from .compat import _extract_spec as _es
            g_len = _es(gpu, "length_mm")
            c_max = _es(case, "gpu_max_mm")
            warnings.append(f"GPU length ({g_len}mm) exceeds case maximum ({c_max}mm).")
        if cooler and not cooler_fits_case(cooler, case):
            from .compat import _extract_spec as _es2
            c_h = _es2(cooler, "height_mm")
            c_max = _es2(case, "cooler_max_mm")
            warnings.append(f"Cooler height ({c_h}mm) exceeds case maximum ({c_max}mm).")
        if mobo and not mobo_fits_case(mobo, case):
            from .compat import _extract_spec as _es3
            m_ff = _es3(mobo, "form_factor")
            warnings.append(f"Motherboard form factor ({m_ff}) is not supported by this case.")

    # ── Use-case requirement warnings ───────────────────────────────────
    reqs = get_usecase_requirements(usecase)
    if ram:
        ram_gb = float(ram.get("ram_gb") or 0)
        if ram_gb > 0 and ram_gb < reqs.get("min_ram_gb", 0):
            warnings.append(
                f"RAM capacity ({int(ram_gb)}GB) is below recommended {reqs['min_ram_gb']}GB for {usecase}."
            )
    if gpu:
        vram = float(gpu.get("vram_gb") or 0)
        if vram > 0 and vram < reqs.get("min_vram_gb", 0):
            warnings.append(
                f"GPU VRAM ({int(vram)}GB) is below recommended {reqs['min_vram_gb']}GB for {usecase}."
            )

    # ── Removed ML Scoring & Knowledge Engine ──
    # Replaced by AI Expert Review per user request.
    metrics = None

    return {
        "total_price": round(total_price, 2),
        "warnings": warnings,
        "metrics": metrics,
        "estimated_watts": est_watts,
    }
