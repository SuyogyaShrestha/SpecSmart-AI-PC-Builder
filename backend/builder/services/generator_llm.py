import os
import json
import logging
from parts.models import Part
from django.conf import settings
from .compat import estimate_watts
from google import genai
from pydantic import BaseModel
from typing import Optional, List

logger = logging.getLogger("builder.generator")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", getattr(settings, "GEMINI_API_KEY", ""))

class BuildResponse(BaseModel):
    cpu_id: int
    mobo_id: int
    ram_id: int
    gpu_id: Optional[int]
    ssd_id: int
    psu_id: int
    cooler_id: Optional[int]
    case_id: Optional[int]
    reasoning: str

def _get_part_by_id(part_id: int):
    try:
        p = Part.objects.get(id=int(part_id), is_active=True)
        return p.full_dict()
    except Part.DoesNotExist:
        return None

def _compress_part(p: dict) -> dict:
    """Compress part dictionary to save prompt tokens."""
    return {
        "id": p.get("id"),
        "brand": p.get("brand"),
        "name": p.get("name"),
        "price": float(p.get("price") or 0),
        "score": p.get("specs", {}).get("score", 0),  # Rough performance indicator
        "socket": p.get("specs", {}).get("socket", ""),
        "ram_type": p.get("specs", {}).get("ram_type", ""),
        "psu_watts": p.get("specs", {}).get("psu_watts", 0),
        "vram_gb": p.get("specs", {}).get("vram_gb", 0),
        "ram_gb": p.get("specs", {}).get("ram_gb", 0) or p.get("specs", {}).get("capacity_gb", 0),
        "storage_gb": p.get("specs", {}).get("storage_gb", 0),
    }

def generate_build(budget: float, preferences: dict = None, forced_ids: dict = None) -> dict:
    preferences = preferences or {}
    forced_ids = forced_ids or {}
    budget = float(budget)
    usecase = preferences.get("usecase", "Gaming")

    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing. Cannot generate LLM build.")

    # Load and compress active parts pool
    parts_by_type = {
        t: [_compress_part(p.full_dict()) for p in Part.objects.filter(type=t, is_active=True)]
        for t in ["CPU", "GPU", "MOBO", "RAM", "SSD", "PSU", "COOLER", "CASE"]
    }
    
    # Optional logic: Apply strict filters before sending to LLM to save tokens
    cpu_brand = preferences.get("cpu_brand")
    if cpu_brand and "CPU" not in forced_ids:
        parts_by_type["CPU"] = [p for p in parts_by_type["CPU"] if p["brand"].lower() == cpu_brand.lower()]
        
    gpu_brand = preferences.get("gpu_brand")
    if gpu_brand and "GPU" not in forced_ids:
        parts_by_type["GPU"] = [p for p in parts_by_type["GPU"] if p["brand"].lower() == gpu_brand.lower()]
        
    # Filter out parts that exceed 120% of the entire budget to save tokens.
    # We send up to 300 parts per category to ensure high-end items are included for high budgets.
    # (Gemini 2.5 Flash easily handles this larger context).
    for k in parts_by_type:
        valid_parts = [p for p in parts_by_type[k] if float(p.get("price") or 0) <= budget * 1.2]
        parts_by_type[k] = sorted(valid_parts, key=lambda x: float(x.get("price") or 0))[:300]

    # Gather forced parts
    forced_strings = []
    if forced_ids:
        for comp, pid in forced_ids.items():
            comp_part = _get_part_by_id(pid)
            if comp_part:
                forced_strings.append(f"MUST USE {comp} with ID {pid} ({comp_part['name']} - NPR {comp_part['price']}).")

    prompt = f"""You are an elite PC Builder building systems for the Nepali market.
You MUST choose exactly one part from each category (except GPU/Cooler/Case which are optional but recommended).
The total price of parts must not exceed the budget by more than 5-10%, preferably under.
Output MUST strictly conform to the expected JSON schema.

**Budget constraints:** NPR {budget:,.0f}
**User Intent / Usecase:** {usecase}
**User Preferences:** {preferences.get('preferences_text', 'None')}

**Hard Requirements:**
{chr(10).join(forced_strings) if forced_strings else "None"}
- Motherboard "socket" MUST EXACTLY MATCH CPU "socket".
- Motherboard "ram_type" MUST EXACTLY MATCH RAM "ram_type".
- PSU watts MUST be higher than estimated system wattage.

**Available Components Catalog (JSON arrays):**
{json.dumps(parts_by_type)}
"""

    SYSTEM_EXPERT_PERSONA = """You are an Elite Systems Integrator and PC Hardware Expert. 
Your core directive is to design perfectly balanced, high-performance PC builds.

CRITICAL TUNING RULES (MANDATORY):
1. **PSU Tiering**: Always cross-reference the estimated system wattage with the power supply. Only pair high-end RTX/Radeon GPUs with Tier A or Tier B rated PSUs (from Cultists Network). Never recommend a generic or Tier C PSU for a high-budget build.
2. **Bottleneck Prevention**: The CPU and GPU must be architecturally matched. Do not pair an Intel Core i9 or Ryzen 9 with an entry-level GPU (like an RTX 3050).
3. **Memory Latency**: For DDR5 RAM, prefer 6000MHz CL30 over slower speeds if budget permits.
4. **VRM & Cooling**: High TDP processors mandatory require robust Motherboards (good VRMs) and powerful Coolers (240mm+ AIOs or dual-tower air coolers). Do not pair a 150W+ TDP CPU with a cheap A620 motherboard or a stock/weak cooler.
5. **Physical Clearances**: Consider the form factor. Ensure the motherboard (ATX/Micro-ATX/ITX) physically fits in the requested case.
6. **Budget Adherence**: You are highly penalized for exceeding the requested budget constraints.

When building, act as a master technician. Output precisely calculated hardware combinations."""

    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # We use Structured Outputs to guarantee we get IDs back
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "system_instruction": SYSTEM_EXPERT_PERSONA,
            "response_mime_type": "application/json",
            "response_schema": list[BuildResponse],
        },
    )
    
    # Process output
    text = response.text.strip()
    try:
        # LLM returns a list with one item or a single dictionary
        output = json.loads(text)
        if isinstance(output, list) and len(output) > 0:
            res_json = output[0]
        else:
            res_json = output
            
        return _assemble_build_from_ids(res_json, forced_ids)
    except Exception as e:
        logger.error(f"GenAI Parsing Error: {e} | Text: {text}")
        raise ValueError("Failed to parse AI generated build.")

