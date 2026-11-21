from django.db import models
from django.contrib.auth.models import User

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
    first_name = models.CharField(max_length= 50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=30)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    branch = models.CharField(max_length=15, choices=BRANCH_CHOICE, blank=True)     # Choice gives dropdown its values 
    job_code_or_title = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"