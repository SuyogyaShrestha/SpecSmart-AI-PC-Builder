"""
builder/services/knowledge.py — Rule-based PC building knowledge engine.

Encodes expert-level PC building knowledge as deterministic rules:
 - PSU tier list (A/B/C/D based on brand/model quality)
 - RAM speed tiers per RAM type (DDR4/DDR5)
 - SSD interface tiers (NVMe Gen5/4/3, SATA)
 - CPU-GPU pairing quality (bottleneck detection)
 - Use-case component quality scoring
 - Motherboard quality tiers

This module is used by the generator and scorer to make intelligent
part selections and produce meaningful quality scores.

No external API calls — everything runs locally in <10ms.
"""
from __future__ import annotations
import re

# ─────────────────────────────────────────────────────────────────────────────
# PSU TIERS — Based on Cultists PSU Tier List (simplified)
#
# Tier A (90-100): Top-tier units, excellent voltage regulation + components
# Tier B (70-89):  Good quality, reliable for most builds
# Tier C (50-69):  Acceptable, budget builds only
# Tier D (20-49):  Low quality, avoid if possible
# ─────────────────────────────────────────────────────────────────────────────

_PSU_TIER_PATTERNS: list[tuple[str, str]] = [
    # Tier A — flagship models
    (r"corsair\s*(rm\d|rmx|hx|ax|shift|hxi)", "A"),
    (r"seasonic\s*(focus|prime|vertex)", "A"),
    (r"be\s*quiet.*?(straight\s*power|dark\s*power|pure\s*power\s*12)", "A"),
    (r"msi\s*(meg|mpg)\s*a\d+g", "A"),
    (r"asus\s*(rog|thor|strix)", "A"),
    (r"super\s*flower\s*leadex", "A"),
    (r"fractal\s*design\s*ion", "A"),
    (r"evga\s*(supernova\s*g|supernova\s*p|supernova\s*t)", "A"),
    (r"thermaltake\s*toughpower\s*(gf3|gf1)", "A"),

    # Tier B — solid mid-range
    (r"corsair\s*(cx-?f|cx\d+m|vengeance)", "B"),
    (r"cooler\s*master\s*mwe\s*(gold|v2)", "B"),
    (r"deepcool\s*(pq|px|pn)", "B"),
    (r"antec\s*(neoeco|earthwatts|hcg|high\s*current)", "B"),
    (r"gigabyte\s*(p\d+gm|aorus|ud)", "B"),
    (r"thermaltake\s*(toughpower\s*gx|smart\s*bm2)", "B"),
    (r"msi\s*mag\s*a\d+b", "B"),
    (r"xpg\s*(core\s*reactor|pylon)", "B"),
    (r"nzxt\s*(c\d+|e)\d+", "B"),
    (r"montech\s*(century|titan)", "B"),
    (r"silverstone\s*(sx|et|st|decathlon)", "B"),

    # Tier C — budget but functional
    (r"corsair\s*(cx\d+|cv\d+)", "C"),
    (r"cooler\s*master\s*mwe\s*(bronze|white)", "C"),
    (r"evga\s*(supernova\s*b|br|bt|bq)", "C"),
    (r"thermaltake\s*smart\s*(std|rgb|bx1)", "C"),
    (r"deepcool\s*(da|dn|de|pk)", "C"),
    (r"antec\s*(vp|bp|atom|csk|cuprum)", "C"),
    (r"gigabyte\s*pw\d+", "C"),
    (r"montech\s*(gamma|beta)", "C"),
    (r"silverstone\s*essential", "C"),

    # Tier D — avoid (no-name, no certification, etc.)
    # Anything not matched falls to Tier D via fallback
]

# Brand-level fallback when specific model doesn't match
_PSU_BRAND_TIER: dict[str, str] = {
    "corsair": "B",
    "seasonic": "A",
    "evga": "B",
    "be quiet": "B",
    "cooler master": "B",
    "deepcool": "C",
    "antec": "C",
    "thermaltake": "C",
    "gigabyte": "C",
    "msi": "B",
    "nzxt": "B",
    "asus": "B",
    "super flower": "A",
    "silverstone": "C",
    "montech": "C",
    "xpg": "C",
    "fractal design": "B",
}

_TIER_SCORE = {"A": 95, "B": 75, "C": 50, "D": 25}


