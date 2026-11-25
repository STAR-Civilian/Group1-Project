from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .onet import get_onet_data
from .schools import search_schools
from .models import Occupation, MilitaryJobKeyword, JobMatch, TargetJob
from .details import load_details


def save_occupation(occupation_data):
    """
    Saves or updates one civilian occupation from ONET.

    ONET search results provide the occupation code,
    title, and sometimes a link.
    """

    onet_code = occupation_data.get("code")
    title = occupation_data.get("title")

    # Skip results without the information required by our model.
    if not onet_code or not title:
        return None

    # Get the occupation's ONET link.
    onet_url = occupation_data.get("href", "")

    # Check whether ONET identifies this as a Bright Outlook occupation.
    tags = occupation_data.get("tags", {})
    outlook = ""

    if tags.get("bright_outlook"):
        outlook = "Bright Outlook"

    occupation, created = Occupation.objects.update_or_create(
        onet_code=onet_code,
        defaults={
            "title": title,
            "description": occupation_data.get("description", ""),
            "outlook": outlook,
            "onet_url": onet_url,
        }
    )

    return occupation
 
# 1. Civilian job search
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def civ_job_search(request):
    """
    Searches ONET for civilian jobs
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

        # ONET returns civilian occupations in the "occupation" list.
        occupations = results.get("occupation", [])
        for occupation_data in occupations:
            save_occupation(occupation_data)

        return Response(results)

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=503
        )

    except Exception:
        return Response(
            {"detail": "Unable to retrieve civilian jobs from ONET."},
            status=502
        )


# 2. Military job search
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mil_job_search(request):
    """
    Searches ONET for military occupations
    and related civilian career matches.
    """

    keyword = request.GET.get("keyword", "").strip()

    # Get the optional military branch.
    branch = request.GET.get("branch", "").strip()

    if not keyword:
        return Response(
            {"detail": "Please provide a military job title or code."},
            status=400
        )

    try:
        # Start with the required keyword parameter.
        params = {
            "keyword": keyword
        }

        # Add branch only if the user selected one.
        if branch:
            params["branch"] = branch

        # Search ONET using the keyword and optional branch.
        results = get_onet_data(
            "veterans/military",
            params=params
        )


        # ONET returns civilian career matches in the "career" list.
        careers = results.get("career", [])

        # Save the civilian occupations first.
        saved_occupations = []

        for career_data in careers:
            occupation = save_occupation(career_data)

            if occupation:
                saved_occupations.append(occupation)

        # ONET can return one or more matched military occupations.
        military_matches = results.get("military_match", [])

        # Convert ONET branch names into our model's choices.
        branch_mapping = {
            "army": "ARMY",
            "navy": "NAVY",
            "air_force": "AIR_FORCE",
            "marine_corps": "MARINES",
            "coast_guard": "COAST_GUARD",
            "space_force": "SPACE_FORCE",
        }

        # Save the military keyword and connect it to civilian occupations.
        if military_matches:
            for military_data in military_matches:

                branch_name = military_data.get("branch", "").lower()

                military_keyword = military_data.get("code") or keyword

                military_title = military_data.get("title", "")

                branch = branch_mapping.get(branch_name, "")

                military_record, created = MilitaryJobKeyword.objects.update_or_create(
                    branch=branch,
                    military_keyword=military_keyword,
                    defaults={
                        "military_title": military_title
                    }
                )

                military_record.occupations.set(saved_occupations)

        else:
            # Save the search keyword even if ONET did not identify
            # an exact military occupation match.
            military_record, created = MilitaryJobKeyword.objects.update_or_create(
                branch="",
                military_keyword=keyword[:100],
                defaults={
                    "military_title": ""
                }
            )

            military_record.occupations.set(saved_occupations)

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
@permission_classes([IsAuthenticated])
def job_matches(request):
    """
    Finds civilian occupations based on selected ONET skill IDs and save the matches for the logged-in user.
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
         # ONET returns matching occupations in the "occupation" list.
        occupations = results.get("occupation", [])

        for occupation_data in occupations:

            # Save the occupation first.
            occupation = save_occupation(occupation_data)

            if not occupation:
                continue

            # Get the skills ONET says match.
            matched_skills = occupation_data.get("skills_matched", [])

            # Get the other skills associated with this occupation.
            missing_skills = occupation_data.get("skills_other", [])

            # Calculate the percentage of listed skills matched.
            total_skills = len(matched_skills) + len(missing_skills)

            if total_skills > 0:
                match_score = (
                    len(matched_skills) / total_skills
                ) * 100
            else:
                match_score = None

            # Save or update this user's job match.
            JobMatch.objects.update_or_create(
                user=request.user,
                occupation=occupation,
                defaults={
                    "match_score": match_score,
                    "matched_skills": matched_skills,
                    "missing_skills": missing_skills,
                }
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

def _number(value):
    """Turn a stored Decimal into a plain number for the JSON reply."""
    return float(value) if value is not None else None


def _target_job_data(target):
    occupation = target.occupation
    return {
        "id": target.id,
        "onet_code": occupation.onet_code,
        "title": occupation.title,
        "description": occupation.description,
        "salary_median": _number(occupation.salary_median),
        "created_at": target.created_at,
    }


# 4. Target jobs the user has picked (saved, so they follow the user to any browser)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def target_jobs(request):
    """
    GET: the logged-in user's target jobs.
    POST: add one. Adding the same job again returns the existing one.
    """

    if request.method == "POST":
        onet_code = str(request.data.get("onet_code") or "").strip()
        title = str(request.data.get("title") or "").strip()

        if not onet_code or not title:
            return Response(
                {"detail": "onet_code and title are required."},
                status=400
            )

        if len(onet_code) > 20 or len(title) > 255:
            return Response(
                {"detail": "onet_code or title is too long."},
                status=400
            )

        occupation, _ = Occupation.objects.get_or_create(
            onet_code=onet_code,
            defaults={"title": title}
        )
        load_details([occupation])

        target, created = TargetJob.objects.get_or_create(
            user=request.user,
            occupation=occupation
        )
        return Response(
            _target_job_data(target),
            status=201 if created else 200
        )

    targets = TargetJob.objects.filter(
        user=request.user
    ).select_related("occupation")
    return Response([_target_job_data(t) for t in targets])


# 5. Remove one target job
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def target_job_detail(request, target_id):
    """Remove one of the logged-in user's target jobs."""

    # Only the owner can remove it. Anyone else gets a 404.
    target = get_object_or_404(TargetJob, id=target_id, user=request.user)
    target.delete()
    return Response(status=204)


# 6. Description and salary for a list of jobs
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def occupation_details(request):
    """
    Returns what each job is about and its median salary.

    Example: /occupation-details/?codes=15-1299.09,29-2042.00
    Details come from O*NET the first time and are saved after that.
    """

    codes = [
        code.strip()
        for code in request.GET.get("codes", "").split(",")
        if code.strip()
    ][:20]

    if not codes:
        return Response(
            {"detail": "Please provide codes, such as ?codes=15-1299.09."},
            status=400
        )

    occupations = list(Occupation.objects.filter(onet_code__in=codes))
    load_details(occupations)

    return Response({
        o.onet_code: {
            "description": o.description,
            "salary_median": _number(o.salary_median),
        }
        for o in occupations
    })

# 7. School search (for the Education form's suggestions)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def school_search(request):
    """
    Suggests U.S. schools while the veteran types a school name.
    Returns an empty list for very short searches.
    """

    query = request.GET.get("q", "").strip()

    if len(query) < 3:
        return Response([])

    try:
        return Response(search_schools(query))
    except Exception:
        # The form still works if this fails: the veteran can just type the name.
        return Response(
            {"detail": "School search is not available right now."},
            status=502,
        )