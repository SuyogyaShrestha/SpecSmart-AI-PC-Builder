from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from django.shortcuts import get_object_or_404
from parts.models import Part, PriceHistory as PriceHistoryModel, VendorListing

from .services.generator_llm import generate_build
from .services.swap import swap_and_rebuild
from .services.preferences import parse_preferences_text
from .services.validate_compat import check_compatibility
from .services.score_build import score_existing_build
from .services.chat_llm import generate_chat_response
from rest_framework.permissions import IsAuthenticated

# ---- Budget rules (tune later) ----
MIN_BUDGET = 50000.0   # MVP minimum
MAX_BUDGET = 10_000_000.0  # safety


def _parse_budget(value):
    """
    Returns (budget_float, error_message)
    """
    if value is None:
        return None, "budget required"

    try:
        b = float(value)
    except (TypeError, ValueError):
        return None, "budget must be a number"

    if b <= 0:
        return None, "budget must be greater than 0"

    if b < MIN_BUDGET:
        return None, f"budget too low. Minimum is {int(MIN_BUDGET)}"

    if b > MAX_BUDGET:
        return None, "budget too high"

    return b, None


def _attach_budget_flags(result: dict, budget: float):
    """
    Adds within_budget + over_by, and adds a warning if over budget.
    """
    try:
        total = float(result.get("total_price") or 0)
    except Exception:
        total = 0.0

    over_by = max(0.0, total - float(budget))
    result["within_budget"] = over_by <= 0.0
    result["over_by"] = round(over_by, 2)

    if over_by > 0:
        warnings = result.get("warnings") or []
        if not isinstance(warnings, list):
            warnings = [str(warnings)]
        warnings.append(f"Over budget by NPR {int(over_by):,}.")
        result["warnings"] = warnings

    return result


@api_view(["POST"])
@permission_classes([AllowAny])
def generate(request):
    budget_raw = request.data.get("budget")
    usecase = request.data.get("usecase", "Gaming")
    cpu_brand = request.data.get("cpu_brand")
    gpu_brand = request.data.get("gpu_brand")
    preferences_text = request.data.get("preferences_text")
    method = request.data.get("method", "ml")

    budget, err = _parse_budget(budget_raw)
    if err:
        return Response({"detail": err}, status=400)

    derived = parse_preferences_text(preferences_text)

    # dropdowns win over text-derived values
    merged_prefs = {
        **derived,
        "usecase": usecase,
        "cpu_brand": cpu_brand,
        "gpu_brand": gpu_brand,
    }

    try:
        if method == "llm":
            from .services.generator_llm import generate_build
            result = generate_build(budget=budget, preferences=merged_prefs)
        else:
            from .services.generator_ml import generate_build_ml
            result = generate_build_ml(budget=budget, preferences=merged_prefs)
            
        result = _attach_budget_flags(result, budget)
        return Response(result)
    except Exception as e:
        return Response({"detail": str(e)}, status=500)


