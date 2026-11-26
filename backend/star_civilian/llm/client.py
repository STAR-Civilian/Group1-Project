import json
import logging
import os
from pathlib import Path

from django.conf import settings

MOCK_DIR = Path(__file__).parent / "mocks"
logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised when the model's answer can't be used."""


def resume_model():
    """The model that writes resumes.

    Set LLM_RESUME_MODEL in the server's .env to use a stronger model for
    resumes only. If it is not set, resumes use the same model as everything else.
    """
    return os.environ.get("LLM_RESUME_MODEL") or settings.LLM_MODEL


def resume_effort():
    """How hard the resume model thinks before it writes: low, medium, or high.

    Sonnet 5.5 and Opus 5.5 think before they answer, and that thinking counts
    toward max_tokens. A lower effort leaves room for the resume itself.
    Set LLM_RESUME_EFFORT in the server's .env to change it.
    """
    return os.environ.get("LLM_RESUME_EFFORT") or "medium"


def _supports_effort(model_name):
    # Only send the effort setting to models we know accept it.
    return "sonnet-5" in model_name or "opus-5" in model_name


def call_llm(system, user, mock_file, max_tokens=2000, model=None, effort=None):
    """Send one request to Claude and return the reply text.

    With USE_MOCK_LLM on, return a saved sample from mocks/ instead,
    so nothing is spent during development.
    """
    if settings.USE_MOCK_LLM:
        return (MOCK_DIR / mock_file).read_text()

    import anthropic

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    model_name = model or settings.LLM_MODEL
    extra = {}
    if effort and _supports_effort(model_name):
        extra["extra_body"] = {"output_config": {"effort": effort}}
    response = client.messages.create(
        model=model_name,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        **extra,
    )
    if response.stop_reason == "max_tokens":
        # The reply was cut off, so any JSON in it will be incomplete.
        logger.warning(
            "LLM reply hit max_tokens (%s) for %s; output tokens used: %s",
            max_tokens, mock_file, response.usage.output_tokens,
        )
    return "".join(block.text for block in response.content if block.type == "text")


def _parse_json(text):
    text = text.strip()
    if text.startswith("```"):  # model sometimes wraps JSON in code fences
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    return json.loads(text)


def call_llm_json(system, user, mock_file, validate, max_tokens=2000, model=None, effort=None):
    """Like call_llm, but returns parsed JSON. Retries once if the reply is bad.

    `validate` is a function that raises ValueError if the data is wrong.
    """
    prompt = user
    for attempt in (1, 2):
        try:
            text = call_llm(system, prompt, mock_file, max_tokens, model, effort)
        except Exception:
            # API errors (bad key, timeout, rate limit, overloaded) land here.
            logger.exception("LLM API call failed for %s", mock_file)
            raise
        try:
            data = _parse_json(text)
            validate(data)
            return data
        except ValueError as err:  # includes json.JSONDecodeError
            logger.warning(
                "LLM reply for %s was rejected on attempt %s: %s. Reply started: %r",
                mock_file, attempt, err, text[:200],
            )
            prompt = user + (
                "\n\nYour last reply could not be read. "
                "Reply with valid JSON only, in the exact shape requested."
            )
    raise LLMError("The model did not return usable JSON.")