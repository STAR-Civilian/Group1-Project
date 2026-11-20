from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile

# Every filed that signup must receive
REQUIRED_FIELDS = [
    "email", "password", "first_name", "last_name",
    "phone", "city", "state", "branch", "job_code_or_title",
]

class SignUp(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]         # anyone can signup

    def post(self, request):
        missing = [f for f in REQUIRED_FIELDS if not str(request.data.get(f, "")).strip()]
        if missing:
            return Response({"Error": f"These fields are required: {', '.join(missing)}"}, status=400)

        email = request.data["email"].strip().lower()
        try:
            validate_email(email)
        except ValidationError:
            return Response({"Error": "Enter a valid email address"}, status=400)
        if User.objects.filter(username=email).exists():
            return Response({"Error": "That email is already registered"}, status=400)

        profile = Profile(
            first_name=request.data["first_name"].strip(),
            last_name=request.data["last_name"].strip(),
            phone=request.data["phone"].strip(),
            city=request.data["city"].strip(),
            state=request.data["state"].strip().upper(),
            branch=request.data["branch"],
            job_code_or_title=request.data["job_code_or_title"].strip(),
        )
        try:    # try validating the profile before saving anything
            profile.full_clean(exclude=["user"])
        except ValidationError as err:
            return Response({"Error": err.message_dict}, status=400)

        user = User.objects.create_user(username=email, email=email, password=request.data["password"])
        profile.user = user
        profile.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key}, status=201)
    
class Login(APIView):
    authenticate_classes = []
    permission_classes = [AllowAny]         #anyone can try to log in
    
    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        password = request.data.get("password", "")
        if not email or not password:
            return Response({"Error": "Email and password are required"}, status=400)
        
        user = authenticate(username=email, password=password)  # find a user that matches both
        if user is None:                                        # no match found
            return Response({"Error": "Wrong email or password"}, status=400)
        
        token, _ = Token.objects.get_or_create(user=user)       # get this user token, or make one
        return Response({"token": token.key})                   # send token to REACT