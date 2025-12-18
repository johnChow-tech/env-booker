# Asking gemini to generate main.go
Act as a Senior Golang Backend Engineer. 
  I am building a "Test Environment Booking" system using Golang, Gin, and GORM with SQLite.

  Please generate a complete `main.go` file based on these requirements:
  1. Models: 
     - `Environment`: ID, Name, Status (available/occupied).
     - `Booking`: ID, EnvironmentID (Foreign Key), User, Duration (minutes).
  2. Database: Initialize SQLite and use `db.AutoMigrate` for both models.
  3. Seeding: If the `Environment` table is empty, insert 3 dummy environments (e.g., "QA-Cluster-1").
  4. Endpoints:
     - GET `/health`: returns {"status": "ok"}.
     - GET `/envs`: returns all environments including their current status.
  5. Code Quality: Ensure proper error handling and use Gin's default middleware.