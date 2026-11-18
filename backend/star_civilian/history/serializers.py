from rest_framework import serializers
from .models import Position, Credential


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        exclude = ["user"]          # set automatically, never sent by the browser


class CredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Credential
        exclude = ["user"]