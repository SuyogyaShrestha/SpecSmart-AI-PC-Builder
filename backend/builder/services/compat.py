import re

def _extract_spec(part_dict, key, default=None):
    if not part_dict:
        return default
    # If the dictionary has a nested 'specs', check there first
    if "specs" in part_dict and isinstance(part_dict["specs"], dict):
        if key in part_dict["specs"]:
            return part_dict["specs"][key]
    # Otherwise check the root dictionary
    return part_dict.get(key, default)

def _safe_float(val, default=0.0):
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    # Strip any non-numeric characters (e.g., '65W' -> 65.0)
    match = re.search(r'[\d\.]+', str(val))
    if match:
        return float(match.group(0))
    return default

def estimate_watts(parts):
    """Calculate instantaneous wattage from all parts in the build."""
    watts = 0
    for comp_type, p in parts.items():
        if not p:
            continue
        tdp = _safe_float(_extract_spec(p, "tdp", 0))
        if tdp > 0:
            watts += tdp
        else:
            # Fallbacks for parts without explicit TDPs (mirrors frontend Builder.tsx)
            ctype = comp_type.upper()
            if ctype == "MOBO": watts += 30
            elif ctype == "RAM": watts += 10
            elif ctype == "SSD": watts += 10
            elif ctype == "COOLER": watts += 15
            
    return int(watts)

def psu_ok(psu, estimated_watts):
    watts = _safe_float(_extract_spec(psu, "psu_watts", 0))
    # 80W baseline for Mobo/RAM/Storage/Fans + 20% headroom on total
    required = int((estimated_watts + 80) * 1.2)
    return watts >= required, required

def socket_ok(cpu, mobo):
    c_sock = _extract_spec(cpu, "socket")
    m_sock = _extract_spec(mobo, "socket")
    return c_sock and m_sock and c_sock == m_sock

def ram_ok(cpu, mobo, ram):
    m_ram = _extract_spec(mobo, "ram_type")
    r_ram = _extract_spec(ram, "ram_type")
    return m_ram and r_ram and m_ram == r_ram

def cooler_ok(cpu, cooler):
    if not cooler:
        return False

    price = _safe_float(cooler.get("price", _extract_spec(cooler, "price", 0)))
    if price == 0:
        # Check if CPU actually includes a cooler
        inc = _extract_spec(cpu, "includes_cooler")
        return inc in (1, True, "1", "true", "True", "Yes", "yes")
    
    # Aftermarket cooler: check TDP
    cpu_tdp = _safe_float(_extract_spec(cpu, "tdp", 65))
    cooler_tdp = _safe_float(_extract_spec(cooler, "tdp_support", 0))

    # If cooler has no TDP listed, we estimate based on the type.
    if cooler_tdp == 0:
        c_type = (_extract_spec(cooler, "cooler_type") or "").lower()
        if "360mm" in c_type or "420mm" in c_type:
            cooler_tdp = 350
        elif "280mm" in c_type or "240mm" in c_type:
            cooler_tdp = 250
        elif "120mm" in c_type or "140mm" in c_type:
            cooler_tdp = 150
        else:
            cooler_tdp = 150 # Assume standard aftermarket air cooler handles 150W

    # A cooler is OK if its heat dissipation capacity is >= the CPU's heat output.
    return cooler_tdp >= cpu_tdp

def cooler_fits_case(cooler, pc_case):
    if not cooler or not pc_case:
        return True
    cooler_h = _safe_float(_extract_spec(cooler, "height_mm"))
    case_max_h = _safe_float(_extract_spec(pc_case, "cooler_max_mm"))
    if cooler_h > 0 and case_max_h > 0:
        return case_max_h >= cooler_h
    return True

def gpu_fits_case(gpu, pc_case):
    if not gpu or not pc_case:
        return True
    gpu_l = _safe_float(_extract_spec(gpu, "length_mm"))
    case_max_l = _safe_float(_extract_spec(pc_case, "gpu_max_mm"))
    if gpu_l > 0 and case_max_l > 0:
        return case_max_l >= gpu_l
    return True

def mobo_fits_case(mobo, pc_case):
    if not mobo or not pc_case:
        return True
    m_ff = (_extract_spec(mobo, "form_factor") or "").lower().replace("-", "").replace(" ", "")
    c_support = (_extract_spec(pc_case, "mobo_support") or "").lower().replace("-", "")

    # If case explicitly lists supported form factors, check directly
    if c_support and m_ff:
        if m_ff in c_support:
            return True

    # Fallback: use form-factor size hierarchy.
    # Larger cases can always fit smaller motherboards.
    # E-ATX > ATX > mATX (microatx) > ITX (miniitx)
    _FF_RANK = {"eatx": 4, "eatx": 4, "atx": 3, "matx": 2, "microatx": 2, "itx": 1, "miniitx": 1}

    if not m_ff:
        return True

    # Determine the case's form factor from its name or form_factor field
    c_ff = (_extract_spec(pc_case, "form_factor") or "").lower().replace("-", "").replace(" ", "")
    if not c_ff:
        # Try to infer from case name (e.g. "Generic ATX Mid Tower")
        case_name = (_extract_spec(pc_case, "name") or "").lower()
        if "eatx" in case_name or "e-atx" in case_name:
            c_ff = "eatx"
        elif "matx" in case_name or "micro-atx" in case_name or "micro atx" in case_name or "microatx" in case_name:
            c_ff = "matx"
        elif "itx" in case_name or "mini-itx" in case_name or "miniitx" in case_name:
            c_ff = "itx"
        elif "atx" in case_name:
            c_ff = "atx"

    mobo_rank = _FF_RANK.get(m_ff, 0)
    case_rank = _FF_RANK.get(c_ff, 0)

    # If we can resolve both ranks, a case is compatible if its rank >= mobo rank
    if mobo_rank > 0 and case_rank > 0:
        return case_rank >= mobo_rank

    # If we can't determine ranks, assume compatible
    return True
