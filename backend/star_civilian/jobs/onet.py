import os
import requests


# O*Net API base URL (Version 2.0)
ONET_BASE_URL = "https://api-v2.onetcenter.org"


def get_onet_data(endpoint, params=None):
    """
    Sends a GET request to the O*Net API.

    endpoint: The specific O*Net resource we want.
    params: Optional search parameters.
    """

    # Retrieve API key from environment variables
    api_key = os.getenv("ONET_API_KEY")

    if not api_key:
        raise ValueError("O*Net API key is missing.")

    # Set up request headers
    headers = {
        "X-API-Key": api_key
    }

    # Build the API URL
    url = f"{ONET_BASE_URL}/{endpoint.lstrip('/')}"

    try:
        response = requests.get(
            url,
            headers=headers,
            params=params,
            timeout=10
        )

        # Raise an error if the API returns an unsuccessful status
        response.raise_for_status()

        # Convert JSON response into Python data
        return response.json()

    except requests.exceptions.Timeout:
        raise Exception("O*Net API request timed out.")

    except requests.exceptions.HTTPError:
        raise Exception(
            f"O*Net API returned an error: {response.status_code}"
        )

    except requests.exceptions.RequestException:
        raise Exception("Unable to connect to O*Net API.")
