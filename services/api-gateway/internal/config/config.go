// internal/config/config.go
package config

import "os"

// Config holds all required environment variables
type Config struct {
	Port             string
	FrontendURL      string
	ReportServiceURL string
	EventServiceURL  string
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// LoadConfig parses the environment and populates the struct
func LoadConfig() *Config {
	return &Config{
		Port:             getEnv("PORT", "8080"),
		FrontendURL:      getEnv("FRONTEND_URL", "http://localhost:3000"),
		ReportServiceURL: getEnv("REPORT_SERVICE_URL", "http://report-service:5000"),
		EventServiceURL:  getEnv("EVENT_SERVICE_URL", "http://event-service:8081"),
	}
}
