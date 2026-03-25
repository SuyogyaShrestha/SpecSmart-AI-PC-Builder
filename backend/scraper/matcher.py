"""
scraper/matcher.py — Improved fuzzy matcher for scraped product names.

Key improvement: strips vendor-specific noise tokens (GHz, cores, threads,
socket names, OC/Gaming suffix, brand names) before fuzzy comparison so
"AMD Ryzen 9 9950X 4.3GHz 16-Core 32 Threads AM5 Gaming" matches "Ryzen 9 9950X".
"""
from __future__ import annotations
import logging
import re

from rapidfuzz import fuzz, process
from parts.models import Part

logger = logging.getLogger("scraper")

THRESHOLD = 55   # lowered from 65 — vendor names are noisy, token_sort_ratio handles it well

# Noise token patterns to remove before matching
_NOISE_PATTERNS = [
    r"\d+\.\d+\s*ghz",          # 4.3 GHz
    r"\d+\s*-?\s*core[s]?",     # 16-Core
    r"\d+\s*-?\s*thread[s]?",   # 32 Threads
    r"\b(am4|am5|lga\d+)\b",    # socket names
    r"\b(ddr4|ddr5)\b",
    r"\b(oc|gaming|windforce|ventus|eagle|pulse|dual|triple|tuf|rog|strix|prime|msi|asus|gigabyte|msi|evga|pny|palit|sapphire|xfx|powercolor|zotac|inno3d|asrock|acer)\b",
    r"\b(desktop|processor|graphics|card)\b",
    r"\b(intel|amd|nvidia)\b",   # brand names already in DB entry separately
    r"\d+\s*gb\b",               # 16GB (keep in name but strip from noise)
    r"®|™|©",
]
_NOISE_RE = re.compile("|".join(_NOISE_PATTERNS), re.IGNORECASE)


def _normalize(name: str) -> str:
    """Lowercase, strip noise tokens, collapse whitespace."""
    name = name.lower().strip()
    name = _NOISE_RE.sub(" ", name)
    name = re.sub(r"[^a-z0-9\s\-/]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def match_part(
    scraped_name: str,
    part_type: str | None = None,
    threshold: int = THRESHOLD,
) -> Part | None:
    """
    Find the best matching Part for a scraped product name.

    Args:
        scraped_name:  Raw product name from the vendor site.
        part_type:     If provided, restrict search to this type (CPU/GPU/...).
        threshold:     Minimum rapidfuzz score to accept a match (0-100).

    Returns:
        Matching Part object, or None if no good match found.
    """
    qs = Part.objects.filter(is_active=True)
    if part_type:
        qs = qs.filter(type=part_type.upper())

    parts = list(qs.only("id", "name", "brand"))
    if not parts:
        return None

    # Candidate strings: just the part name (brand adds confusion here)
    candidates    = [p.name for p in parts]
    norm_query    = _normalize(scraped_name)
    norm_cands    = [_normalize(c) for c in candidates]

    # Primary: token_sort_ratio (handles word-order differences)
    result = process.extractOne(
        norm_query,
        norm_cands,
        scorer=fuzz.token_sort_ratio,
    )

    if result is None or result[1] < threshold:
        # Fallback: partial_ratio catches sub-string matches like "RTX 5070" in a long name
        result2 = process.extractOne(
            norm_query,
            norm_cands,
            scorer=fuzz.partial_ratio,
        )
        if result2 is None or result2[1] < (threshold + 10):
            logger.debug("No match for '%s' (best token=%s, partial=%s)",
                         scraped_name,
                         result[1] if result else "N/A",
                         result2[1] if result2 else "N/A")
            return None
        result = result2

    matched_idx  = result[2]
    matched_part = parts[matched_idx]
    logger.info("Matched '%s' → '%s %s' (score=%s)",
                scraped_name, matched_part.brand, matched_part.name, result[1])
    return matched_part
