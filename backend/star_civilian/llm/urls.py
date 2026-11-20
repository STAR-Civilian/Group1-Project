from django.urls import path

from .views import GenerateResumeView, GenerateStarView

urlpatterns = [
    path("generate-resume/", GenerateResumeView.as_view(), name="generate-resume"),
    path(
        "resumes/<int:resume_id>/generate-star/",
        GenerateStarView.as_view(),
        name="generate-star",
    ),
]