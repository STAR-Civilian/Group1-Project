from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinLengthValidator
from .validators import validate_starts_with_uppercase
from .validators import validate_starts_with_uppercase, validate_city, validate_phone

# Create your models here.
class Profile(models.Model):
    BRANCH_CHOICE = [
        ("army", "Army"),
        ("navy", "Navy"),
        ("air_force", "Air Force"),
        ("marine_corps", "Marine Corps"),
        ("space_force", "Space Force"),
        ("coast_guard", "Coast Guard"),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")     # OneToOneField each user has one profile
    first_name = models.CharField(max_length=50, validators=[validate_starts_with_uppercase])
    last_name = models.CharField(max_length=50, validators=[validate_starts_with_uppercase, MinLengthValidator(2, message="Last name must be at least 2 letters.")],)   # at least 2 characters
    phone = models.CharField(max_length=30, blank=True, validators=[validate_phone])   # optional
    city = models.CharField(max_length=100, validators=[validate_city])
    state = models.CharField(max_length=2)
    branch = models.CharField(max_length=15, choices=BRANCH_CHOICE, blank=True)     # Choice gives dropdown its values 
    job_code_or_title = models.CharField(max_length=100, blank=True)
    # optional links for the resume header
    linkedin_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)
    website_url = models.URLField(blank=True)
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"