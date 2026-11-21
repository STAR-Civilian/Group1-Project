from django.urls import path

from .views import (
    GenerateResumeView,
    GenerateStarView,
    JobFitView,
    RewriteStarAnswerView,
)

urlpatterns = [
    path("generate-resume/", GenerateResumeView.as_view(), name="generate-resume"),
    path("job-fit/", JobFitView.as_view(), name="job-fit"),
    path(
        "resumes/<int:resume_id>/generate-star/",
        GenerateStarView.as_view(),
        name="generate-star",
    ),
    path(
        "star-answers/<int:answer_id>/rewrite/",
        RewriteStarAnswerView.as_view(),
        name="rewrite-star",
    ),
]