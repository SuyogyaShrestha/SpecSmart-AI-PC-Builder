from rest_framework import serializers
from .models import SavedBuild


class SavedBuildSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedBuild
        fields = [
            "id", "name", "tags", "budget", "usecase",
            "build_data", "total_price", "is_public",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
