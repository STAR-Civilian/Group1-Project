from django.core.validators import MinValueValidator, MaxValueValidator


# Ensures a job match score is between 0 and 100.
match_score_validators = [
    MinValueValidator(0),
    MaxValueValidator(100),
]