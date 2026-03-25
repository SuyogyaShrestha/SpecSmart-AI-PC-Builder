"""
scraper/auto_create.py — Auto-create Part entries from unmatched scraped products.

Parses specs from the product name (cores, VRAM, socket, RAM type, etc.)
and determines brand from common keywords.
"""
from __future__ import annotations
import re
import logging

from parts.models import Part

logger = logging.getLogger("scraper")


# ── Brand detection ─────────────────────────────────────────────────────────

_BRAND_RULES = {
    "CPU": [
        (r"\bamd\b|\bryzen\b|\bathlon\b", "AMD"),
        (r"\bintel\b|\bcore\b|\bceleron\b|\bpentium\b", "Intel"),
    ],
    "GPU": [
        (r"\bnvidia\b|\bgeforce\b|\brtx\b|\bgtx\b|\bgt\s?\d", "NVIDIA"),
        (r"\bamd\b|\bradeon\b|\brx\s?\d", "AMD"),
    ],
    "MOBO": [
        (r"\basus\b|\brog\b|\btuf\b|\bprime\b|\bstrix\b", "ASUS"),
        (r"\bmsi\b|\bmag\b|\btomahawk\b|\bmpg\b", "MSI"),
        (r"\bgigabyte\b|\baorus\b", "Gigabyte"),
        (r"\basrock\b", "ASRock"),
    ],
    "RAM": [
        (r"\bcorsair\b|\bvengeance\b|\bdominator\b", "Corsair"),
        (r"\bg\.?skill\b|\btrident\b|\bripjaws\b", "G.Skill"),
        (r"\bkingston\b|\bfury\b", "Kingston"),
        (r"\bteamgroup\b|\bt-force\b|\btforce\b", "TeamGroup"),
        (r"\badata\b|\bxpg\b", "ADATA"),
    ],
    "SSD": [
        (r"\bsamsung\b", "Samsung"),
        (r"\bwestern\s*digital\b|\bwd\b", "Western Digital"),
        (r"\bkingston\b", "Kingston"),
        (r"\bcrucial\b|\bmicron\b", "Crucial"),
        (r"\badata\b|\bxpg\b", "ADATA"),
        (r"\baddlink\b", "Addlink"),
    ],
    "PSU": [
        (r"\bcorsair\b", "Corsair"),
        (r"\bevga\b", "EVGA"),
        (r"\bseasonic\b", "Seasonic"),
        (r"\bcooler\s*master\b", "Cooler Master"),
        (r"\bdeepcool\b", "DeepCool"),
        (r"\bgigabyte\b|\baorus\b", "Gigabyte"),
        (r"\bmsi\b", "MSI"),
        (r"\bantec\b", "Antec"),
    ],
    "CASE": [
        (r"\bnzxt\b", "NZXT"),
        (r"\bcorsair\b", "Corsair"),
        (r"\bcooler\s*master\b", "Cooler Master"),
        (r"\bdeepcool\b", "DeepCool"),
        (r"\blian\s*li\b", "Lian Li"),
        (r"\bmontech\b", "Montech"),
        (r"\bgigabyte\b|\baorus\b", "Gigabyte"),
    ],
    "COOLER": [
        (r"\bnoctua\b", "Noctua"),
        (r"\bcorsair\b", "Corsair"),
        (r"\bcooler\s*master\b", "Cooler Master"),
        (r"\bdeepcool\b", "DeepCool"),
        (r"\bamd\b|\bwraith\b", "AMD"),
        (r"\bintel\b", "Intel"),
        (r"\bid-?cooling\b", "ID-Cooling"),
    ],
}


def _detect_brand(name: str, part_type: str) -> str:
    """Detect brand from product name using regex rules."""
    nl = name.lower()
    for pattern, brand in _BRAND_RULES.get(part_type, []):
        if re.search(pattern, nl):
            return brand
    return "Unknown"


# ── Spec extraction from product names ──────────────────────────────────────

def _extract_cpu_specs(name: str) -> dict:
    specs = {}
    nl = name.lower()
    # Socket
    if "am5" in nl: specs["socket"] = "AM5"
    elif "am4" in nl: specs["socket"] = "AM4"
    elif "lga1851" in nl: specs["socket"] = "LGA1851"
    elif "lga1700" in nl: specs["socket"] = "LGA1700"
    elif "lga1200" in nl: specs["socket"] = "LGA1200"
    else:
        # Infer socket from CPU model
        if any(k in nl for k in ["ryzen 9000", "ryzen 9 9", "ryzen 7 9", "ryzen 5 9", "9600x", "9700x", "9800x", "9900x", "9950x"]):
            specs["socket"] = "AM5"
        elif any(k in nl for k in ["ryzen 7000", "ryzen 9 7", "ryzen 7 7", "ryzen 5 7", "7600x", "7700x", "7800x", "7900x", "7950x"]):
            specs["socket"] = "AM5"
        elif any(k in nl for k in ["ryzen 5000", "5600", "5700", "5800", "5900", "5950"]):
            specs["socket"] = "AM4"
        elif any(k in nl for k in ["14th", "14900", "14700", "14600", "14400", "14100", "13th", "13900", "13700", "13600", "13400", "13100", "12th", "12900", "12700", "12600", "12400", "12100"]):
            specs["socket"] = "LGA1700"
    # Cores
    m = re.search(r"(\d+)\s*-?\s*core", nl)
    if m: specs["cores"] = int(m.group(1))
    # Threads
    m = re.search(r"(\d+)\s*-?\s*thread", nl)
    if m: specs["threads"] = int(m.group(1))
    # TDP
    m = re.search(r"(\d+)\s*w\b", nl)
    if m: specs["tdp"] = int(m.group(1))
    return specs


