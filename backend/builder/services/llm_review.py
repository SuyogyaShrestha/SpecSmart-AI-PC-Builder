"""
builder/services/llm_review.py

LLM-powered build verification using Google Gemini API.
Produces detailed AI reviews of PC builds with strengths, weaknesses,
and recommendations.

This module serves as the foundation for the future chatbot feature.

Usage:
    Set GEMINI_API_KEY in your .env or Django settings.
    If the key is not set, the function returns a placeholder message.
"""
from __future__ import annotations
import os
import json
import logging

logger = logging.getLogger("builder.llm")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


def get_llm_build_review(
    parts: dict[str, dict],
    usecase: str = "Gaming",
    budget: float = 0,
    rule_scores: dict | None = None,
) -> dict:
    """
    Send a build to Gemini and get an expert AI review.

    Args:
        parts: dict mapping component type -> part dict (name, brand, price, specs)
        usecase: "Gaming", "Editing", or "AI-ML"
        budget: user budget in NPR
        rule_scores: dict with gaming, productivity, value, quality from rule engine

    Returns:
        {
            "available": True/False,
            "rating": int (0-100),
            "summary": str,
            "strengths": [str],
            "weaknesses": [str],
            "recommendations": [str],
            "bottleneck_analysis": str,
            "upgrade_paths": [str],
            "budget_alternatives": [str],
        }
    """
    if not GEMINI_API_KEY:
        return {
            "available": False,
            "rating": None,
            "summary": "AI Review requires a Gemini API key. Add GEMINI_API_KEY to your .env file to enable this feature.",
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
            "bottleneck_analysis": "",
            "upgrade_paths": [],
            "budget_alternatives": [],
        }

    # Build the prompt
    parts_description = []
    total_price = 0
    for comp_type, part in parts.items():
        if part:
            price = float(part.get("price") or 0)
            total_price += price
            specs_summary = []
            for k, v in (part.get("specs") or {}).items():
                if v and k not in ("image_url", "id", "part_id"):
                    specs_summary.append(f"{k}: {v}")
            parts_description.append(
                f"- {comp_type}: {part.get('brand','')} {part.get('name','')} "
                f"(NPR {price:,.0f}) [{', '.join(specs_summary[:8])}]"
            )

    from .knowledge import get_usecase_description
    usecase_desc = get_usecase_description(usecase)

    prompt = f"""You are an expert PC builder and hardware reviewer.
Analyze this PC build and provide a detailed review.

2024-2025 HARDWARE EVOLUTION (MANDATORY KNOWLEDGE):
- **AMD Ryzen 9000 (Zen 5)**: Native to AM5 socket. Significant IPC increases. Best paired with DDR5-6000 CL30 memory. Fully compatible with B650/X670 (BIOS update) and 800-series (X870/B850) motherboards.
- **AMD Radeon RX 9000 Series**: The latest high-performance Radeon architecture. Prioritize for high-end builds requiring extreme VRAM and efficiency.
- **Intel Core Ultra Series 2 (Arrow Lake)**: Uses the new LGA 1851 socket. Focus on massive efficiency gains and high-speed DDR5 support.
- **NVIDIA RTX 50-Series**: Top-tier performance. Be aware of high power requirements (use Tier A PSUs).

CRITICAL TUNING RULES:
1. **PSU Tiering**: Always cross-reference the estimated system wattage with the power supply. Only pair high-end RTX/Radeon GPUs with Tier A or Tier B rated PSUs (from Cultists Network).
2. **Bottleneck Prevention**: The CPU and GPU must be architecturally matched. Do not pair an Intel Core i9 or Ryzen 9 with an entry-level GPU (like an RTX 3050).
3. **Memory Latency**: For DDR5 RAM, prefer 6000MHz CL30 over slower speeds if budget permits.

**Use Case:** {usecase}
**Use Case Context:** {usecase_desc}
**Budget:** NPR {budget:,.0f}
**Total Price:** NPR {total_price:,.0f}
    
**Components:**
{chr(10).join(parts_description)}

**Rule Engine Scores:** {json.dumps(rule_scores or {}, indent=2)}

Respond in this exact JSON format:
{{
    "rating": <integer 0-100>,
    "summary": "<2-3 sentence overall assessment>",
    "strengths": ["<strength 1>", "<strength 2>", ...],
    "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
    "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
    "bottleneck_analysis": "<describe any CPU/GPU/RAM bottlenecks>",
    "upgrade_paths": ["<future upgrade 1>", "<future upgrade 2>", ...],
    "budget_alternatives": ["<If budget ++: get X>", "<If budget --: get Y>"]
}}

Be specific about the hardware. Reference actual specs and real-world performance. 
Consider the Nepal market context (NPR pricing).
Only respond with the JSON, nothing else."""

    try:
        from google import genai
        
        client = genai.Client(api_key=GEMINI_API_KEY)
        model_name = "gemini-2.5-flash" 
        
        response = client.models.generate_content(
            model=model_name,
            contents=prompt
        )
        
        # Parse the JSON response
        text = response.text.strip()
        # Remove markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]

        result = json.loads(text)
        result["available"] = True
        return result

    except ImportError:
        logger.warning("google-genai package not installed. Run: pip install google-genai")
        return {
            "available": False,
            "rating": None,
            "summary": "Install google-genai package: pip install google-genai",
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
            "bottleneck_analysis": "",
        }
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return {
            "available": False,
            "rating": None,
            "summary": f"AI Review error: {str(e)}",
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
            "bottleneck_analysis": "",
        }
