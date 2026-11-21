from django.urls import path
from .views import Login, SignUp, ProfileMe

urlpatterns = [
    path("signup/", SignUp.as_view()),
    path("login/", Login.as_view()),
    path("profile/me/", ProfileMe.as_view()),
]