def psu_tier(name: str, brand: str = "") -> tuple[str, int]:
    """
    Return (tier_letter, score_0_100) for a PSU based on name/brand.
    """
    nl = name.lower()
    for pattern, tier in _PSU_TIER_PATTERNS:
        if re.search(pattern, nl):
            return tier, _TIER_SCORE[tier]

    # Brand-level fallback
    bl = brand.lower() if brand else ""
    for bkey, tier in _PSU_BRAND_TIER.items():
        if bkey in nl or bkey in bl:
            return tier, _TIER_SCORE[tier]

    # Unknown brand → Tier D
    return "D", _TIER_SCORE["D"]


# ─────────────────────────────────────────────────────────────────────────────
# RAM SPEED / CAS LATENCY TIERS
# ─────────────────────────────────────────────────────────────────────────────

def ram_tier(specs: dict) -> tuple[str, int]:
    """
    Rate RAM quality based on type, speed, and CAS latency.

    specs keys: ram_type, speed_mhz, cas_latency, ram_gb
    """
    ram_type = str(specs.get("ram_type") or "").upper()
    speed = float(specs.get("speed_mhz") or 0)
    cl = float(specs.get("cas_latency") or specs.get("cl") or 0)
    capacity = float(specs.get("ram_gb") or 0)

    score = 50  # baseline

    if ram_type == "DDR5":
        score += 10  # DDR5 inherent advantage
        if speed >= 6000:
            score += 25
        elif speed >= 5600:
            score += 20
        elif speed >= 5200:
            score += 15
        elif speed > 0:
            score += 5

        if cl > 0:
            if cl <= 30:
                score += 10
            elif cl <= 36:
                score += 5
            elif cl > 40:
                score -= 5

    elif ram_type == "DDR4":
        if speed >= 3600:
            score += 20
        elif speed >= 3200:
            score += 15
        elif speed >= 2666:
            score += 5
        elif speed > 0:
            score -= 5

        if cl > 0:
            if cl <= 16:
                score += 10
            elif cl <= 18:
                score += 5
            elif cl > 20:
                score -= 5

    # Reward higher capacities
    if capacity >= 64:
        score += 5
    elif capacity >= 32:
        score += 3

    return _classify(score), min(100, max(0, score))


# ─────────────────────────────────────────────────────────────────────────────
# SSD INTERFACE / SPEED TIERS
# ─────────────────────────────────────────────────────────────────────────────

def ssd_tier(specs: dict) -> tuple[str, int]:
    """
    Rate SSD quality based on interface, read/write speeds, capacity.

    specs keys: interface, nvme, read_speed, write_speed, storage_gb
    """
    interface = str(specs.get("interface") or "").lower()
    is_nvme = specs.get("nvme") in (True, 1, "1", "true", "True", "yes")
    read_speed = float(specs.get("read_speed") or 0)
    write_speed = float(specs.get("write_speed") or 0)
    capacity = float(specs.get("storage_gb") or 0)

    score = 40  # baseline

    # Interface tier
    if "gen5" in interface or "gen 5" in interface or "pcie 5" in interface:
        score += 35
    elif "gen4" in interface or "gen 4" in interface or "pcie 4" in interface:
        score += 25
    elif "gen3" in interface or "gen 3" in interface or "pcie 3" in interface:
        score += 15
    elif is_nvme or "nvme" in interface or "m.2" in interface:
        # NVMe without gen specified — assume Gen3
        score += 15
    elif "sata" in interface:
        score += 5
    elif is_nvme:
        score += 15
    else:
        score += 10  # unknown

    # Speed bonus
    if read_speed >= 7000:
        score += 10  # Gen5 territory
    elif read_speed >= 5000:
        score += 7   # Fast Gen4
    elif read_speed >= 3000:
        score += 4   # Gen3
    elif read_speed >= 500:
        score += 1   # SATA

    # Capacity bonus
    if capacity >= 2000:
        score += 5
    elif capacity >= 1000:
        score += 3

    return _classify(score), min(100, max(0, score))


# ─────────────────────────────────────────────────────────────────────────────
# MOTHERBOARD QUALITY TIER
# ─────────────────────────────────────────────────────────────────────────────

_MOBO_CHIPSET_TIER: dict[str, int] = {
    # AMD AM5
    "x670e": 95, "x670": 90, "b650e": 85, "b650": 75, "a620": 55,
    # AMD AM4
    "x570": 85, "b550": 70, "a520": 50, "b450": 55, "x470": 65,
    # Intel LGA1700 / LGA1851
    "z790": 90, "z690": 85, "b760": 70, "b660": 65, "h770": 70, "h670": 65,
    "z890": 95, "b860": 75, "h810": 65,
    # Intel older
    "z590": 80, "b560": 65, "h510": 50, "z490": 75, "b460": 60,
}

