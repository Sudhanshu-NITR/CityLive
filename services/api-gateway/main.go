package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

// getEnv reads an environment variable or returns a default fallback value
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// corsMiddleware allows Next.js (port 3000) to communicate with this gateway
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Dynamically get the allowed origin, defaulting to localhost:3000
		allowedOrigin := getEnv("FRONTEND_URL", "http://localhost:3000")

		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()

	// Load configuration from Environment Variables with safe defaults
	reportServiceURL := getEnv("REPORT_SERVICE_URL", "http://report-service:5000")
	eventServiceURL := getEnv("EVENT_SERVICE_URL", "http://event-service:8081")
	port := getEnv("PORT", "8080")

	// 1. Python Report Service Target
	target, err := url.Parse(reportServiceURL)
	if err != nil {
		log.Fatal(err)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)

	// 2. Proxy incoming POST reports to Python
	mux.HandleFunc("/api/v1/reports", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Routing POST report to Python Service")
		proxy.ServeHTTP(w, r)
	})

	// 3. Proxy incoming GET requests for nodes to Python's verified memory store
	mux.HandleFunc("/api/v1/nodes", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Fetching verified live nodes from Python Service")
		r.URL.Path = "/api/v1/verified_nodes"
		proxy.ServeHTTP(w, r)
	})

	// 4. Proxy incoming SSE stream to Go Event Service
	eventTarget, err := url.Parse(eventServiceURL)
	if err != nil {
		log.Fatal(err)
	}
	eventProxy := httputil.NewSingleHostReverseProxy(eventTarget)

	mux.HandleFunc("/stream", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Proxying SSE stream to Event Service")
		eventProxy.ServeHTTP(w, r)
	})

	log.Printf("API Gateway running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, corsMiddleware(mux)))
}
