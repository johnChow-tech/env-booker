from django.db import models
from django.utils import timezone


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        # 默认只返回未删除的数据
        return super().get_queryset().filter(deleted_at__isnull=True)


class Environment(models.Model):
    name = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=50, default="available")
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    def delete(self, *args, **kwargs):
        # 软删除：打上时间戳，而不是真删
        self.deleted_at = timezone.now()
        self.save()

    def __str__(self):
        return self.name


class Booking(models.Model):
    environment = models.ForeignKey(
        Environment,
        on_delete=models.CASCADE,
        related_name="bookings",
        db_column="environment_id",
    )
    user = models.CharField(max_length=255)
    duration_minutes = models.IntegerField()

    def __str__(self):
        return f"{self.user} - {self.environment.name}"
