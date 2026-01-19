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
	ID     uint   `json:"id" gorm:"primaryKey"`
	Name   string `json:"name" gorm:"unique;not null"`
	Status string `json:"status" gorm:"default:'available'"` // "available" or "occupied"
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
	router.POST("/envs/:id/book", bookEnvironment)
	router.POST("/envs/:id/release", releaseEnvironment)

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
