from rest_framework.routers import SimpleRouter

from .views import JobFitViewSet, ResumeViewSet, StarAnswerViewSet

router = SimpleRouter()
router.register("resumes", ResumeViewSet, basename="resume")
router.register("star-answers", StarAnswerViewSet, basename="star-answer")
router.register("job-fits", JobFitViewSet, basename="job-fit")

urlpatterns = router.urls