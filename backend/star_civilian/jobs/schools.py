import os

import requests


# College Scorecard (U.S. Department of Education) school list
SCORECARD_URL = "https://api.data.gov/ed/collegescorecard/v1/schools"


def search_schools(query, limit=8):
    """
    Looks up U.S. colleges and schools whose name contains `query`.

    Returns a short list like:
    [{"id": 218858, "name": "Central Carolina Technical College",
      "city": "Sumter", "state": "SC",
      "label": "Central Carolina Technical College, Sumter, SC"}]
    """

    # The key lives in the .env file, just like ONET_API_KEY
    api_key = os.getenv("COLLEGE_SCORECARD_API_KEY")

    if not api_key:
        raise ValueError("College Scorecard API key is missing.")

    params = {
        "api_key": api_key,
        "school.name": query,
        "fields": "id,school.name,school.city,school.state",
        "per_page": limit,
    }

    response = requests.get(SCORECARD_URL, params=params, timeout=10)
    response.raise_for_status()

    schools = []
    for item in response.json().get("results", []):
        name = item.get("school.name")
        if not name:
            continue
        city = item.get("school.city") or ""
        state = item.get("school.state") or ""
        place = ", ".join(part for part in (city, state) if part)
        schools.append(
            {
                "id": item.get("id"),
                "name": name,
                "city": city,
                "state": state,
                "label": f"{name}, {place}" if place else name,
            }
        )
    return schools