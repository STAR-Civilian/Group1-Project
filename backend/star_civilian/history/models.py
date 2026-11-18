from django.conf import settings
from django.db import models


class Position(models.Model):
    """One job — military or civilian."""
    TYPE_CHOICES = [
        ("military", "Military"),
        ("civilian", "Civilian"),
    ]
    BRANCH_CHOICES = [
        ("army", "Army"),
        ("navy", "Navy"),
        ("air_force", "Air Force"),
        ("marine_corps", "Marine Corps"),
        ("coast_guard", "Coast Guard"),
        ("space_force", "Space Force"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="positions")
    experience_type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        default="military",   # ← military is the default
    )

    # Both
    title = models.CharField(max_length=150)                 # billet or job title
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)       # blank = current
    duties = models.TextField(blank=True)
    achievements = models.TextField(blank=True)

    # Military only
    branch = models.CharField(max_length=20, choices=BRANCH_CHOICES, blank=True)
    rank = models.CharField(max_length=50, blank=True)       # e.g. "Sergeant (E-5)"
    mos_code = models.CharField(max_length=20, blank=True)   # e.g. "3531"
    unit = models.CharField(max_length=150, blank=True)

    # Civilian only
    employer = models.CharField(max_length=150, blank=True)
    location = models.CharField(max_length=150, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.get_experience_type_display()}: {self.title} ({self.user})"


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
        ordering = [models.F("date_earned").desc(nulls_last=True)]   # undated last

    def __str__(self):
        return f"{self.name} ({self.user})"