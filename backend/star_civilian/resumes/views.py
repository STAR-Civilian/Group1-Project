from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import JobFit, Resume, StarAnswer
from .serializers import (
    JobFitSerializer,
    ResumeListSerializer,
    ResumeSerializer,
    StarAnswerSerializer,
)


class ResumeViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """List, open, edit, and delete the logged-in veteran's resumes.
    Resumes are CREATED by POST /api/llm/generate-resume/, not here."""

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]   # no PUT, no POST

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user)   # only YOUR resumes

    def get_serializer_class(self):
        return ResumeListSerializer if self.action == "list" else ResumeSerializer

    @action(detail=True, methods=["get"], url_path="star-answers")
    def star_answers(self, request, pk=None):
        resume = self.get_object()      # 404 if it is not yours
        answers = resume.star_answers.all()
        return Response(StarAnswerSerializer(answers, many=True).data)


class StarAnswerViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Open, edit, or delete one STAR answer.
    Answers are CREATED by /api/llm/resumes/<id>/generate-star/."""

    serializer_class = StarAnswerSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return StarAnswer.objects.filter(resume__user=self.request.user)   # only YOUR answers


class JobFitViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """List, open, and delete the logged-in veteran's saved job fits.
    Job fits are CREATED by POST /api/llm/job-fit/, not here."""

    serializer_class = JobFitSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "delete", "head", "options"]

    def get_queryset(self):
        return JobFit.objects.filter(user=self.request.user)   # only YOUR job fits