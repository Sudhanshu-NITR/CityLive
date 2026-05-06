// cmd/api-gateway/main.go
package main

import (
	"log"
	"net/http"

	"github.com/Sudhanshu-NITR/CityLive/services/api-gateway/internal/config"
	"github.com/Sudhanshu-NITR/CityLive/services/api-gateway/internal/middleware"
	"github.com/Sudhanshu-NITR/CityLive/services/api-gateway/internal/proxy"
)

func main() {
	// 1. Load Configuration
	cfg := config.LoadConfig()

	// 2. Initialize Proxy Router
	router := proxy.SetupRouter(cfg)

	// 3. Wrap Router with CORS Middleware
	handler := middleware.CorsMiddleware(cfg, router)

	// 4. Start Server
	log.Printf("API Gateway running on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatalf("Gateway server failed: %v", err)
	}
}