@csrf_exempt
def swap_build(request):
    """
    POST body:
    {
      "budget": 150000,
      "usecase": "Gaming",
      "cpu_brand": "AMD",
      "gpu_brand": "NVIDIA",
      "current_build": [...],
      "swap": { "component": "GPU", "part_id": 123 }
    }
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        preferences_text = payload.get("preferences_text")
        derived = parse_preferences_text(preferences_text)
        budget, err = _parse_budget(payload.get("budget"))
        if err:
            return JsonResponse({"detail": err}, status=400)

        swap = payload.get("swap") or {}
        component = swap.get("component")
        part_id = swap.get("part_id")
        current_build = payload.get("current_build") or []

        preferences = {
            **derived,
            "usecase": payload.get("usecase", derived.get("usecase") or "Gaming"),
            "cpu_brand": payload.get("cpu_brand") or derived.get("cpu_brand") or None,
            "gpu_brand": payload.get("gpu_brand") or derived.get("gpu_brand") or None,
        }

        if component is None or part_id is None:
            return JsonResponse({"detail": "swap.component and swap.part_id required"}, status=400)

        result = swap_and_rebuild(
            budget=budget,
            preferences=preferences,
            current_build=current_build,
            component=str(component),
            new_part_id=int(part_id),
        )

        result = _attach_budget_flags(result, budget)
        return JsonResponse(result, status=200)

    except Exception as e:
        return JsonResponse({"detail": str(e)}, status=500)


@require_GET
def list_parts(request):
    """
    GET /api/build/parts/?type=CPU
    Returns basic part list for manual selection.
    """
    ptype = (request.GET.get("type") or "").strip().upper()
    if not ptype:
        return JsonResponse({"detail": "type query param required"}, status=400)

    qs = Part.objects.filter(type=ptype, is_active=True).order_by("price")[:300]
    items = [p.full_dict() for p in qs]

    return JsonResponse({"count": len(items), "results": items}, status=200)


def part_detail(request, part_id):
    p = get_object_or_404(Part, id=part_id, is_active=True)
    return JsonResponse(p.full_dict(), status=200)


@csrf_exempt
def fill_build(request):
    """
    POST body:
    {
      "budget": 150000,
      "usecase": "Gaming",
      "cpu_brand": "AMD",
      "gpu_brand": "NVIDIA",
      "current_build": [ {"component":"CPU","part":{"id":12}}, ... ]
    }
    Returns a full build while respecting provided current_build parts.
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        preferences_text = payload.get("preferences_text")
        derived = parse_preferences_text(preferences_text)

        budget, err = _parse_budget(payload.get("budget"))
        if err:
            return JsonResponse({"detail": err}, status=400)

        current_build = payload.get("current_build") or []

        preferences = {
            **derived,
            "usecase": payload.get("usecase", derived.get("usecase") or "Gaming"),
            "cpu_brand": payload.get("cpu_brand") or derived.get("cpu_brand") or None,
            "gpu_brand": payload.get("gpu_brand") or derived.get("gpu_brand") or None,
        }

        # Build forced_ids from current_build
        forced_ids = {}
        for row in current_build:
            comp = (row.get("component") or "").strip().upper()
            part = row.get("part") or {}
            pid = part.get("id")
            if not pid:
                continue

            # normalize naming to match generator types
            if comp == "MOTHERBOARD":
                comp = "MOBO"
            elif comp == "CPU COOLER":
                comp = "COOLER"

            forced_ids[comp] = int(pid)

        result = generate_build(
            budget=budget,
            preferences=preferences,
            forced_ids=forced_ids,
        )

        result = _attach_budget_flags(result, budget)
        return JsonResponse(result, status=200)

    except Exception as e:
        return JsonResponse({"detail": str(e)}, status=500)

@csrf_exempt
def validate_build(request):
    """
    POST body:
    {
      "budget": 150000,
      "usecase": "Gaming",
      "current_build": [ {"component":"CPU","part":{"id":12}}, ... ]
    }

    Scores the exact parts the user has selected — does NOT re-generate.
    Returns: { total_price, warnings, metrics, within_budget, over_by }
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")

        # Soft parse budget for validation (so typing "100" doesn't throw 400 errors)
        try:
            budget = float(payload.get("budget") or 0)
        except (TypeError, ValueError):
            budget = 0.0

        usecase = payload.get("usecase", "Gaming")
        current_build = payload.get("current_build") or []

        # Build part_ids from current_build
        part_ids = {}
        for row in current_build:
            comp = (row.get("component") or "").strip().upper()
            part = row.get("part") or {}
            pid = part.get("id")
            if not pid:
                continue
            if comp == "MOTHERBOARD":
                comp = "MOBO"
            elif comp == "CPU COOLER":
                comp = "COOLER"
            part_ids[comp] = int(pid)

        # Score exact parts — NO re-generation
        result = score_existing_build(part_ids, usecase=usecase)
        result = _attach_budget_flags(result, budget)

        return JsonResponse({
            "total_price": result.get("total_price"),
            "warnings": result.get("warnings") or [],
            "metrics": result.get("metrics"),
            "within_budget": result.get("within_budget"),
            "over_by": result.get("over_by"),
            "estimated_watts": result.get("estimated_watts", 0),
        }, status=200)

    except Exception as e:
        return JsonResponse({"detail": str(e)}, status=500)


@csrf_exempt
def compat_check(request):
    """
    POST body:
    { "current_build": [ {"component":"CPU","part":{"id":12}}, ... ] }

    Returns ONLY compatibility warnings — NO ML scoring.
    Designed for real-time manual builder feedback.
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        current_build = payload.get("current_build") or []

        part_ids = {}
        for row in current_build:
            comp = (row.get("component") or "").strip().upper()
            part = row.get("part") or {}
            pid = part.get("id")
            if not pid:
                continue
            if comp == "MOTHERBOARD":
                comp = "MOBO"
            elif comp == "CPU COOLER":
                comp = "COOLER"
            part_ids[comp] = int(pid)

        result = check_compatibility(part_ids)
        return JsonResponse(result, status=200)

    except Exception as e:
        return JsonResponse({"detail": str(e)}, status=500)


