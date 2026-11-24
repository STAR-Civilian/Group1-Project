from concurrent.futures import ThreadPoolExecutor

from .onet import get_onet_data


def _fetch_from_onet(code):
    """Ask O*NET what a job is about and what it pays.

    This only talks to O*NET. It does not touch the database, so it is
    safe to run several at once.
    """
    description = ""
    salary = {}

    try:
        overview = get_onet_data(f"mnm/careers/{code}/")
        description = overview.get("what_they_do") or ""
    except Exception:
        pass

    try:
        outlook = get_onet_data(f"mnm/careers/{code}/job_outlook")
        salary = outlook.get("salary") or {}
    except Exception:
        pass

    return description, salary


def load_details(occupations):
    """Fill in the description and salary for jobs that do not have them yet.

    The answers are saved on the Occupation, so each job is only looked up
    from O*NET once.
    """
    missing = [o for o in occupations if not o.description]
    if not missing:
        return

    with ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(lambda o: _fetch_from_onet(o.onet_code), missing))

    for occupation, (description, salary) in zip(missing, results):
        if not description:
            continue  # O*NET did not answer. We will try again next time.
        occupation.description = description
        occupation.salary_min = salary.get("annual_10th_percentile")
        occupation.salary_median = salary.get("annual_median")
        occupation.salary_max = salary.get("annual_90th_percentile")
        occupation.save(
            update_fields=[
                "description",
                "salary_min",
                "salary_median",
                "salary_max",
                "updated_at",
            ]
        )