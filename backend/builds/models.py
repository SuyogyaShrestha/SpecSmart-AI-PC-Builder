from django.db import models
from django.conf import settings
from parts.models import Part


class SavedBuild(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="builds",
    )
    name = models.CharField(max_length=200, default="My Build")
    tags = models.CharField(max_length=200, blank=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    usecase = models.CharField(max_length=80, default="Gaming")

    # Snapshot of the build rows as JSON:
    # [{ "component": "CPU", "type": "CPU", "part": {id, name, price, ...} }, ...]
    build_data = models.JSONField(default=list)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_public = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user.username} — {self.name}"
