// internal/api/server.go
package api

import (
	"log"
	"net/http"

	"github.com/Sudhanshu-NITR/CityLive/services/event-service/internal/config"
	"github.com/Sudhanshu-NITR/CityLive/services/event-service/internal/hub"
)

type Server struct {
	config *config.Config
	hub    *hub.EventHub
}

func NewServer(cfg *config.Config, h *hub.EventHub) *Server {
	return &Server{
		config: cfg,
		hub:    h,
	}
}

func (s *Server) Start() error {
	handler := NewHandler(s.hub)

	mux := http.NewServeMux()
	mux.HandleFunc("/stream", handler.StreamHandler)
	mux.HandleFunc("/publish", handler.PublishHandler)

	log.Printf("Flash Intelligence Layer (Event Service) running on port %s", s.config.Port)
	return http.ListenAndServe(":"+s.config.Port, mux)
}
