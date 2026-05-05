package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
)

var (
	// Map of active channels
	clients = make(map[chan string]bool)

	// Channel for broadcasting messages to all clients
	broadcast = make(chan string)

	// Mutex to protect the clients map
	mutex = sync.Mutex{}
)

// getEnv reads an environment variable or returns a default fallback value
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func handleMessages() {
	for {
		// Grab the next message from the braodcast channel
		msg := <-broadcast

		mutex.Lock()
		// Send it to every connected user/admin
		for client := range clients {
			client <- msg
		}

		mutex.Unlock()
	}
}

func main() {
	// Start listening for incoming events to broadcast
	go handleMessages()

	// 1. The endpoint Next.js connects to
	http.HandleFunc("/stream", func(w http.ResponseWriter, r *http.Request) {
		// Set headers for Server-Sent Events (SSE)
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
			return
		}
		messageChan := make(chan string)

		mutex.Lock()
		clients[messageChan] = true
		mutex.Unlock()
		log.Println("New client connected to event stream")
		// Remove client when they disconnect
		defer func() {
			mutex.Lock()
			delete(clients, messageChan)
			mutex.Unlock()
			close(messageChan)
			log.Println("Client disconnected")
		}()
		// Keep the connection open and stream data as it arrives
		for msg := range messageChan {
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		}
	})

	// 2. The endpoint the Python Report Service hits to trigger an alert
	http.HandleFunc("/publish", func(w http.ResponseWriter, r *http.Request) {
		var payload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		msgBytes, _ := json.Marshal(payload)
		broadcast <- string(msgBytes)

		log.Println("Event published successfully")
		w.WriteHeader(http.StatusOK)
	})

	port := getEnv("PORT", "8081")
	log.Printf("Flash Intelligence Layer (Event Service) running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
