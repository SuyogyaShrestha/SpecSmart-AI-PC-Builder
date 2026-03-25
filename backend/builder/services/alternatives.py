def top_alternatives(candidates, chosen_id, k=3, price_window=0.30):
    """
    Try within ±price_window first.
    If not enough results, fall back to best remaining overall.
    """
    chosen = next((c for c in candidates if c["id"] == chosen_id), None)
    if not chosen:
        return []

    base_price = chosen["price"]
    low = base_price * (1 - price_window)
    high = base_price * (1 + price_window)

    others = [c for c in candidates if c["id"] != chosen_id]

    # 1) try within window
    window_alts = [c for c in others if low <= c["price"] <= high]
    window_alts = sorted(window_alts, key=lambda x: x.get("utility", 0), reverse=True)

    if len(window_alts) >= k:
        return window_alts[:k]

    # 2) fallback: top overall (by utility)
    overall = sorted(others, key=lambda x: x.get("utility", 0), reverse=True)
    combined = window_alts + [c for c in overall if c not in window_alts]
    return combined[:k]


def upgrade_path(pool, chosen_id, k=3, usecase="Gaming", ptype="CPU"):
    """
    Return the best k parts from the FULL pool that are better + more expensive.
    Weight the score conceptually based on usecase.
    """
    chosen = next((c for c in pool if c["id"] == chosen_id), None)
    if not chosen:
        return []

    chosen_s = chosen.get("score", 0)
    chosen_price = chosen.get("price", 0)
    max_upgrade_price = chosen_price * 2.5  # Cap: don't jump to 3× the price

    # Find parts that are strictly an upgrade in raw score and cost more
    others = [c for c in pool if c["id"] != chosen_id
              and c.get("price", 0) > chosen_price
              and c.get("price", 0) <= max_upgrade_price]

    upgrades = []
    for c in others:
        base_score = c.get("score", 0)
        if base_score <= chosen_s:
            continue
            
        weight = 1.0
        name = str(c.get("name", "")).upper()
        
        # Usecase weighting
        if ptype == "CPU":
            if usecase == "Gaming" and "X3D" in name:
                weight = 1.15
            elif usecase in ["Editing", "AI-ML"]:
                cores = float(c.get("cores") or 1)
                if cores >= 12:
                    weight = 1.15
                elif cores >= 8:
                    weight = 1.05
        elif ptype == "GPU":
            if usecase == "AI-ML":
                vram = float(c.get("vram_gb") or 8)
                if vram >= 16:
                    weight = 1.20
                if str(c.get("brand", "")).upper() == "NVIDIA":
                    weight *= 1.10
            elif usecase == "Editing":
                if str(c.get("brand", "")).upper() == "NVIDIA":
                    weight *= 1.05

        c["upgrade_score"] = base_score * weight
        upgrades.append(c)

    # Rank upgrades by value delta (performance gained per dollar spent)
    for u in upgrades:
        diff_score = max(0.1, u["upgrade_score"] - chosen_s)
        diff_price = max(1.0, u["price"] - chosen_price)
        # Avoid recommending an upgrade that is just $1 more for 0.1 score.
        # Prefer meaningful jumps by giving a slight bonus to absolute performance.
        u["upgrade_value"] = (diff_score / diff_price) * (1 + (diff_score / 10000))

    upgrades = sorted(upgrades, key=lambda x: x.get("upgrade_value", 0), reverse=True)

    result = []
    # Make sure we don't spam 3 variations of the same tier, though top K is fine.
    for u in upgrades[:k]:
        result.append({
            "part": u,
            "extra_cost": round(u["price"] - chosen_price, 2),
        })
    return result


def capacity_upgrade_path(pool, chosen_id, k=2, capacity_key="ram_gb"):
    """
    Upgrade path for capacity-based parts (RAM, SSD).
    Returns parts with more capacity, ranked by capacity-per-NPR.
    """
    chosen = next((c for c in pool if c["id"] == chosen_id), None)
    if not chosen:
        return []

    chosen_cap = float(chosen.get(capacity_key) or 0)
    chosen_price = float(chosen.get("price") or 0)
    max_price = chosen_price * 2.5

    upgrades = []
    for c in pool:
        if c["id"] == chosen_id:
            continue
        cap = float(c.get(capacity_key) or 0)
        price = float(c.get("price") or 0)
        if cap <= chosen_cap or price <= chosen_price or price > max_price:
            continue
        cap_gain = cap - chosen_cap
        price_gain = price - chosen_price
        c["upgrade_value"] = cap_gain / max(price_gain, 1)
        upgrades.append(c)

    upgrades.sort(key=lambda x: x.get("upgrade_value", 0), reverse=True)
    return [{"part": u, "extra_cost": round(u["price"] - chosen_price, 2)} for u in upgrades[:k]]
