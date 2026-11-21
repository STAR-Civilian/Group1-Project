from rest_framework import serializers

from .models import (
    Occupation,
    MilitaryJobKeyword,
    JobMatch,
)


class OccupationSerializer(serializers.ModelSerializer):
    """
    Converts civilian occupation information into JSON.
    """

    class Meta:
        model = Occupation
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class MilitaryJobKeywordSerializer(serializers.ModelSerializer):
    """
    Returns military keywords and their related civilian occupations.
    """

    occupations = OccupationSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = MilitaryJobKeyword
        fields = "__all__"


class JobMatchSerializer(serializers.ModelSerializer):
    """
    Saves and returns a user's skill-based job matches.
    """

    occupation_details = OccupationSerializer(
        source="occupation",
        read_only=True
    )

    class Meta:
        model = JobMatch
        fields = [
            "id",
            "occupation",
            "occupation_details",
            "match_score",
            "matched_skills",
            "missing_skills",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]

