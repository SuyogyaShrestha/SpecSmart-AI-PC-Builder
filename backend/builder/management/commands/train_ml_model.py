import os
import pandas as pd
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib

logger = logging.getLogger("builder.ml")

class Command(BaseCommand):
    help = "Train the ML model from synthetic data."

    def add_arguments(self, parser):
        parser.add_argument('--input', type=str, default='data/training_builds.csv', help='Input CSV path')
        parser.add_argument('--output', type=str, default='builder/ml/build_recommender.joblib', help='Output model path')

    def handle(self, *args, **options):
        input_path = os.path.abspath(options['input'])
        output_path = os.path.abspath(options['output'])

        if not os.path.exists(input_path):
            self.stdout.write(self.style.ERROR(f"Input file {input_path} not found. Run generate_training_data first."))
            return

        self.stdout.write("Loading datasets...")
        df = pd.read_csv(input_path)

        # Prepare features X
        X = df[['budget', 'usecase', 'cpu_brand_pref', 'gpu_brand_pref']].copy()
        
        # Replace empty/NaN with "None" string mapping
        X.fillna("None", inplace=True)
        # Convert any empty strings "" to "None"
        X.replace("", "None", inplace=True)
        
        # Numerical scaling
        numeric_features = ['budget']
        # We manually weight budget higher so the KNN doesn't excessively prioritize brand matching
        # over staying within budget.
        
        # Categorical one-hot encoding
        categorical_features = ['usecase', 'cpu_brand_pref', 'gpu_brand_pref']
        categorical_transformer = OneHotEncoder(handle_unknown='ignore')

        preprocessor = ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), numeric_features),
                ('cat', categorical_transformer, categorical_features)
            ])
            
        # The NearestNeighbors algorithm acts as our ML Recommendation block.
        # It queries the dense multidimensional space of the training output combinations
        # to find structurally similar and validated builds to requested parameters.
        pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('knn', NearestNeighbors(n_neighbors=25, algorithm='auto', metric='euclidean'))
        ])

        self.stdout.write("Fitting the ML model...")
        pipeline.fit(X)

        # The target block of actual compatible hardware configurations + scoring indicators
        y = df[['cpu_id', 'gpu_id', 'mobo_id', 'ram_id', 'ssd_id', 'psu_id', 'case_id', 'cooler_id', 'total_price', 'quality_score']]
        
        bundle = {
            "model": pipeline,
            "targets": y
        }

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        joblib.dump(bundle, output_path)

        self.stdout.write(self.style.SUCCESS(f"Successfully trained ML recommender pipeline on {len(df)} combinations and saved to {output_path}"))
