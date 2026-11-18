from django.urls import path

from . import views


urlpatterns = [
    path("civilian-search/", views.civ_job_search, name="civ_job_search"),
    path("military-search/", views.mil_job_search, name="mil_job_search"),
    path("matches/", views.job_matches, name="job_matches"),
]
