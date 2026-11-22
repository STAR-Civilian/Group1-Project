from rest_framework.routers import DefaultRouter
from .views import PositionViewSet, CredentialViewSet

router = DefaultRouter()
router.register("positions", PositionViewSet, basename="position")
router.register("credentials", CredentialViewSet, basename="credential")

urlpatterns = router.urls