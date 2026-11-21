from rest_framework.routers import SimpleRouter

from .views import ResumeViewSet, StarAnswerViewSet

router = SimpleRouter()
router.register("resumes", ResumeViewSet, basename="resume")
router.register("star-answers", StarAnswerViewSet, basename="star-answer")

urlpatterns = router.urls