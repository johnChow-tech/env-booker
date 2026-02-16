from django.contrib import admin
from django.urls import include, path  # 必须引入 include

urlpatterns = [
    path("admin/", admin.site.urls),
    # 把 envs 里的所有路由直接挂载到根路径下，匹配原来的 Go 路由
    path("", include("envs.urls")),
]
