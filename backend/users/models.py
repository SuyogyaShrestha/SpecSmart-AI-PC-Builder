from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        USER = "user", "User"
        ADMIN = "admin", "Admin"

    role = models.CharField(
        max_length=10, choices=Role.choices, default=Role.USER
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN
