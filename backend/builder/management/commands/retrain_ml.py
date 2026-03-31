import logging
from django.core.management.base import BaseCommand
from django.core.management import call_command

logger = logging.getLogger("builder.ml")

class Command(BaseCommand):
    help = "Master command to generate synthetic data and retrain the ML pipeline."

    def add_arguments(self, parser):
        parser.add_argument('--samples', type=int, default=2500, help='Number of builds to generate')

    def handle(self, *args, **options):
        samples = options['samples']
        
        self.stdout.write(self.style.WARNING("=== STEP 1/2: Generating Training Data ==="))
        try:
            call_command("generate_training_data", samples=samples)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Data generation failed: {e}"))
            return
            
        self.stdout.write(self.style.WARNING("\n=== STEP 2/2: Training Scikit-Learn Model ==="))
        try:
            call_command("train_ml_model")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Model training failed: {e}"))
            return

        # Invalidate in-memory cache so the running server picks up the new model
        try:
            from builder.services.generator_ml import _MODEL_CACHE
            import builder.services.generator_ml as ml_mod
            ml_mod._MODEL_CACHE = None
        except Exception:
            pass
            
        self.stdout.write(self.style.SUCCESS("\n✅ ML Pipeline successfully updated with new inventory!"))
