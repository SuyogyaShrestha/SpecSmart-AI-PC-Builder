import os
import joblib
import pandas as pd
import logging
from django.conf import settings
from parts.models import Part
from builder.services.score_build import score_existing_build

logger = logging.getLogger("builder.ml_generator")

# Cache model in memory
_MODEL_CACHE = None

def _get_ml_model():
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE
    
    # Locate model deployment file
    model_path = os.path.join(settings.BASE_DIR, "builder", "ml", "build_recommender.joblib")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"ML Model not found at {model_path}. Please run train_ml_model first.")
    
    _MODEL_CACHE = joblib.load(model_path)
    return _MODEL_CACHE

def _load_part(pid: int) -> dict | None:
    """Load a Part by ID and return full_dict."""
    if not pid or pid == 0:
        return None
    try:
        p = Part.objects.get(id=int(pid), is_active=True)
        return p.full_dict()
    except Part.DoesNotExist:
        return None

def generate_build_ml(budget: float, preferences: dict = None, forced_ids: dict = None) -> dict:
    preferences = preferences or {}
    forced_ids = forced_ids or {}

    usecase = preferences.get("usecase", "Gaming")
    cpu_brand = preferences.get("cpu_brand") or "None"
    gpu_brand = preferences.get("gpu_brand") or "None"

    # Load ML pipeline
    try:
        bundle = _get_ml_model()
    except Exception as e:
        logger.error(f"Failed loading ML pipeline: {e}")
        # Gracefully handle missing model
        raise Exception("ML Recommendation pipeline is offline. Contact Administrator or run Model Training Routine.")

    pipeline = bundle["model"]
    targets_df = bundle["targets"]

    # Construct feature frame matching training data exactly
    query_df = pd.DataFrame([{
        "budget": float(budget),
        "usecase": usecase,
        "cpu_brand_pref": cpu_brand,
        "gpu_brand_pref": gpu_brand
    }])

    # Extract pipeline steps
    preprocessor = pipeline.named_steps['preprocessor']
    knn = pipeline.named_steps['knn']

    # Query the Nearest Neighbors
    transformed_query = preprocessor.transform(query_df)
    distances, indices = knn.kneighbors(transformed_query)

    # indices contains an array of the 25 nearest row indices. We want the one closest 
    # that doesn't significantly violate budget, or if they all violate budget, the tightest fit.
    best_row = None
    best_dist = float('inf')
    
    # Check top matches
    valid_rows = []
    
    for idx_group in indices:
        for i in idx_group:
            row = targets_df.iloc[i]
            valid_rows.append(row)
            
    # Try to find a row within budget + 5% leniency
    for row in valid_rows:
        if float(row.get('total_price', float('inf'))) <= float(budget) * 1.05:
            best_row = row
            break
            
    # If no row is within budget, find the one with the lowest price among neighbors
    if best_row is None and valid_rows:
        valid_rows.sort(key=lambda x: float(x.get('total_price', float('inf'))))
        best_row = valid_rows[0]

    if best_row is None:
        raise ValueError("Failed to retrieve any recommendations from the ML Pipeline.")

    # Override with forced_ids if requested by user logic
    part_mapping = {
        "CPU": forced_ids.get("CPU") or best_row.get("cpu_id"),
        "MOBO": forced_ids.get("MOBO") or best_row.get("mobo_id"),
        "RAM": forced_ids.get("RAM") or best_row.get("ram_id"),
        "GPU": forced_ids.get("GPU") or best_row.get("gpu_id"),
        "SSD": forced_ids.get("SSD") or best_row.get("ssd_id"),
        "PSU": forced_ids.get("PSU") or best_row.get("psu_id"),
        "COOLER": forced_ids.get("COOLER") or best_row.get("cooler_id"),
        "CASE": forced_ids.get("CASE") or best_row.get("case_id"),
    }

    build = []
    total_price = 0

    comp_target_names = {
        "CPU": "CPU", "COOLER": "CPU Cooler", "GPU": "GPU",
        "MOBO": "Motherboard", "RAM": "RAM", "SSD": "SSD",
        "CASE": "Case", "PSU": "PSU"
    }

    # Load from DB
    loaded_parts_map = {}
    for comp_key, label in comp_target_names.items():
        pid = part_mapping.get(comp_key)
        if pid and pd.notna(pid) and float(pid) > 0:
            part = _load_part(int(pid))
            if part:
                build.append({"component": label, "part": part})
                total_price += float(part.get("price", 0))
                loaded_parts_map[comp_key] = part.get("id")

    # Final scoring and compat validation
    scored = score_existing_build(loaded_parts_map, usecase)

    # Add extra price warnings
    over_by = total_price - float(budget)
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
        "reasoning": "This build was generated by our Machine Learning Recommendation Engine leveraging K-Nearest Neighbors optimized for performance budget allocation derived from thousands of high-fidelity PC configurations."
    }
