from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.authentication import BasicAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, Environment
from .serializers import (
    AddEnvRequestSerializer,
    BookingRequestSerializer,
    BookingSerializer,
    EnvironmentSerializer,
)


# ==========================================
# 1. 环境列表与创建 (GET/POST /envs)
# ==========================================
class EnvironmentList(APIView):
    """
    类视图：处理环境的获取和添加。
    """

    def get(self, request):
        """对应 Go 的 getEnvironments"""
        envs = Environment.objects.all()
        serializer = EnvironmentSerializer(envs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """对应 Go 的 addEnvironment (带权限校验)"""
        # 手动执行权限检查
        self.authentication_classes = [BasicAuthentication]
        self.permission_classes = [IsAdminUser]
        self.check_permissions(request)

        serializer = AddEnvRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST
            )

        # 显式赋值给变量以解决 Pylance 的类型推导报错
        valid_data = serializer.validated_data
        try:
            env = Environment.objects.create(
                name=valid_data["name"], status="available"
            )
            return Response(
                EnvironmentSerializer(env).data, status=status.HTTP_201_CREATED
            )
        except IntegrityError:
            return Response(
                {"error": "Environment name likely exists"},
                status=status.HTTP_409_CONFLICT,
            )


# ==========================================
# 2. 业务逻辑 (预约/释放)
# ==========================================
@api_view(["POST"])
def book_environment(request, pk):
    """对应 Go 的 bookEnvironment，包含事务和行级锁"""
    try:
        env_id = int(pk)
    except ValueError:
        return Response(
            {"error": "Invalid environment ID"}, status=status.HTTP_400_BAD_REQUEST
        )

    serializer = BookingRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"error": str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST
        )

    valid_data = serializer.validated_data

    try:
        with transaction.atomic():
            # select_for_update() 锁定该行，直到事务结束
            env = Environment.objects.select_for_update().get(id=env_id)

            if env.status != "available":
                return Response(
                    {"error": "Environment is already occupied"},
                    status=status.HTTP_409_CONFLICT,
                )

            env.status = "occupied"
            env.save()

            Booking.objects.create(
                environment=env,
                user=valid_data["user"],
                duration_minutes=valid_data["duration_minutes"],
            )

        return Response({"message": "Booked successfully"}, status=status.HTTP_200_OK)

    except Environment.DoesNotExist:
        return Response(
            {"error": "Environment not found"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def release_environment(request, pk):
    """对应 Go 的 releaseEnvironment"""
    try:
        env = Environment.objects.get(id=pk)
    except Environment.DoesNotExist:
        return Response(
            {"error": "Environment not found"}, status=status.HTTP_404_NOT_FOUND
        )

    env.status = "available"
    env.save(update_fields=["status"])
    return Response(
        {"message": "Environment released", "env": env.name}, status=status.HTTP_200_OK
    )


# ==========================================
# 3. 管理与监控
# ==========================================
@api_view(["DELETE"])
@authentication_classes([BasicAuthentication])
@permission_classes([IsAdminUser])
def delete_environment(request, pk):
    """对应 Go 的 deleteEnvironment (软删除)"""
    try:
        env_id = int(pk)
    except ValueError:
        return Response({"error": "Invalid ID"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        env = Environment.objects.get(id=env_id)
    except Environment.DoesNotExist:
        return Response(
            {"error": "Environment not found"}, status=status.HTTP_404_NOT_FOUND
        )

    if env.status == "occupied":
        return Response(
            {"error": "Cannot delete an occupied environment"},
            status=status.HTTP_403_FORBIDDEN,
        )

    env.delete()  # 触发 models.py 中的软删除逻辑
    return Response(
        {"message": "Environment deleted (softly)"}, status=status.HTTP_200_OK
    )


@api_view(["GET"])
def get_bookings(request):
    """获取所有预约信息 (Preload)"""
    bookings = Booking.objects.select_related("environment").all()
    serializer = BookingSerializer(bookings, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"}, status=status.HTTP_200_OK)
