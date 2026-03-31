import os
import time
import json
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from parts.models import Part, Benchmark
from google import genai
from pydantic import BaseModel

logger = logging.getLogger("builder.benchmarks")

class BenchmarkResult(BaseModel):
    score: int
    source: str

class Command(BaseCommand):
    help = "Fetch missing benchmark scores for CPUs and GPUs using Gemini."

    def handle(self, *args, **options):
        api_key = os.environ.get("GEMINI_API_KEY", getattr(settings, "GEMINI_API_KEY", ""))
        if not api_key:
            self.stdout.write(self.style.ERROR("Warning: GEMINI_API_KEY is not set. Cannot fetch benchmarks."))
            return

        client = genai.Client(api_key=api_key)
        
        # Determine parts missing a benchmark score
        parts = Part.objects.filter(type__in=["CPU", "GPU"], is_active=True)
        missing_count = 0
        
        for part in parts:
            if not Benchmark.objects.filter(part=part).exists():
                missing_count += 1
                self.stdout.write(f"Fetching benchmark for {part.type}: {part.name}...")
                
                b_type = "cpu_mark" if part.type == "CPU" else "gpu_mark"
                if part.type == "CPU":
                    prompt = f"What is the average PassMark (CPUMark/CPU Mark) multi-core score for the CPU: {part.name}? Look it up or estimate it highly accurately. Output MUST be an integer."
                else:
                    prompt = f"What is the average PassMark (G3D Mark) score for the GPU: {part.name}? Look it up or estimate it highly accurately. Output MUST be an integer."
                
                try:
                    # Give it a delay to respect rate limits
                    time.sleep(1.5)
                    
                    response = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=prompt,
                        config={
                            "response_mime_type": "application/json",
                            "response_schema": BenchmarkResult,
                            "temperature": 0.2
                        }
                    )
                    
                    res_json = json.loads(response.text)
                    score = res_json.get("score")
                    source = res_json.get("source", "PassMark")
                    
                    if score and score > 0:
                        Benchmark.objects.create(
                            part=part,
                            benchmark_type=b_type,
                            score=score,
                            source=source
                        )
                        self.stdout.write(self.style.SUCCESS(f"  -> Saved {score} from {source}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"  -> Invalid score returned: {score}"))
                        
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"  -> Failed to fetch check Gemini API formatting constraints: {str(e)}"))

        self.stdout.write(self.style.SUCCESS(f"Finished. Fetched {missing_count} benchmarks."))
