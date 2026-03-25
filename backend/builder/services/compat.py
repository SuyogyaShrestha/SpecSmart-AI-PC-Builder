def estimate_watts(cpu, gpu):
    watts = 0
    if cpu: 
        watts += float((cpu or {}).get("tdp") or 0)
        watts += 40  # Motherboard + RAM 
    if gpu:
        watts += float((gpu or {}).get("tdp") or 0)
    
    if watts > 0:
        watts += 20  # Fans/Storage baseline
    
    return int(watts)

def psu_ok(psu, estimated_watts):
    watts = psu.get("psu_watts") or 0
    # 20% headroom
    required = int(estimated_watts * 1.2)
    return watts >= required, required

def socket_ok(cpu, mobo):
    return (cpu.get("socket") and mobo.get("socket") and cpu["socket"] == mobo["socket"])

def ram_ok(cpu, mobo, ram):
    # mobo ram_type must match ram ram_type
    return (mobo.get("ram_type") and ram.get("ram_type") and mobo["ram_type"] == ram["ram_type"])

def cooler_ok(cpu, cooler):
    if not cooler:
        return False
    # If using stock cooler
    if float(cooler.get("price") or 0) == 0:
        # Check if CPU actually includes a cooler
        inc = cpu.get("includes_cooler")
        return inc in (1, True, "1", "true", "True")
    
    # Aftermarket cooler: check TDP
    cpu_tdp = cpu.get("tdp") or 65
    cooler_tdp = cooler.get("tdp_support") or 0
    return float(cooler_tdp) >= float(cpu_tdp) * 1.2
