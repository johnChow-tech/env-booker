from django.urls import path

from . import views

urlpatterns = [
    # 监控
    path("health", views.health_check, name="health_check"),
    # 环境管理 (GET 获取列表, POST 创建环境)
    path("envs", views.EnvironmentList.as_view(), name="env_list_api"),
    path("envs/", views.EnvironmentList.as_view()),  # 兼容带斜杠的请求
    # 单个环境操作 (删除使用 DELETE)
    path("envs/<str:pk>", views.delete_environment, name="env_detail_api"),
    # 业务逻辑
    path("envs/<str:pk>/book", views.book_environment, name="env_book"),
    path("envs/<str:pk>/release", views.release_environment, name="env_release"),
    # 预约记录
    path("bookings", views.get_bookings, name="booking_list"),
    path("bookings/", views.get_bookings),
]
