from rest_framework import serializers

from .models import Booking, Environment


class EnvironmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Environment
        fields = ["id", "name", "status"]


class BookingSerializer(serializers.ModelSerializer):
    environment_id = serializers.IntegerField(source="environment.id", read_only=True)
    environment = EnvironmentSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = ["id", "environment_id", "environment", "user", "duration_minutes"]


class BookingRequestSerializer(serializers.Serializer):
    user = serializers.CharField(required=True)
    duration_minutes = serializers.IntegerField(required=True)


class AddEnvRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=True)
