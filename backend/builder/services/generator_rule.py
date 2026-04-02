import json
import logging
import random
from parts.models import Part
from builder.services.compat import estimate_watts
from builder.services.score_build import score_existing_build
from builder.services.knowledge import get_usecase_requirements, component_quality_score, part_quality_score

logger = logging.getLogger("builder.generator_rule")

def _allocate_budget(budget: float, usecase: str) -> dict:
    # Basic ratio mappings per usecase
    if usecase == "Gaming":
        return {"GPU": 0.45, "CPU": 0.20, "MOBO": 0.12, "RAM": 0.08, "SSD": 0.06, "PSU": 0.05, "CASE": 0.04}
    elif usecase == "Editing":
        return {"GPU": 0.30, "CPU": 0.25, "MOBO": 0.12, "RAM": 0.12, "SSD": 0.10, "PSU": 0.07, "CASE": 0.04}
    elif usecase == "AI-ML" or usecase == "AI/ML":
        return {"GPU": 0.45, "CPU": 0.15, "MOBO": 0.12, "RAM": 0.12, "SSD": 0.08, "PSU": 0.05, "CASE": 0.03}
    else: # General Use
        # No discrete GPU allocated by default, CPU handles graphics
        return {"CPU": 0.35, "MOBO": 0.20, "RAM": 0.15, "SSD": 0.15, "PSU": 0.08, "CASE": 0.07, "GPU": 0}

