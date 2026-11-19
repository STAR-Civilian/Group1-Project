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

def validate_star(data):
    _require(isinstance(data, dict), "The reply must be a JSON object.")

    answers = data.get("answers")
    _require(isinstance(answers, list) and answers, "answers must be a non-empty list.")

    for item in answers:
        _require(isinstance(item, dict), "Each answer must be an object.")
        _require(
            isinstance(item.get("question"), str) and item["question"].strip(),
            "Each answer needs a question.",
        )
        for key in ("skill", "situation", "task", "action", "result"):
            _require(isinstance(item.get(key), str), f"answer {key} must be text.")
        if "tip" in item:
            _require(isinstance(item["tip"], str), "answer tip must be text.")



def validate_star_rewrite(data):
    _require(isinstance(data, dict), "The reply must be a JSON object.")
    for key in ("situation", "task", "action", "result"):
        _require(isinstance(data.get(key), str) and data[key].strip(), f"{key} must be text.")