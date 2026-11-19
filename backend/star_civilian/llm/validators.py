"""Checks that Claude's reply has the shape we expect.

Each function raises ValueError with a short message if something is wrong.
call_llm_json() catches that and asks Claude to try again once.
"""


def _require(condition, message):
    if not condition:
        raise ValueError(message)


def _is_text_list(value):
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def validate_resume(data):
    _require(isinstance(data, dict), "The resume must be a JSON object.")

    summary = data.get("summary")
    _require(isinstance(summary, str) and summary.strip(), "summary must be text.")

    for key in ("skills", "education", "certifications", "questions_for_vet"):
        _require(_is_text_list(data.get(key)), f"{key} must be a list of text.")

    experience = data.get("experience")
    _require(isinstance(experience, list), "experience must be a list.")
    for job in experience:
        _require(isinstance(job, dict), "Each experience item must be an object.")
        for key in ("title", "organization", "dates"):
            _require(isinstance(job.get(key), str), f"experience {key} must be text.")
        _require(
            _is_text_list(job.get("bullets")),
            "experience bullets must be a list of text.",
        )