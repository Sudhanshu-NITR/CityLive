// cmd/event-service/main.go
package main

import (
	"log"

	"github.com/Sudhanshu-NITR/CityLive/services/event-service/internal/api"
	"github.com/Sudhanshu-NITR/CityLive/services/event-service/internal/config"
	"github.com/Sudhanshu-NITR/CityLive/services/event-service/internal/hub"
)

func main() {
	// 1. Load Configuration
	cfg := config.LoadConfig()

	// 2. Initialize Core Domain (Event Hub)
	eventHub := hub.NewEventHub()

	// Start listening for broadcasts in a separate goroutine
	go eventHub.Run()

	// 3. Initialize and start HTTP Server
	server := api.NewServer(cfg, eventHub)
	if err := server.Start(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
