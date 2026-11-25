from django.urls import path
from .views import Login, SignUp, ProfileMe, PasswordResetRequest, PasswordResetConfirm

urlpatterns = [
    path("signup/", SignUp.as_view()),
    path("login/", Login.as_view()),
    path("profile/me/", ProfileMe.as_view()),
    path("password-reset/", PasswordResetRequest.as_view()),
    path("password-reset/confirm/", PasswordResetConfirm.as_view()),
]