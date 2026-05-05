// internal/hub/event_hub.go
package hub

import "sync"

// EventHub manages connected clients and broadcasts events
type EventHub struct {
	clients   map[chan string]bool
	broadcast chan string
	mutex     sync.Mutex
}

func NewEventHub() *EventHub {
	return &EventHub{
		clients:   make(map[chan string]bool),
		broadcast: make(chan string),
	}
}

// Run starts the infinite loop to listen for broadcasts
func (h *EventHub) Run() {
	for {
		msg := <-h.broadcast
		h.mutex.Lock()
		for client := range h.clients {
			client <- msg
		}
		h.mutex.Unlock()
	}
}

// AddClient registers a new SSE connection
func (h *EventHub) AddClient(clientChan chan string) {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	h.clients[clientChan] = true
}

// RemoveClient unregisters an SSE connection
func (h *EventHub) RemoveClient(clientChan chan string) {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	delete(h.clients, clientChan)
	close(clientChan)
}

// Publish sends a message to the broadcast channel
func (h *EventHub) Publish(message string) {
	h.broadcast <- message
}
