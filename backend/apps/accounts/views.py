from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .cookies import clear_refresh_cookie, set_refresh_cookie
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .services import (
    InvalidRefreshSession,
    invalidate_refresh_token,
    issue_tokens_for_user,
    rotate_refresh_token,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        access_token, refresh_token = issue_tokens_for_user(user)
        response = Response(
            {"access": access_token, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
        set_refresh_cookie(response, refresh_token)
        return response


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None or not user.is_active:
            raise AuthenticationFailed("Invalid email or password.")

        access_token, refresh_token = issue_tokens_for_user(user)
        response = Response(
            {"access": access_token, "user": UserSerializer(user).data},
            status=status.HTTP_200_OK,
        )
        set_refresh_cookie(response, refresh_token)
        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not refresh_token:
            raise AuthenticationFailed("Refresh token missing.")

        try:
            access_token, new_refresh_token = rotate_refresh_token(refresh_token)
        except InvalidRefreshSession as exc:
            response = Response({"error": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)
            clear_refresh_cookie(response)
            return response

        response = Response({"access": access_token}, status=status.HTTP_200_OK)
        set_refresh_cookie(response, new_refresh_token)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if refresh_token:
            invalidate_refresh_token(refresh_token)

        response = Response({"detail": "Logged out."}, status=status.HTTP_200_OK)
        clear_refresh_cookie(response)
        return response


class MeView(RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
