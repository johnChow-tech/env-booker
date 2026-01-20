package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert" // 需要 go get github.com/stretchr/testify/assert
)

// setupRouter 这是一个辅助函数，用来模拟 router，避免重复代码
func setupRouter() *gin.Engine {
	r := gin.Default()
	r.GET("/health", healthCheck)
	return r
}

func TestHealthCheck(t *testing.T) {
	// 1. 初始化路由
	router := setupRouter()

	// 2. 构造一个请求 (GET /health)
	w := httptest.NewRecorder() // 这是一个假的 ResponseWriter，用来记录响应
	req, _ := http.NewRequest("GET", "/health", nil)

	// 3. 发送请求
	router.ServeHTTP(w, req)

	// 4. 断言 (Assert) 结果
	// 检查状态码是否为 200
	assert.Equal(t, http.StatusOK, w.Code)
	// 检查响应体是否包含 "ok"
	assert.Contains(t, w.Body.String(), "ok")
}