_MOBO_BRAND_TIER: dict[str, int] = {
    "asus": 10, "msi": 8, "gigabyte": 7, "asrock": 5,
}


def mobo_tier(name: str, brand: str = "", specs: dict | None = None) -> tuple[str, int]:
    """Rate a motherboard based on chipset, brand, and features."""
    nl = name.lower()
    score = 50  # baseline

    # Find chipset
    for chipset, bonus in _MOBO_CHIPSET_TIER.items():
        if chipset in nl:
            score = bonus
            break

    # Brand bonus
    bl = brand.lower() if brand else ""
    for bkey, bonus in _MOBO_BRAND_TIER.items():
        if bkey in bl or bkey in nl:
            score = min(100, score + bonus)
            break

    # Premium product lines get a bonus
    if any(k in nl for k in ["rog", "strix", "hero", "crosshair"]):
        score = min(100, score + 8)
    elif any(k in nl for k in ["tuf", "tomahawk", "mortar", "aorus"]):
        score = min(100, score + 4)
    elif any(k in nl for k in ["prime", "pro-art"]):
        score = min(100, score + 2)

    # WiFi is a value-add
    if specs and str(specs.get("wifi") or "").lower() in ("1", "true", "yes"):
        score = min(100, score + 3)

    return _classify(score), min(100, max(0, score))


# ─────────────────────────────────────────────────────────────────────────────
# CPU–GPU PAIRING / BOTTLENECK DETECTION
# ─────────────────────────────────────────────────────────────────────────────

_CPU_SCORE_TIERS = [
    (0,     12000,  "budget"),
    (12000, 24000,  "mid"),
    (24000, 38000,  "high"),
    (38000, 999999, "ultra"),
]

_GPU_SCORE_TIERS = [
    (0,     7000,   "budget"),
    (7000,  15000,  "mid"),
    (15000, 25000,  "high"),
    (25000, 999999, "ultra"),
]

def _measure_tier(val: float, tiers) -> str:
    for lo, hi, label in tiers:
        if lo <= val < hi:
            return label
    return "ultra"

# Pairing quality: how well does the CPU tier match the GPU tier?
_PAIRING_MATRIX = {
    # (cpu_tier, gpu_tier) → quality 0-100
    ("budget", "budget"): 85,
    ("budget", "mid"):    55,
    ("budget", "high"):   25,
    ("budget", "ultra"):  10,

    ("mid", "budget"):    60,
    ("mid", "mid"):       90,
    ("mid", "high"):      70,
    ("mid", "ultra"):     35,

    ("high", "budget"):   35,
    ("high", "mid"):      65,
    ("high", "high"):     90,
    ("high", "ultra"):    70,

    ("ultra", "budget"):  15,
    ("ultra", "mid"):     40,
    ("ultra", "high"):    65,
    ("ultra", "ultra"):   95,
}

def cpu_gpu_pairing_score(cpu_score: float, gpu_score: float) -> int:
    """
    Score how well-matched a CPU and GPU are based on Passmark benchmark tiers.
    Mismatches (e.g., ultra CPU + budget GPU) indicate bottlenecks.
    Returns 0-100.
    """
    if cpu_score <= 0 or gpu_score <= 0:
        return 50 # Fallback if missing
        
    ct = _measure_tier(cpu_score, _CPU_SCORE_TIERS)
    gt = _measure_tier(gpu_score, _GPU_SCORE_TIERS)
    return _PAIRING_MATRIX.get((ct, gt), 50)


# ─────────────────────────────────────────────────────────────────────────────
# USE-CASE COMPONENT REQUIREMENTS
# ─────────────────────────────────────────────────────────────────────────────

USECASE_REQUIREMENTS = {
    "Gaming": {
        "min_ram_gb": 16,
        "preferred_ram_type": "DDR5",
        "min_vram_gb": 6,
        "min_ssd_gb": 500,
        "min_psu_tier": "C",
        "description": "Prioritizes GPU performance, fast RAM, and a reliable PSU.",
    },
    "Editing": {
        "min_ram_gb": 32,
        "preferred_ram_type": "DDR5",
        "min_vram_gb": 8,
        "min_ssd_gb": 1000,
        "min_psu_tier": "C",
        "description": "Needs both CPU and GPU power, large RAM, fast storage.",
    },
    "AI-ML": {
        "min_ram_gb": 32,
        "preferred_ram_type": "DDR5",
        "min_vram_gb": 12,
        "min_ssd_gb": 1000,
        "min_psu_tier": "B",
        "description": "Maximizes GPU VRAM, needs lots of RAM and quality power delivery.",
    },
    "General Use": {
        "min_ram_gb": 8,
        "preferred_ram_type": "DDR4",
        "min_vram_gb": 0,
        "min_ssd_gb": 256,
        "min_psu_tier": "C",
        "description": "Excellent for daily tasks, office work, and web browsing. Prioritizes value CPU performance and fast storage over discrete graphics.",
    },
    "AI/ML": None,  # alias — resolved at runtime
}


