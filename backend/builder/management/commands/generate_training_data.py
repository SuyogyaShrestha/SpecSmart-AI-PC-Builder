import os
import csv
import logging
import random
from django.core.management.base import BaseCommand
from django.conf import settings
from builder.services.generator_rule import generate_build_rule

logger = logging.getLogger("builder.training")

class Command(BaseCommand):
    help = "Generates synthetic training data for the ML PC Build recommender."

    def add_arguments(self, parser):
        parser.add_argument('--samples', type=int, default=1000, help='Number of builds to generate')
        parser.add_argument('--output', type=str, default='data/training_builds.csv', help='Output CSV path')

    def handle(self, *args, **options):
        samples = options['samples']
        output_path = options['output']

        # Ensure output directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

        usecases = ["Gaming", "Editing", "AI-ML", "General Use"]
        budgets = [30000, 40000, 55000, 65000, 80000, 100000, 120000, 150000, 180000, 220000, 250000, 300000, 400000, 500000, 650000]
        brands = [None, "AMD", "Intel", "NVIDIA", "Gigabyte"] # Intentionally mixing some specific ones

        self.stdout.write("Caching parts database...")
        from parts.models import Part
        parts_by_type = {t: [] for t in ["CPU", "GPU", "MOBO", "RAM", "SSD", "PSU", "COOLER", "CASE"]}
        for p in Part.objects.filter(is_active=True).order_by("price"):
            parts_by_type[p.type].append(p.full_dict())

        self.stdout.write(f"Generating {samples} synthetic builds...")

        valid_combinations = []
        failures = 0

        for i in range(samples):
            budget = random.choice(budgets) + random.randint(-5000, 5000) # Fuzz the budget
            if budget < 20000:
                budget = 20000
                
            usecase = random.choice(usecases)
            cpu_brand = random.choice([None, "AMD", "Intel"])
            gpu_brand = random.choice([None, "NVIDIA", "AMD"])

            preferences = {
                "usecase": usecase,
                "cpu_brand": cpu_brand,
                "gpu_brand": gpu_brand
            }

            try:
                result = generate_build_rule(budget=budget, preferences=preferences, parts_by_type=parts_by_type)
                
                # Extract IDs
                part_ids = {comp["component"]: comp["part"]["id"] for comp in result["build"]}

                # We map the component strings we used in builder to the DB
                # "CPU", "GPU", "Motherboard", "RAM", "SSD", "PSU", "Case", "CPU Cooler"
                row = {
                    "budget": budget,
                    "usecase": usecase,
                    "cpu_brand_pref": cpu_brand or "",
                    "gpu_brand_pref": gpu_brand or "",
                    "cpu_id": part_ids.get("CPU", 0),
                    "gpu_id": part_ids.get("GPU", 0),
                    "mobo_id": part_ids.get("Motherboard", 0),
                    "ram_id": part_ids.get("RAM", 0),
                    "ssd_id": part_ids.get("SSD", 0),
                    "psu_id": part_ids.get("PSU", 0),
                    "case_id": part_ids.get("Case", 0),
                    "cooler_id": part_ids.get("CPU Cooler", 0),
                    "total_price": result.get("total_price", 0),
                    "quality_score": result.get("metrics", {}).get("score", 0) if result.get("metrics") else 0
                }
                
                # Only keep builds that actually assembled a complete core system
                if row["cpu_id"] and row["mobo_id"] and row["ram_id"] and row["ssd_id"] and row["psu_id"]:
                    valid_combinations.append(row)
                else:
                    failures += 1
                    
            except Exception as e:
                # Some tight budget constraints on brand might throw a ValueError, naturally filter them out
                failures += 1

            if i > 0 and i % 200 == 0:
                self.stdout.write(f"  Processed {i}/{samples}...")

        # Export to CSV
        if valid_combinations:
            keys = valid_combinations[0].keys()
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(valid_combinations)
                
            self.stdout.write(self.style.SUCCESS(f"Successfully generated {len(valid_combinations)} training samples (Failures: {failures}). Saved to {output_path}"))
        else:
            self.stdout.write(self.style.ERROR("Failed to generate any valid combinations."))