@require_GET
def price_history(request, part_id):
    """
    GET /api/build/parts/<id>/price-history/?days=90
    Returns price history for a part across all vendors.
    """
    days = int(request.GET.get("days", 90))
    part = get_object_or_404(Part, id=part_id, is_active=True)

    from datetime import timedelta
    from django.utils import timezone
    cutoff = timezone.now().date() - timedelta(days=days)

    listings = VendorListing.objects.filter(part=part, is_active=True).select_related("vendor")
    result = []

    for listing in listings:
        history = (
            PriceHistoryModel.objects
            .filter(listing=listing, date__gte=cutoff)
            .order_by("date")
            .values_list("date", "price", "in_stock")
        )
        if history:
            result.append({
                "vendor": listing.vendor.name,
                "vendor_slug": listing.vendor.vendor_slug,
                "product_url": listing.product_url,
                "data": [
                    {
                        "date": str(d),
                        "price": float(p),
                        "in_stock": s,
                    }
                    for d, p, s in history
                ],
            })

    return JsonResponse({
        "part_id": part.id,
        "part_name": part.name,
        "vendors": result,
    })


@csrf_exempt
def ai_review(request):
    """
    POST body:
    {
      "budget": 150000,
      "usecase": "Gaming",
      "current_build": [ {"component":"CPU","part":{"id":12}}, ... ]
    }

    Returns an LLM-generated expert review of the build.
    Requires GEMINI_API_KEY env variable.
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        budget, _ = _parse_budget(payload.get("budget"))
        usecase = payload.get("usecase", "Gaming")
        current_build = payload.get("current_build") or []

        # Build part dicts
        parts_dict = {}
        part_ids = {}
        for row in current_build:
            comp = (row.get("component") or "").strip().upper()
            part = row.get("part") or {}
            pid = part.get("id")
            if not pid:
                continue
            if comp == "MOTHERBOARD":
                comp = "MOBO"
            elif comp == "CPU COOLER":
                comp = "COOLER"
            part_ids[comp] = int(pid)

        # Load full part data
        for comp, pid in part_ids.items():
            try:
                p = Part.objects.get(id=pid, is_active=True)
                parts_dict[comp] = p.full_dict()
            except Part.DoesNotExist:
                pass

        # Get rule-based scores first
        rule_scores = score_existing_build(part_ids, usecase=usecase).get("metrics")

        # Get LLM review
        from .services.llm_review import get_llm_build_review
        review = get_llm_build_review(
            parts=parts_dict,
            usecase=usecase,
            budget=budget or 0,
            rule_scores=rule_scores,
        )

        return JsonResponse({"review": review}, status=200)

    except Exception as e:
        return JsonResponse({"detail": str(e)}, status=500)


# ---- Chat API ----

@api_view(['POST'])
@permission_classes([AllowAny])
def chat_api(request):
    """
    Handle chat requests from the frontend.
    Requires user to be logged in.
    Accepts:
    {
        "history": [{"role": "user", "content": "..."}, {"role": "model", "content": "..."}],
        "message": "new user message"
    }
    """
    try:
        data = json.loads(request.body)
        history = data.get("history", [])
        new_Message = data.get("message", "").strip()

        if not new_Message:
            return JsonResponse({"error": "Message cannot be empty"}, status=400)

        response_text = generate_chat_response(history, new_Message)

        return JsonResponse({
            "response": response_text
        })
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

