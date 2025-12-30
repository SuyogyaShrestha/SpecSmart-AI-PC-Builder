from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            role="USER",   # normal register = USER
        )
        user.set_password(validated_data["password"])
        user.save()
        return user

class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role"]
