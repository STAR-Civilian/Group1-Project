from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from resumes.models import JobFit, Resume, StarAnswer
from resumes.serializers import JobFitSerializer

from .client import LLMError, call_llm_json, resume_model
from .prompts import (
    JOB_FIT_SYSTEM,
    RESUME_SYSTEM,
    STAR_REWRITE_SYSTEM,
    STAR_SYSTEM,
    build_job_fit_prompt,
    build_resume_prompt,
    build_star_prompt,
    build_star_rewrite_prompt,
)
from .services import build_resume_input
from .validators import (
    validate_job_fit,
    validate_resume,
    validate_star,
    validate_star_rewrite,
)


def valid_id_list(value):
    return isinstance(value, list) and all(
        isinstance(i, int) and not isinstance(i, bool) for i in value
    )


class GenerateResumeView(APIView):
    """POST: write a tailored resume for the logged-in user and save it."""

    def post(self, request):
        target_job_title = str(request.data.get("target_job_title") or "").strip()
        if not target_job_title:
            return Response({"detail": "target_job_title is required."}, status=400)

        onet_code = str(request.data.get("onet_code") or "")
        job_notes = str(request.data.get("job_notes") or "")
        position_ids = request.data.get("position_ids")
        if position_ids is not None and not valid_id_list(position_ids):
            return Response(
                {"detail": "position_ids must be a list of numbers."}, status=400
            )

        extra_details = str(request.data.get("extra_details") or "").strip()
        if len(extra_details) > 3000:
            return Response(
                {"detail": "extra_details is too long (3000 characters max)."}, status=400
            )

        positions, credentials = build_resume_input(request.user, position_ids or None)
        if not positions:
            return Response({"detail": "Add at least one position first."}, status=400)

        prompt = build_resume_prompt(
            target_job_title, job_notes, positions, credentials, extra_details
        )
        try:
            content = call_llm_json(
                RESUME_SYSTEM, prompt, "resume.json", validate_resume,
                max_tokens=8000, model=resume_model(),
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


class GenerateStarView(APIView):
    """POST: write interview questions with example STAR answers for a saved resume."""

    def post(self, request, resume_id):
        # Only the owner can use their resume. Anyone else gets a 404.
        resume = get_object_or_404(Resume, id=resume_id, user=request.user)
        if not resume.content:
            return Response({"detail": "This resume has no content yet."}, status=400)

        try:
            count = int(request.data.get("count", 5))
        except (TypeError, ValueError):
            return Response({"detail": "count must be a number."}, status=400)
        if not 1 <= count <= 10:
            return Response({"detail": "count must be between 1 and 10."}, status=400)

        job_notes = str(request.data.get("job_notes") or "")
        prompt = build_star_prompt(resume.target_job_title, resume.content, job_notes, count)
        try:
            data = call_llm_json(
                STAR_SYSTEM, prompt, "star.json", validate_star, max_tokens=6000
            )
        except LLMError:
            return Response(
                {"detail": "The interview coach had a problem. Please try again."},
                status=502,
            )

        # New answers are added. Existing ones are never deleted, because the
        # veteran may have edited or written their own.
        with transaction.atomic():
            saved = [
                StarAnswer.objects.create(
                    resume=resume,
                    question=a["question"][:300],
                    skill=a["skill"][:100],
                    tip=a.get("tip", ""),
                    situation=a["situation"],
                    task=a["task"],
                    action=a["action"],
                    result=a["result"],
                )
                for a in data["answers"]
            ]

        return Response(
            {
                "resume_id": resume.id,
                "answers": [
                    {
                        "id": s.id,
                        "question": s.question,
                        "skill": s.skill,
                        "tip": s.tip,
                        "situation": s.situation,
                        "task": s.task,
                        "action": s.action,
                        "result": s.result,
                    }
                    for s in saved
                ],
            },
            status=201,
        )


class RewriteStarAnswerView(APIView):
    """POST: rewrite the veteran's own answer in STAR format and save it."""

    def post(self, request, answer_id):
        # Only the owner of the resume can change its answers. Anyone else gets a 404.
        answer = get_object_or_404(
            StarAnswer.objects.select_related("resume"),
            id=answer_id,
            resume__user=request.user,
        )

        text = str(request.data.get("answer_text") or "").strip()
        if not text:
            return Response({"detail": "answer_text is required."}, status=400)
        if len(text) > 3000:
            return Response(
                {"detail": "answer_text is too long (3000 characters max)."}, status=400
            )

        prompt = build_star_rewrite_prompt(
            answer.resume.target_job_title, answer.question, text
        )
        try:
            data = call_llm_json(
                STAR_REWRITE_SYSTEM,
                prompt,
                "star_rewrite.json",
                validate_star_rewrite,
                max_tokens=4000,
            )
        except LLMError:
            return Response(
                {"detail": "The interview coach had a problem. Please try again."},
                status=502,
            )

        answer.situation = data["situation"]
        answer.task = data["task"]
        answer.action = data["action"]
        answer.result = data["result"]
        answer.save()

        return Response(
            {
                "id": answer.id,
                "question": answer.question,
                "skill": answer.skill,
                "tip": answer.tip,
                "situation": answer.situation,
                "task": answer.task,
                "action": answer.action,
                "result": answer.result,
            }
        )


class JobFitView(APIView):
    """POST: explain how the veteran's experience fits a target job, and save it."""

    def post(self, request):
        target_job_title = str(request.data.get("target_job_title") or "").strip()
        if not target_job_title:
            return Response({"detail": "target_job_title is required."}, status=400)

        onet_code = str(request.data.get("onet_code") or "")
        job_notes = str(request.data.get("job_notes") or "")
        position_ids = request.data.get("position_ids")
        if position_ids is not None and not valid_id_list(position_ids):
            return Response(
                {"detail": "position_ids must be a list of numbers."}, status=400
            )

        positions, credentials = build_resume_input(request.user, position_ids or None)
        if not positions:
            return Response({"detail": "Add at least one position first."}, status=400)

        prompt = build_job_fit_prompt(target_job_title, job_notes, positions, credentials)
        try:
            data = call_llm_json(
                JOB_FIT_SYSTEM, prompt, "job_fit.json", validate_job_fit, max_tokens=6000
            )
        except LLMError:
            return Response(
                {"detail": "The job coach had a problem. Please try again."},
                status=502,
            )

        job_fit = JobFit.objects.create(
            user=request.user,
            target_job_title=target_job_title,
            onet_code=onet_code,
            content={
                "summary": data["summary"],
                "transfers": data["transfers"],
                "gaps": data["gaps"],
            },
        )
        return Response(JobFitSerializer(job_fit).data, status=201)