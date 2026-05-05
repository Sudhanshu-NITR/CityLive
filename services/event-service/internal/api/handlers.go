// internal/api/handlers.go
package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/Sudhanshu-NITR/CityLive/services/event-service/internal/hub"
)

// Handler holds dependencies for HTTP routes
type Handler struct {
	hub *hub.EventHub
}

func NewHandler(h *hub.EventHub) *Handler {
	return &Handler{hub: h}
}

// StreamHandler manages the SSE connections for clients
func (h *Handler) StreamHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	messageChan := make(chan string)
	h.hub.AddClient(messageChan)
	log.Println("New client connected to event stream")

	defer func() {
		h.hub.RemoveClient(messageChan)
		log.Println("Client disconnected")
	}()

	for msg := range messageChan {
		fmt.Fprintf(w, "data: %s\n\n", msg)
		flusher.Flush()
	}
}

// PublishHandler accepts incoming events to broadcast
func (h *Handler) PublishHandler(w http.ResponseWriter, r *http.Request) {
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	msgBytes, _ := json.Marshal(payload)
	h.hub.Publish(string(msgBytes))

	log.Println("Event published successfully")
	w.WriteHeader(http.StatusOK)
}