def _extract_gpu_specs(name: str) -> dict:
    specs = {}
    nl = name.lower()
    # VRAM
    m = re.search(r"(\d+)\s*gb", nl)
    if m: specs["vram_gb"] = int(m.group(1))
    # TDP (rough estimation based on model)
    if "4090" in nl or "3090" in nl: specs["tdp"] = 450
    elif "4080" in nl or "5080" in nl: specs["tdp"] = 320
    elif "4070" in nl or "5070" in nl: specs["tdp"] = 200
    elif "4060" in nl: specs["tdp"] = 115
    elif "3080" in nl: specs["tdp"] = 320
    elif "3070" in nl: specs["tdp"] = 220
    elif "3060" in nl: specs["tdp"] = 170
    elif "7900" in nl: specs["tdp"] = 300
    elif "7800" in nl: specs["tdp"] = 263
    elif "7600" in nl: specs["tdp"] = 150
    return specs


def _extract_mobo_specs(name: str) -> dict:
    specs = {}
    nl = name.lower()
    # Socket
    if "am5" in nl or "b650" in nl or "x670" in nl or "a620" in nl:
        specs["socket"] = "AM5"
        specs["ram_type"] = "DDR5"
    elif "am4" in nl or "b550" in nl or "x570" in nl or "b450" in nl or "a520" in nl:
        specs["socket"] = "AM4"
        specs["ram_type"] = "DDR4"
    elif "z790" in nl or "b760" in nl or "z690" in nl or "b660" in nl:
        specs["socket"] = "LGA1700"
        if "ddr4" in nl: specs["ram_type"] = "DDR4"
        else: specs["ram_type"] = "DDR5"
    elif "b560" in nl or "z590" in nl or "h510" in nl or "b460" in nl or "z490" in nl:
        specs["socket"] = "LGA1200"
        specs["ram_type"] = "DDR4"
    return specs


def _extract_ram_specs(name: str) -> dict:
    specs = {}
    nl = name.lower()
    if "ddr5" in nl: specs["ram_type"] = "DDR5"
    elif "ddr4" in nl: specs["ram_type"] = "DDR4"
    # Capacity
    m = re.search(r"(\d+)\s*gb", nl)
    if m: specs["ram_gb"] = int(m.group(1))
    return specs


def _extract_ssd_specs(name: str) -> dict:
    specs = {}
    nl = name.lower()
    # Capacity
    m = re.search(r"(\d+)\s*tb", nl)
    if m: specs["storage_gb"] = int(m.group(1)) * 1000
    else:
        m = re.search(r"(\d+)\s*gb", nl)
        if m: specs["storage_gb"] = int(m.group(1))
    if "nvme" in nl or "m.2" in nl or "pcie" in nl:
        specs["nvme"] = True
    return specs


def _extract_psu_specs(name: str) -> dict:
    specs = {}
    nl = name.lower()
    m = re.search(r"(\d+)\s*w\b", nl)
    if m: specs["psu_watts"] = int(m.group(1))
    return specs


def _extract_specs(name: str, part_type: str) -> dict:
    """Extract basic specs from product name based on type."""
    extractors = {
        "CPU": _extract_cpu_specs,
        "GPU": _extract_gpu_specs,
        "MOBO": _extract_mobo_specs,
        "RAM": _extract_ram_specs,
        "SSD": _extract_ssd_specs,
        "PSU": _extract_psu_specs,
    }
    fn = extractors.get(part_type)
    return fn(name) if fn else {}


def _clean_name(raw_name: str) -> str:
    """Clean up a scraped product name for DB storage."""
    # Remove common noise
    name = re.sub(r"\s*®|™|©", "", raw_name)
    # Remove "Desktop Processor" etc.
    name = re.sub(r"\b(desktop|processor|graphics card|graphic card)\b", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+", " ", name).strip()
    # Cap length
    return name[:200] if len(name) > 200 else name


def auto_create_part(product_name: str, price: float, part_type: str,
                     image_url: str = "") -> Part | None:
    """
    Create a new Part entry from a scraped product that didn't match any existing Part.

    Returns the created Part, or None if we can't determine enough info.
    """
    if not part_type:
        logger.debug("Cannot auto-create '%s' — no part_type", product_name)
        return None

    clean = _clean_name(product_name)
    brand = _detect_brand(product_name, part_type)
    specs = _extract_specs(product_name, part_type)

    if image_url:
        specs["image_url"] = image_url

    # Check for duplicate names to avoid creating the same part twice
    existing = Part.objects.filter(name__iexact=clean, type=part_type).first()
    if existing:
        logger.debug("Part already exists: '%s' (id=%d)", clean, existing.id)
        return existing

    part = Part.objects.create(
        name=clean,
        brand=brand,
        type=part_type,
        price=price,
        specs=specs,
        is_active=True,
    )
    logger.info("AUTO-CREATED Part: '%s' (%s, %s) id=%d, price=%.0f",
                clean, part_type, brand, part.id, price)
    return part
