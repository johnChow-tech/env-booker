package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
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