def get_usecase_requirements(usecase: str) -> dict:
    """Get component requirements for a use case."""
    reqs = USECASE_REQUIREMENTS.get(usecase)
    if reqs is None:
        # Try alias
        reqs = USECASE_REQUIREMENTS.get("AI-ML") if "ai" in usecase.lower() or "ml" in usecase.lower() else USECASE_REQUIREMENTS.get("Gaming")
    return reqs or USECASE_REQUIREMENTS["Gaming"]


# ─────────────────────────────────────────────────────────────────────────────
# COMPOSITE COMPONENT QUALITY SCORE
# ─────────────────────────────────────────────────────────────────────────────

def component_quality_score(
    psu_part: dict,
    ram_part: dict,
    ssd_part: dict,
    mobo_part: dict,
    cpu_part: dict | None = None,
    gpu_part: dict | None = None,
) -> dict:
    """
    Compute a composite quality score (0-100) from individual component tiers.
    Also returns per-component breakdown.

    Returns:
    {
        "score": 72,
        "psu": {"tier": "B", "score": 75},
        "ram": {"tier": "B", "score": 70},
        "ssd": {"tier": "B", "score": 65},
        "mobo": {"tier": "A", "score": 85},
        "pairing": {"score": 90, "detail": "Well-matched CPU and GPU"},
    }
    """
    # PSU
    psu_t, psu_s = psu_tier(
        psu_part.get("name", ""),
        psu_part.get("brand", ""),
    )

    # RAM
    ram_t, ram_s = ram_tier(ram_part)

    # SSD
    ssd_t, ssd_s = ssd_tier(ssd_part)

    # Motherboard
    mobo_t, mobo_s = mobo_tier(
        mobo_part.get("name", ""),
        mobo_part.get("brand", ""),
        mobo_part,
    )

    # CPU-GPU pairing
    pairing_s = 70  # default if no GPU
    pairing_detail = "No discrete GPU"
    if cpu_part and gpu_part:
        pairing_s = cpu_gpu_pairing_score(
            float(cpu_part.get("benchmark_score") or 0),
            float(gpu_part.get("benchmark_score") or 0),
        )
        if pairing_s >= 80:
            pairing_detail = "Well-matched CPU and GPU"
        elif pairing_s >= 60:
            pairing_detail = "Acceptable CPU/GPU balance"
        elif pairing_s >= 40:
            pairing_detail = "Minor bottleneck detected"
        else:
            pairing_detail = "Significant CPU/GPU mismatch — bottleneck likely"

    # Composite: weighted average
    composite = (
        0.25 * psu_s +
        0.20 * ram_s +
        0.20 * ssd_s +
        0.20 * mobo_s +
        0.15 * pairing_s
    )

    return {
        "score": round(composite),
        "psu": {"tier": psu_t, "score": psu_s},
        "ram": {"tier": ram_t, "score": ram_s},
        "ssd": {"tier": ssd_t, "score": ssd_s},
        "mobo": {"tier": mobo_t, "score": mobo_s},
        "pairing": {"score": pairing_s, "detail": pairing_detail},
    }


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _classify(score: int) -> str:
    if score >= 85:
        return "A"
    elif score >= 65:
        return "B"
    elif score >= 45:
        return "C"
    else:
        return "D"


def part_quality_score(part: dict) -> int:
    """
    Quick quality score for a single part (used during part selection).
    """
    ptype = part.get("type", "")
    name = part.get("name", "")
    brand = part.get("brand", "")

    if ptype == "PSU":
        _, s = psu_tier(name, brand)
        return s
    elif ptype == "RAM":
        _, s = ram_tier(part)
        return s
    elif ptype == "SSD":
        _, s = ssd_tier(part)
        return s
    elif ptype == "MOBO":
        _, s = mobo_tier(name, brand, part)
        return s
    elif ptype in ("CPU", "GPU"):
        # Use benchmark score if available, otherwise approximate from price
        bench = part.get("benchmark_score")
        if bench and float(bench) > 0:
            return int(float(bench))
        # Fallback: use price as a rough proxy (higher price = generally better)
        return int(float(part.get("price", 0)) / 1000)
    else:
        return 50  # neutral for CASE/COOLER
