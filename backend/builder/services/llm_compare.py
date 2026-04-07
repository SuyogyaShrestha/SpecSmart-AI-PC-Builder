"""
builder/services/llm_compare.py

Advanced PC build comparison using Google Gemini API.
Compares two builds and provides a detailed expert briefing on which is better for the user's goals.
"""
from __future__ import annotations
import os
import json
import logging

logger = logging.getLogger("builder.llm")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


def get_llm_build_comparison(build_a: dict, build_b: dict) -> dict:
    """
    Compare two saved builds using Gemini.
    
    Args:
        build_a, build_b: dicts containing metadata (name, budget, total_price) 
                          and a list of parts (component type, name, brand, price, specs)
    """
    if not GEMINI_API_KEY:
        return {
            "available": False,
            "comparison_summary": "AI Comparison requires a Gemini API key. Add GEMINI_API_KEY to your .env file.",
            "winner": "N/A",
            "key_differences": [],
            "performance_analysis": "",
            "value_analysis": "",
            "verdict": "",
        }

    def format_build(build):
        parts_desc = []
        # build.build_data is a list of dicts: { component, part: { name, price, specs } }
        data = build.get("build_data") or []
        for row in data:
            part = row.get("part")
            if part:
                price = float(part.get("price") or 0)
                specs = part.get("specs") or {}
                specs_summary = [f"{k}: {v}" for k, v in specs.items() if v and k not in ("image_url", "id", "part_id")]
                parts_desc.append(
                    f"- {row.get('component')}: {part.get('brand','')} {part.get('name','')} "
                    f"(NPR {price:,.0f}) [{', '.join(specs_summary[:5])}]"
                )
        return (
            f"Build Name: {build.get('name')}\n"
            f"Total Price: NPR {float(build.get('total_price', 0)):,.0f}\n"
            f"Components:\n" + "\n".join(parts_desc)
        )

    prompt = f"""You are an expert PC hardware reviewer. Analyze and compare these two PC builds.

2024-2025 HARDWARE EVOLUTION (MANDATORY KNOWLEDGE):
- **AMD Ryzen 9000 (Zen 5)**: Native to AM5 socket. Significant IPC increases. Best paired with DDR5-6000 CL30 memory. Fully compatible with B650/X670 (BIOS update) and 800-series (X870/B850) motherboards.
- **AMD Radeon RX 9000 Series**: The latest high-performance Radeon architecture. Prioritize for high-end builds requiring extreme VRAM and efficiency.
- **Intel Core Ultra Series 2 (Arrow Lake)**: Uses the new LGA 1851 socket. Focus on massive efficiency gains and high-speed DDR5 support.
- **NVIDIA RTX 50-Series**: Top-tier performance. Be aware of high power requirements (use Tier A PSUs).

CRITICAL TUNING RULES:
1. **PSU Tiering**: Always cross-reference the estimated system wattage with the power supply. Only pair high-end RTX/Radeon GPUs with Tier A or Tier B rated PSUs (from Cultists Network).
2. **Bottleneck Prevention**: The CPU and GPU must be architecturally matched. Do not pair an Intel Core i9 or Ryzen 9 with an entry-level GPU (like an RTX 3050).

### BUILD A
{format_build(build_a)}

### BUILD B
{format_build(build_b)}

Respond in this exact JSON format:
{{
    "comparison_summary": "<2-3 sentence overview of how these builds differ in philosophy/target>",
    "winner": "<Build A / Build B / Tie>",
    "key_differences": [
        "<diff 1: e.g. Build A has 32GB RAM vs 16GB>",
        "<diff 2: e.g. Build B has a much stronger GPU but weaker CPU>",
        ...
    ],
    "performance_analysis": "<Brief comparison of gaming/productivity performance>",
    "value_analysis": "<Which build offers better performance per Rupee (NPR)?>",
    "verdict": "<Final recommendation on which one to choose and why>"
}}

Only respond with the JSON, nothing else."""

    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        model_name = "gemini-2.5-flash"

        response = client.models.generate_content(
            model=model_name,
            contents=prompt
        )

        text = response.text.strip()
        if text.startswith("```"):
            if "json" in text.split("\n", 1)[0].lower():
                text = text.split("\n", 1)[1]
            else:
                text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        
        result = json.loads(text)
        result["available"] = True
        return result

    except Exception as e:
        logger.error(f"Gemini Comparison API error: {e}")
        return {
            "available": False,
            "comparison_summary": f"AI Comparison error: {str(e)}",
            "winner": "Error",
            "key_differences": [],
            "performance_analysis": "",
            "value_analysis": "",
            "verdict": "",
        }
