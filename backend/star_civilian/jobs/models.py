from django.db import models
from django.conf import settings
from .validators import match_score_validators


class Occupation(models.Model):
    """
    Stores civilian occupation information retrieved from O*NET.
    """

    onet_code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Annual salary information
    salary_min = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    salary_max = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    salary_median = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    # Employment outlook information
    outlook = models.CharField(max_length=100, blank=True)
    outlook_details = models.TextField(blank=True)

    onet_url = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class MilitaryJobKeyword(models.Model):
    """
    Stores military job codes and keywords that connect
    military experience to civilian occupations.
    """

    BRANCH_CHOICES = [
        ("ARMY", "Army"),
        ("NAVY", "Navy"),
        ("AIR_FORCE", "Air Force"),
        ("MARINES", "Marine Corps"),
        ("COAST_GUARD", "Coast Guard"),
        ("SPACE_FORCE", "Space Force"),
    ]

    branch = models.CharField(
        max_length=20,
        choices=BRANCH_CHOICES,
        blank=True
    )

    CODE_TYPE_CHOICES = [
        ("MOS", "Military Occupational Specialty"),
        ("AFSC", "Air Force Specialty Code"),
        ("RATING", "Navy Rating"),
        ("OTHER", "Other Military Code"),
    ]

    code_type = models.CharField(
        max_length=20, 
        choices=CODE_TYPE_CHOICES, 
        default="OTHER"
    )

    military_title = models.CharField(
        max_length=255,
        blank=True
    )

    # Can store MOS, AFSC, rating, or another military keyword.
    military_keyword = models.CharField(max_length=100)

    # Connects military experience to civilian occupations.
    occupations = models.ManyToManyField(
        Occupation,
        blank=True,
        related_name="military_keywords"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["branch", "military_keyword"],
                name="unique_military_branch_keyword"
            )
        ]

    def __str__(self):
        return self.military_keyword


class JobMatch(models.Model):
    """
    Stores a user's civilian job matches based on their skills.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_matches"
    )

    occupation = models.ForeignKey(
        Occupation,
        on_delete=models.CASCADE,
        related_name="user_matches"
    )

    # Example: 85.50 represents an 85.5% skill match.
    match_score = models.DecimalField(
    max_digits=5,
    decimal_places=2,
    null=True,
    blank=True,
    validators=match_score_validators
)

    # Skills the user already has that match the occupation.
    matched_skills = models.JSONField(
        default=list,
        blank=True
    )

    # Skills the user may need to develop.
    missing_skills = models.JSONField(
        default=list,
        blank=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "occupation"],
                name="unique_user_occupation_match"
            )
        ]

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.occupation.title}"



