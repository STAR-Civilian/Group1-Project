from rest_framework import viewsets, permissions
from .models import Position, Credential
from .serializers import PositionSerializer, CredentialSerializer


class PositionViewSet(viewsets.ModelViewSet):
    serializer_class = PositionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Position.objects.filter(user=self.request.user)   # only YOUR positions

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)                   # tie it to you


class CredentialViewSet(viewsets.ModelViewSet):
    serializer_class = CredentialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Credential.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)