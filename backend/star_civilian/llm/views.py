from django.shortcuts import render

# Create your views here.
from rest_framework.response import Response
from rest_framework.views import APIView

from resumes.models import Resume

from .client import LLMError, call_llm_json
from .prompts import RESUME_SYSTEM, build_resume_prompt
from .services import build_resume_input
from .validators import validate_resume


class GenerateResumeView(APIView):
    """POST: write a tailored resume for the logged-in user and save it."""

    def post(self, request):
        target_job_title = str(request.data.get("target_job_title") or "").strip()
        if not target_job_title:
            return Response({"detail": "target_job_title is required."}, status=400)

        onet_code = str(request.data.get("onet_code") or "")
        job_notes = str(request.data.get("job_notes") or "")
        position_ids = request.data.get("position_ids")
        if position_ids is not None and not isinstance(position_ids, list):
            return Response({"detail": "position_ids must be a list."}, status=400)

        positions, credentials = build_resume_input(request.user, position_ids or None)
        if not positions:
            return Response({"detail": "Add at least one position first."}, status=400)

        prompt = build_resume_prompt(target_job_title, job_notes, positions, credentials)
        try:
            content = call_llm_json(
                RESUME_SYSTEM, prompt, "resume.json", validate_resume, max_tokens=3000
            )
        except LLMError:
            return Response(
                {"detail": "The resume writer had a problem. Please try again."},
                status=502,
            )

        mos_code = next(
            (p["mos_code"] for p in positions if p["type"] == "military" and p["mos_code"]),
            "",
        )
        resume = Resume.objects.create(
            user=request.user,
            target_job_title=target_job_title,
            onet_code=onet_code,
            mos_code=mos_code,
            content=content,
        )
        return Response(
            {
                "id": resume.id,
                "target_job_title": resume.target_job_title,
                "onet_code": resume.onet_code,
                "mos_code": resume.mos_code,
                "content": resume.content,
                "created_at": resume.created_at,
            },
            status=201,
        )

    