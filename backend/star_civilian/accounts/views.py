from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.contrib.auth.password_validation import validate_password
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile

# Every filed that signup must receive
REQUIRED_FIELDS = [
    "email", "password", "first_name", "last_name",
    "city", "state",
]

# Optional resume links. Users can leave these blank.
URL_FIELDS = ["linkedin_url", "github_url", "website_url"]


def clean_url(value):
    """'linkedin.com/in/me' -> 'https://linkedin.com/in/me'. Blank stays blank."""
    value = str(value or "").strip()
    if value and not value.lower().startswith(("http://", "https://")):
        value = "https://" + value
    return value

class SignUp(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]         # anyone can signup

    def post(self, request):
        missing = [f for f in REQUIRED_FIELDS if not str(request.data.get(f, "")).strip()]
        if missing:
            return Response({"detail": f"These fields are required: {', '.join(missing)}"}, status=400)

        email = str(request.data["email"]).strip().lower()
        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "Enter a valid email address"}, status=400)
        if User.objects.filter(username=email).exists():
            return Response({"detail": "That email is already registered"}, status=400)
        
        # reject weak passwords using Django's built-in rules
        password = str(request.data["password"])
        try:
            validate_password(password)
        except ValidationError as err:
            return Response({"detail": " ".join(err.messages)}, status=400)

        profile = Profile(
            first_name=str(request.data["first_name"]).strip(),
            last_name=str(request.data["last_name"]).strip(),
            phone=str(request.data.get("phone", "")).strip(),
            city=str(request.data["city"]).strip(),
            state=str(request.data["state"]).strip().upper(),
            branch=str(request.data.get("branch", "")).strip(),
            rank=str(request.data.get("rank", "")).strip(),
            job_code_or_title=str(request.data.get("job_code_or_title", "")).strip(),
            **{f: clean_url(request.data.get(f)) for f in URL_FIELDS},
            website_title=str(request.data.get("website_title", "")).strip(),
        )
        try:    # try validating the profile before saving anything
            profile.full_clean(exclude=["user"])
        except ValidationError as err:
            return Response({"detail": err.message_dict}, status=400)

        user = User.objects.create_user(username=email, email=email, password=password)
        profile.user = user
        profile.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key}, status=201)
    
class Login(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]         #anyone can try to log in
    
    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        password = request.data.get("password", "")
        if not email or not password:
            return Response({"detail": "Email and password are required"}, status=400)

        user = authenticate(username=email, password=password)  # find a user that matches both
        if user is None:                                        # no match found
            return Response({"detail": "Wrong email or password"}, status=400)

        token, _ = Token.objects.get_or_create(user=user)       # get this user token, or make one
        return Response({"token": token.key})                   # send token to REACT
    
# the fields a user can see & change    
PROFILE_REQUIRED_FIELDS = ["first_name", "last_name", "city", "state"]
def profile_data(user):
    profile = user.profile
    return {
        "email": user.email,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "phone": profile.phone,
        "city": profile.city,
        "state": profile.state,
        "branch": profile.branch,
        "rank": profile.rank,
        "job_code_or_title": profile.job_code_or_title,
        "linkedin_url": profile.linkedin_url,
        "github_url": profile.github_url,
        "website_url": profile.website_url,
        "website_title": profile.website_title,
    }
    
class ProfileMe(APIView):
    
    def get(self, request):
        try:
            return Response(profile_data(request.user))
        except Profile.DoesNotExist:
            return Response({"detail": "No profile found"}, status= 404)
        
    def put(self, request):
        missing = [f for f in PROFILE_REQUIRED_FIELDS if not str(request.data.get(f, "")).strip()]        
        if missing:
            return Response({"detail": f"These fields are required: {', '.join(missing)}"}, status=400)
        
        try:
            profile = request.user.profile
        except Profile.DoesNotExist:
            return Response({"detail": "No profile found"}, status=404)
        
        profile.first_name = str(request.data["first_name"]).strip()
        profile.last_name = str(request.data["last_name"]).strip()
        profile.phone = str(request.data.get("phone", "")).strip()
        profile.city = str(request.data["city"]).strip()
        profile.state = str(request.data["state"]).strip().upper()
        profile.branch = str(request.data.get("branch", "")).strip()
        profile.rank = str(request.data.get("rank", "")).strip()
        profile.job_code_or_title = str(request.data.get("job_code_or_title", "")).strip()
        for f in URL_FIELDS:
            if f in request.data:       # only change links that were sent
                setattr(profile, f, clean_url(request.data[f]))
        if "website_title" in request.data:
            profile.website_title = str(request.data["website_title"]).strip()
        
        try:
            profile.full_clean()
        except ValidationError as err:
            return Response({"detail": err.message_dict}, status= 400)
        
        profile.save()
        return Response(profile_data(request.user))