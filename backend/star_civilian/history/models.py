from django.conf import settings
from django.db import models


class Position(models.Model):
    """One job/billet the veteran held in service."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="positions")
    title = models.CharField(max_length=150)            # e.g. "Motor Transport Operator"
    unit = models.CharField(max_length=150, blank=True) # e.g. "3rd Marine Logistics Group"
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)  # blank = current
    duties = models.TextField(blank=True)               # what they did day to day
    achievements = models.TextField(blank=True)        # awards, results, numbers
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.title} ({self.user})"


class Credential(models.Model):
    """A certification, training course, award, or degree."""
    TYPE_CHOICES = [
        ("certification", "Certification"),
        ("training", "Training"),
        ("award", "Award"),
        ("education", "Education"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="credentials")
    name = models.CharField(max_length=150)              # e.g. "Hazmat Certification"
    credential_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    issuer = models.CharField(max_length=150, blank=True)
    date_earned = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_earned"]

    def __str__(self):
        return f"{self.name} ({self.user})"