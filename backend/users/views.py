from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.conf import settings

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

User = get_user_model()


def _token_pair(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """POST /api/auth/register/"""
    ser = RegisterSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    user = ser.save()
    return Response(
        {"user": UserSerializer(user).data, "tokens": _token_pair(user)},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """POST /api/auth/login/"""
    from django.contrib.auth import authenticate
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    if not username or not password:
        return Response({"detail": "Username and password are required."}, status=400)

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({"detail": "Invalid credentials."}, status=401)
    if not user.is_active:
        return Response({"detail": "Account is deactivated."}, status=403)

    return Response({"user": UserSerializer(user).data, "tokens": _token_pair(user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    """POST /api/auth/logout/ — blacklists the refresh token"""
    refresh_token = request.data.get("refresh")
    if not refresh_token:
        return Response({"detail": "Refresh token required."}, status=400)
    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
    except TokenError:
        pass  # already expired/invalid — still OK
    return Response({"detail": "Logged out."}, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """GET /api/auth/me/"""
    return Response(UserSerializer(request.user).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_me(request):
    """PATCH /api/auth/me/ — update own profile"""
    ser = UserSerializer(request.user, data=request.data, partial=True)
    if not ser.is_valid():
        return Response(ser.errors, status=400)
    ser.save()
    return Response(ser.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    """POST /api/auth/forgot-password/"""
    ser = PasswordResetRequestSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=400)

    email = ser.validated_data["email"]
    # Always return 200 to avoid email enumeration
    try:
        user = User.objects.get(email=email)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}-{token}"
        send_mail(
            subject="SpecSmart — Reset your password",
            message=f"Click the link to reset your password:\n\n{reset_url}\n\nThis link expires in 24 hours.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
    except User.DoesNotExist:
        pass  # Don't reveal whether email exists

    return Response({"detail": "If an account exists with that email, a reset link has been sent."})


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    """POST /api/auth/reset-password/"""
    ser = PasswordResetConfirmSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=400)

    token_str = ser.validated_data["token"]
    password = ser.validated_data["password"]

    # Token format: "<uid_b64>-<token>"
    try:
        parts = token_str.rsplit("-", 1)
        if len(parts) != 2:
            raise ValueError
        uid_b64, token = parts
        uid = force_str(urlsafe_base64_decode(uid_b64))
        user = User.objects.get(pk=uid)
    except Exception:
        return Response({"detail": "Invalid reset link."}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response({"detail": "Reset link has expired or is invalid."}, status=400)

    user.set_password(password)
    user.save()
    return Response({"detail": "Password reset successful."})