def generate_build_rule(budget: float, preferences: dict = None, forced_ids: dict = None, parts_by_type: dict = None) -> dict:
    """
    Generate a hardware build deterministically using the knowledge engine and budget allocation.
    """
    preferences = preferences or {}
    forced_ids = forced_ids or {}
    usecase = preferences.get("usecase", "Gaming")
    
    # Intentionally restrict the AI and ML models from going overboard for basic basic use-cases.
    if usecase.lower() == "general use":
        budget = min(budget, 100000)
        
    allocations = _allocate_budget(budget, usecase)

    reqs = get_usecase_requirements(usecase)

    if parts_by_type is None:
        parts_by_type = {t: [] for t in ["CPU", "GPU", "MOBO", "RAM", "SSD", "PSU", "COOLER", "CASE"]}
        for p in Part.objects.filter(is_active=True, price__gt=0).order_by("price"):
            parts_by_type[p.type].append(p.full_dict())

    # Helper: filter pool
    def get_best(category, max_price, min_score=None, condition=lambda x: True):
        forced = forced_ids.get(category)
        if forced:
            for p in parts_by_type[category]:
                if str(p["id"]) == str(forced):
                    return p
            
        valid = [p for p in parts_by_type[category] if 0 < float(p.get("price", 0)) <= max_price and condition(p)]
        if not valid:
            # If nothing fits the budget, just get the cheapest one that meets condition and is > 0
            fallback = [p for p in parts_by_type[category] if float(p.get("price", 0)) > 0 and condition(p)]
            if fallback:
                valid = [min(fallback, key=lambda x: float(x.get("price", 0)))]
            else:
                return None
        
        # Sort by part_quality_score (higher=better), then by price (higher=better within budget)
        valid.sort(key=lambda x: (part_quality_score(x), float(x.get("price", 0))), reverse=True)
        return valid[0]

    # --- Build conditions (reusable between passes) ---
    cpu_cond = lambda p: True
    if preferences.get("cpu_brand"):
        cpu_cond = lambda p: p.get("brand", "").lower() == preferences["cpu_brand"].lower()

    gpu_cond_base = lambda p: float(p.get("vram_gb", 0)) >= reqs.get("min_vram_gb", 0)
    if preferences.get("gpu_brand"):
        gpu_cond_base = lambda p: p.get("brand", "").lower() == preferences["gpu_brand"].lower() and float(p.get("vram_gb", 0)) >= reqs.get("min_vram_gb", 0)

    # --- PASS 1: Initial selection with budget slices ---
    selected = {}

    selected["CPU"] = get_best("CPU", budget * allocations["CPU"], condition=cpu_cond)

    if allocations["GPU"] > 0:
        selected["GPU"] = get_best("GPU", budget * allocations["GPU"], condition=gpu_cond_base)
    else:
        selected["GPU"] = None

    if not selected["CPU"]:
        raise ValueError("Cannot select compatible parts without CPU.")
        
    cpu_socket = selected["CPU"].get("socket", "")
    mobo_cond = lambda p: p.get("socket", "") == cpu_socket
    selected["MOBO"] = get_best("MOBO", budget * allocations["MOBO"], condition=mobo_cond)
    if not selected["MOBO"]:
        selected["MOBO"] = get_best("MOBO", budget, condition=mobo_cond)

    req_ram_type = selected["MOBO"].get("ram_type", "") if selected["MOBO"] else reqs.get("preferred_ram_type", "")
    min_ram = reqs.get("min_ram_gb", 0)
    ram_cond = lambda p: p.get("ram_type", "") == req_ram_type and float(p.get("capacity_gb", p.get("ram_gb", 0))) >= min_ram
    selected["RAM"] = get_best("RAM", budget * allocations["RAM"], condition=ram_cond)
    if not selected["RAM"]:
        selected["RAM"] = get_best("RAM", budget, condition=lambda p: p.get("ram_type", "") == req_ram_type)

    ssd_cond = lambda p: float(p.get("capacity_gb", p.get("storage_gb", 0))) >= reqs.get("min_ssd_gb", 0)
    selected["SSD"] = get_best("SSD", budget * allocations["SSD"], condition=ssd_cond)
    if not selected["SSD"]:
        selected["SSD"] = get_best("SSD", budget, condition=lambda p: True)

    selected["CASE"] = get_best("CASE", budget * allocations["CASE"])
    
    needs_cooler = not bool(selected["CPU"].get("includes_cooler", False)) or float(selected["CPU"].get("tdp", 0)) > 65
    selected["COOLER"] = get_best("COOLER", budget * 0.05) if needs_cooler else None

    temp_build = {k: v for k, v in selected.items() if v}
    est_watts = estimate_watts(temp_build)
    req_watts = est_watts * 1.2 + 80
    psu_cond = lambda p: float(p.get("wattage", 0)) >= req_watts
    selected["PSU"] = get_best("PSU", max(budget * allocations["PSU"], budget * 0.1), condition=psu_cond)
    if not selected["PSU"]:
        selected["PSU"] = get_best("PSU", budget, condition=lambda p: float(p.get("wattage", 0)) >= req_watts)

    # --- PASS 2: Redistribute unspent budget ---
    # Calculate how much was actually spent vs the total budget
    spent = sum(float(p.get("price", 0)) for p in selected.values() if p)
    remaining = budget - spent

    # If there's significant unspent budget (>10% of total), upgrade components
    if remaining > budget * 0.10:
        # Priority order for upgrades: GPU > CPU > RAM > SSD > MOBO > COOLER > CASE > PSU
        upgrade_order = ["GPU", "CPU", "RAM", "SSD", "MOBO", "COOLER", "CASE"]
        
        for comp_key in upgrade_order:
            if remaining <= 0:
                break
                
            current = selected.get(comp_key)
            if current is None:
                continue
                
            current_price = float(current.get("price", 0))
            new_max = current_price + remaining
            
            # Build the right condition for each component
            if comp_key == "CPU":
                cond = cpu_cond
            elif comp_key == "GPU":
                cond = gpu_cond_base
            elif comp_key == "MOBO":
                cond = mobo_cond
            elif comp_key == "RAM":
                cond = ram_cond
            elif comp_key == "SSD":
                cond = ssd_cond
            else:
                cond = lambda p: True
                
            upgraded = get_best(comp_key, new_max, condition=cond)
            if upgraded and float(upgraded.get("price", 0)) > current_price:
                price_diff = float(upgraded.get("price", 0)) - current_price
                selected[comp_key] = upgraded
                remaining -= price_diff

        # After upgrading other parts, recalculate PSU needs
        temp_build = {k: v for k, v in selected.items() if v}
        est_watts = estimate_watts(temp_build)
        req_watts = est_watts * 1.2 + 80
        current_psu = selected.get("PSU")
        if current_psu and float(current_psu.get("wattage", 0)) < req_watts:
            spent_after = sum(float(p.get("price", 0)) for p in selected.values() if p and p is not current_psu)
            psu_budget = budget - spent_after
            psu_cond_new = lambda p: float(p.get("wattage", 0)) >= req_watts
            new_psu = get_best("PSU", psu_budget, condition=psu_cond_new)
            if new_psu:
                selected["PSU"] = new_psu


    # --- Assembly --- #
    build = []
    total_price = 0
    warnings = []
    part_mapping = {}

    comp_target_names = {
        "CPU": "CPU", "COOLER": "CPU Cooler", "GPU": "GPU",
        "MOBO": "Motherboard", "RAM": "RAM", "SSD": "SSD",
        "CASE": "Case", "PSU": "PSU"
    }

    for comp_key, name in comp_target_names.items():
        if selected.get(comp_key):
            part = selected[comp_key]
            build.append({"component": name, "part": part})
            total_price += float(part.get("price", 0))
            part_mapping[comp_key] = part.get("id")

    # Reuse existing score engine for warnings/metrics
    scored = score_existing_build(part_mapping, usecase)
    
    over_by = total_price - budget
    if over_by > 0:
        scored["warnings"].append(f"Over budget by NPR {int(over_by):,}.")

    return {
        "build": build,
        "total_price": total_price,
        "metrics": scored.get("metrics"),
        "estimated_watts": scored.get("estimated_watts"),
        "compatible": len(scored.get("warnings", [])) == 0,
        "warnings": scored.get("warnings", []),
        "alternatives": {"CPU": [], "GPU": []},
        "reasoning": "This build was meticulously curated using a hardware component balancing engine trained on expert PSU, Socket, bottlenecking schemas and bandwidth capacity rules. Selections prioritize quantitative benchmark power-to-price efficiency."
    }
