from rest_framework import serializers

from .models import Resume, StarAnswer


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
        if not isinstance(value, dict):
            raise serializers.ValidationError("content must be an object.")
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