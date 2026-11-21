from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .onet import get_onet_data


# 1. Civilian job search
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def civ_job_search(request):
    """
    Searches O*NET for civilian jobs
    using a job title or keyword.
    """

    keyword = request.GET.get("keyword", "").strip()

    if not keyword:
        return Response(
            {"detail": "Please provide a search keyword."},
            status=400
        )

    try:
        results = get_onet_data(
            "online/search",
            params={"keyword": keyword}
        )

        return Response(results)

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=503
        )

    except Exception:
        return Response(
            {"detail": "Unable to retrieve civilian jobs from O*NET."},
            status=502
        )


# 2. Military job search
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def mil_job_search(request):
    """
    Searches O*NET for military occupations
    and related civilian career matches.
    """

    keyword = request.GET.get("keyword", "").strip()

    if not keyword:
        return Response(
            {"detail": "Please provide a military job title or code."},
            status=400
        )

    try:
        results = get_onet_data(
            "veterans/military",
            params={"keyword": keyword}
        )

        return Response(results)

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=503
        )

    except Exception:
        return Response(
            {"detail": "Unable to search military occupations."},
            status=502
        )


# 3. Civilian job matching based on skills
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def job_matches(request):
    """
    Finds civilian occupations based on selected O*NET skill IDs.
    """

    skills = request.GET.get("skills", "").strip()

    if not skills:
        return Response(
            {"detail": "Please provide at least one skill ID."},
            status=400
        )

    try:
        results = get_onet_data(
            "online/soft_skills/results",
            params={"skills": skills}
        )

        return Response(results)

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=503
        )

    except Exception:
        return Response(
            {"detail": "Unable to find matching jobs."},
            status=502
        )
