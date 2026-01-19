package main

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// Environment model
type Environment struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Name      string         `json:"name" gorm:"unique;not null"`
	Status    string         `json:"status" gorm:"default:'available'"` // "available" or "occupied"
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Booking model
type Booking struct {
	ID            uint        `json:"id" gorm:"primaryKey"`
	EnvironmentID uint        `json:"environment_id"`
	Environment   Environment `json:"environment"` // Foreign Key relationship
	User          string      `json:"user" gorm:"not null"`
	Duration      int         `json:"duration_minutes" gorm:"not null"` // Duration in minutes
}

// BookingRequest 相当于 TS 中的 interface BookingDto
type BookingRequest struct {
	User     string `json:"user" binding:"required"`             // 必填
	Duration int    `json:"duration_minutes" binding:"required"` // 必填
}

// AddEnvRequest 相当于 TS 的 CreateEnvironmentDto
// 我们只允许用户传 Name，状态默认都是 available
type AddEnvRequest struct {
	Name string `json:"name" binding:"required"`
}

var DB *gorm.DB

func main() {
	// Initialize Gin
	router := gin.Default()

	// Initialize Database
	var err error
	DB, err = gorm.Open(sqlite.Open("test_env_booker.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// AutoMigrate models
	err = DB.AutoMigrate(&Environment{}, &Booking{})
	if err != nil {
		log.Fatalf("failed to auto migrate database: %v", err)
	}

	// Seed dummy environments if table is empty
	var count int64
	DB.Model(&Environment{}).Count(&count)
	if count == 0 {
		log.Println("Seeding initial environments...")
		environments := []Environment{
			{Name: "QA-Cluster-1", Status: "available"},
			{Name: "Dev-Machine-A", Status: "available"},
			{Name: "Staging-Server-X", Status: "available"},
		}
		for _, env := range environments {
			if result := DB.Create(&env); result.Error != nil {
				log.Printf("Failed to seed environment %s: %v", env.Name, result.Error)
			}
		}
		log.Println("Environments seeded.")
	}

	// Define Endpoints
	router.GET("/health", healthCheck)
	router.GET("/envs", getEnvironments)
	router.GET("/bookings", getBookings)
	router.POST("/envs/:id/book", bookEnvironment)
	router.POST("/envs/:id/release", releaseEnvironment)

	// === 管理员专用接口 (Private / Admin Only) ===
	// 我们创建一个路由组，并使用 BasicAuth 中间件保护它
	// gin.Accounts 是一个 map，键是用户名，值是密码
	adminGroup := router.Group("/", gin.BasicAuth(gin.Accounts{
		"admin": "123456", // 用户名: admin, 密码: 123456
	}))

	// 把增删接口移到这个 adminGroup 下
	adminGroup.POST("/envs", addEnvironment)
	adminGroup.DELETE("/envs/:id", deleteEnvironment)

	// Run the server
	log.Println("Server starting on :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}

// healthCheck godoc
// @Summary Show the status of the server
// @Description get the status of the server
// @Tags health
// @Accept */*
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// getEnvironments godoc
// @Summary Get all environments
// @Description Get a list of all test environments and their status
// @Tags environments
// @Accept json
// @Produce json
// @Success 200 {array} Environment
// @Router /envs [get]
func getEnvironments(c *gin.Context) {
	var environments []Environment
	if result := DB.Find(&environments); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(http.StatusOK, environments)
}

func addEnvironment(c *gin.Context) {
	var req AddEnvRequest
	// 1. 校验参数
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 2. 创建实例
	env := Environment{
		Name:   req.Name,
		Status: "available",
	}

	// 3. 写入数据库
	if result := DB.Create(&env); result.Error != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Environment name likely exists"})
		return
	}

	c.JSON(http.StatusCreated, env)
}

func bookEnvironment(c *gin.Context) {
	// [Step 0] 严格校验 ID (修复 Bug 的关键)
	// 类似于 TS: const id = parseInt(req.params.id); if (isNaN(id)) ...
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam) // Atoi = Ascii to Integer
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid environment ID"})
		return
	}

	var req BookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = DB.Transaction(func(tx *gorm.DB) error {
		var env Environment

		// 这里传入转换后的 int 类型的 id，GORM 就绝对不会查错
		if err := tx.First(&env, id).Error; err != nil {
			return err
		}

		if env.Status != "available" {
			return gorm.ErrInvalidData
		}

		if err := tx.Model(&env).Update("Status", "occupied").Error; err != nil {
			return err
		}

		booking := Booking{
			EnvironmentID: env.ID,
			User:          req.User,
			Duration:      req.Duration,
		}
		return tx.Create(&booking).Error
	})

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Environment not found"})
		} else if err == gorm.ErrInvalidData {
			c.JSON(http.StatusConflict, gin.H{"error": "Environment is already occupied"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Booked successfully"})
}

// releaseEnvironment 释放环境
func releaseEnvironment(c *gin.Context) {
	id := c.Param("id")

	var env Environment
	// 1. 先查一下存不存在
	if result := DB.First(&env, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Environment not found"})
		return
	}

	// 2. 更新状态为 "available"
	// Update 是更新单个字段，Save 是保存整个对象
	if result := DB.Model(&env).Update("Status", "available"); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Environment released", "env": env.Name})
}

func deleteEnvironment(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var env Environment
	// 1. 查找是否存在
	// 注意：一旦开启软删除，GORM 默认只查 "DeletedAt IS NULL" 的数据
	if result := DB.First(&env, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Environment not found"})
		return
	}

	// 2. 业务保护：占用中不可删
	if env.Status == "occupied" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete an occupied environment"})
		return
	}

	// 3. 执行删除
	// 因为结构体里有 gorm.DeletedAt，这会自动变成软删除 (Soft Delete)
	if result := DB.Delete(&env); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Environment deleted (softly)"})
}

func getBookings(c *gin.Context) {
	var bookings []Booking

	// Preload("Environment") 相当于 TypeORM 的 relations: ['environment']
	// 它会自动把关联的 Environment 数据填充到 Booking 结构体里
	if result := DB.Preload("Environment").Find(&bookings); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, bookings)
}
