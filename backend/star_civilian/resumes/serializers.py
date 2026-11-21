from rest_framework import serializers

from .models import JobFit, Resume, StarAnswer

from llm.validators import validate_resume

class ResumeListSerializer(serializers.ModelSerializer):
    """Short version for the list page: no content."""

    class Meta:
        model = Resume
        fields = ["id", "target_job_title", "onet_code", "mos_code", "created_at", "updated_at"]


class ResumeSerializer(serializers.ModelSerializer):
    """Full version for opening or editing one resume."""

    class Meta:
        model = Resume
        fields = ["id", "target_job_title", "onet_code", "mos_code", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "onet_code", "mos_code", "created_at", "updated_at"]

    def validate_content(self, value):
        try:
            validate_resume(value)      # same check the AI's reply must pass
        except ValueError as err:
            raise serializers.ValidationError(str(err))
        return value


class StarAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StarAnswer
        fields = [
            "id", "resume", "question", "skill", "tip",
            "situation", "task", "action", "result",
            "created_at", "updated_at",
        ]
        # The veteran can edit the text. The AI's skill label and tip stay as they were.
        read_only_fields = ["id", "resume", "skill", "tip", "created_at", "updated_at"]




class JobFitSerializer(serializers.ModelSerializer):
    """A saved job-fit result. Read only: it is created by POST /api/llm/job-fit/."""

    class Meta:
        model = JobFit
        fields = ["id", "target_job_title", "onet_code", "content", "created_at"]
        read_only_fields = fields