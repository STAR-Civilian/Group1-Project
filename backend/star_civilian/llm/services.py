"""Turns database rows into the plain dicts our prompts expect."""

from history.models import Credential, Position

BRANCH_NAMES = {
    "army": "U.S. Army",
    "navy": "U.S. Navy",
    "air_force": "U.S. Air Force",
    "marine_corps": "U.S. Marine Corps",
    "coast_guard": "U.S. Coast Guard",
    "space_force": "U.S. Space Force",
}


def format_month(d):
    """date(2016, 6, 1) -> '06/2016'"""
    return d.strftime("%m/%Y")


def format_dates(start, end):
    """'06/2016 - 08/2022', or '06/2016 - Present' when there is no end date."""
    end_text = format_month(end) if end else "Present"
    return f"{format_month(start)} - {end_text}"


def position_to_dict(p):
    if p.experience_type == "military":
        organization = BRANCH_NAMES.get(p.branch, p.unit)
    else:
        organization = p.employer
    return {
        "type": p.experience_type,
        "title": p.title,
        "organization": organization,
        "dates": format_dates(p.start_date, p.end_date),
        "rank": p.rank,
        "mos_code": p.mos_code,
        "duties": p.duties,
        "achievements": p.achievements,
    }


def credential_to_dict(c):
    return {
        "type": c.credential_type,
        "name": c.name,
        "issuer": c.issuer,
        "year": str(c.date_earned.year) if c.date_earned else "",
    }


def build_resume_input(user, position_ids=None):
    """Return (positions, credentials) for this user, ready for build_resume_prompt.

    position_ids: optional list. If given, only those positions are used.
    Only this user's own rows are ever returned.
    """
    positions = Position.objects.filter(user=user)
    if position_ids:
        positions = positions.filter(id__in=position_ids)
    credentials = Credential.objects.filter(user=user)
    return (
        [position_to_dict(p) for p in positions],
        [credential_to_dict(c) for c in credentials],
    )