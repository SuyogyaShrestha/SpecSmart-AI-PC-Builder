import re


_RAM_GB_CHOICES = {4, 8, 12, 16, 24, 32, 48, 64, 96, 128}


def _pick_reasonable_ram_gb(n: int):
    """Snap to common RAM sizes to avoid weird matches."""
    if n in _RAM_GB_CHOICES:
        return n
    bigger = sorted([x for x in _RAM_GB_CHOICES if x >= n])
    return bigger[0] if bigger else n


def parse_preferences_text(text: str):
    """
    Very light keyword + regex parsing.

    Returns a dict of derived preference hints.
    Generator should fall back gracefully if hints can't be satisfied.
    """
    if not text:
        return {}

    t = " ".join(str(text).strip().split()).lower()
    out = {"preferences_text": text}

    # ---- usecase ----
    if any(k in t for k in ["ai", "ml", "machine learning", "deep learning", "cuda", "pytorch", "tensorflow"]):
        out["usecase"] = "AI-ML"
    elif any(k in t for k in ["edit", "editing", "video", "premiere", "davinci", "after effects", "blender", "render"]):
        out["usecase"] = "Editing"
    elif any(k in t for k in ["game", "gaming", "valorant", "cs2", "gta", "fps"]):
        out["usecase"] = "Gaming"

    # ---- CPU brand ----
    if any(k in t for k in ["intel", "core i", "i3", "i5", "i7", "i9"]):
        out["cpu_brand"] = "Intel"
    if any(k in t for k in ["amd", "ryzen"]):
        out["cpu_brand"] = "AMD"

    # ---- GPU brand ----
    if any(k in t for k in ["nvidia", "geforce", "rtx", "gtx"]):
        out["gpu_brand"] = "NVIDIA"
    if any(k in t for k in ["radeon", "rx ", "amd gpu"]):
        out["gpu_brand"] = "AMD"
    if any(k in t for k in ["intel arc", "arc a", "arc"]):
        out["gpu_brand"] = "Intel"

    # ---- RAM ----
    m = re.search(r"(?:ram|memory)\s*(\d{1,3})\s*gb", t) or re.search(r"(\d{1,3})\s*gb\s*(?:ram|memory)", t)
    if m:
        try:
            out["ram_gb_min"] = _pick_reasonable_ram_gb(int(m.group(1)))
        except Exception:
            pass

    if "ddr5" in t:
        out["ram_type"] = "DDR5"
    elif "ddr4" in t:
        out["ram_type"] = "DDR4"

    # ---- Storage ----
    tb = re.search(r"(\d+(?:\.\d+)?)\s*tb\b", t)
    gb = re.search(r"(\d{3,4})\s*gb\s*(?:ssd|storage)", t)
    if tb:
        try:
            out["storage_gb_min"] = int(float(tb.group(1)) * 1024)
        except Exception:
            pass
    elif gb:
        try:
            out["storage_gb_min"] = int(gb.group(1))
        except Exception:
            pass

    if any(k in t for k in ["nvme", "m.2", "gen4", "pcie"]):
        out["prefer_nvme"] = True

    # ---- GPU VRAM ----
    m = re.search(r"(\d{1,2})\s*gb\s*vram", t)
    if m:
        try:
            out["vram_gb_min"] = int(m.group(1))
        except Exception:
            pass

    # ---- WiFi ----
    if any(k in t for k in ["wifi", "wi-fi", "wireless"]):
        out["wifi_required"] = True

    # ---- Cooler ----
    if any(k in t for k in ["aio", "liquid", "water cooling", "watercool"]):
        out["prefer_aio"] = True
    if any(k in t for k in ["air cooler", "aircool", "tower cooler"]):
        out["prefer_air"] = True

    # ---- Aesthetics (future use) ----
    if "white" in t:
        out["theme"] = "white"
    elif "black" in t or "dark" in t:
        out["theme"] = "black"
    if any(k in t for k in ["no rgb", "without rgb", "non rgb"]):
        out["no_rgb"] = True

    return out