def _assemble_build_from_ids(res_json: dict, forced_ids: dict):
    # Mapping the LLM response to component types
    reqs = {
        "CPU": res_json.get("cpu_id"),
        "MOBO": res_json.get("mobo_id"),
        "RAM": res_json.get("ram_id"),
        "GPU": res_json.get("gpu_id"),
        "SSD": res_json.get("ssd_id"),
        "PSU": res_json.get("psu_id"),
        "COOLER": res_json.get("cooler_id"),
        "CASE": res_json.get("case_id"),
    }
    
    # Override with forced_ids if LLM hallucinated
    for comp, fid in forced_ids.items():
        if fid:
            reqs[comp.upper()] = fid

    build = []
    total_price = 0
    warnings = []
    
    # We use explicit naming for frontend matching
    comp_target_names = {
        "CPU": "CPU",
        "COOLER": "CPU Cooler",
        "GPU": "GPU",
        "MOBO": "Motherboard",
        "RAM": "RAM",
        "SSD": "SSD",
        "CASE": "Case",
        "PSU": "PSU"
    }

    cpu_part, gpu_part = None, None
    for comp_key, name in comp_target_names.items():
        pid = reqs.get(comp_key)
        if pid:
            part = _get_part_by_id(pid)
            if part:
                build.append({"component": name, "part": part})
                total_price += float(part.get("price") or 0)
                if comp_key == "CPU": cpu_part = part
                if comp_key == "GPU": gpu_part = part

    est_watts = estimate_watts(cpu_part or {}, gpu_part or {})

    return {
        "build": build,
        "total_price": total_price,
        "metrics": None, # Removed per user preference
        "estimated_watts": est_watts,
        "compatible": len(warnings) == 0,
        "warnings": warnings,
        "alternatives": {"CPU": [], "GPU": []},
        "reasoning": res_json.get("reasoning", "")
    }
