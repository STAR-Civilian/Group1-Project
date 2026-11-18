from django.conf import settings
from django.db import models


class Resume(models.Model):
    """A resume written for one target job. Belongs to one user."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resumes",
    )
    target_job_title = models.CharField(max_length=150)        # e.g. "Logisticians"
    onet_code = models.CharField(max_length=20, blank=True)    # e.g. "13-1081.00"
    mos_code = models.CharField(max_length=20, blank=True)     # blank for career changers
    content = models.JSONField(default=dict)                   # summary, skills, experience, ...
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.target_job_title} ({self.user})"


class StarAnswer(models.Model):
    """One interview question and its STAR answer, written from a resume."""

    resume = models.ForeignKey(
        Resume,
        on_delete=models.CASCADE,
        related_name="star_answers",
    )
    question = models.CharField(max_length=300)
    skill = models.CharField(max_length=100, blank=True)   # e.g. "Organization"
    situation = models.TextField(blank=True)
    task = models.TextField(blank=True)
    action = models.TextField(blank=True)
    result = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.question