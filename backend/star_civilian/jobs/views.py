from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .onet import get_onet_data


# 1. Civilian job search
@require_GET
def civ_job_search(request):
    """
    Searches O*NET for civilian jobs
    using a job title or keyword.
    """

    keyword = request.GET.get("keyword", "").strip()

    if not keyword:
        return JsonResponse(
            {"error": "Please provide a search keyword."},
            status=400
        )

    try:
        results = get_onet_data(
            "online/search",
            params={"keyword": keyword}
        )

        return JsonResponse(results)

    except ValueError as error:
        return JsonResponse(
            {"error": str(error)},
            status=503
        )

    except Exception:
        return JsonResponse(
            {"error": "Unable to retrieve civilian jobs from O*NET."},
            status=502
        )


# 2. Military job search
@require_GET
def mil_job_search(request):
    """
    Searches O*NET for military occupations
    and related civilian career matches.
    """

    keyword = request.GET.get("keyword", "").strip()

    if not keyword:
        return JsonResponse(
            {"error": "Please provide a military job title or code."},
            status=400
        )

    try:
        results = get_onet_data(
            "veterans/military",
            params={"keyword": keyword}
        )

        return JsonResponse(results)

    except ValueError as error:
        return JsonResponse(
            {"error": str(error)},
            status=503
        )

    except Exception:
        return JsonResponse(
            {"error": "Unable to search military occupations."},
            status=502
        )


# 3. Civilian job matching based on skills
@require_GET
def job_matches(request):
    """
    Finds civilian occupations based on selected O*NET skill IDs.
    """

    skills = request.GET.get("skills", "").strip()

    if not skills:
        return JsonResponse(
            {"error": "Please provide at least one skill ID."},
            status=400
        )

    try:
        results = get_onet_data(
            "online/soft_skills/results",
            params={"skills": skills}
        )

        return JsonResponse(results)

    except ValueError as error:
        return JsonResponse(
            {"error": str(error)},
            status=503
        )

    except Exception:
        return JsonResponse(
            {"error": "Unable to find matching jobs."},
            status=502
        )
