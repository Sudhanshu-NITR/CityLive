package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

// corsMiddleware allows Next.js (port 3000) to communicate with this gateway
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
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

	// 1. Python Report Service Target
	target, err := url.Parse("http://report-service:5000")
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
		// Rewrite the URL path so the Python Flask app recognizes it
		r.URL.Path = "/api/v1/verified_nodes"
		proxy.ServeHTTP(w, r)
	})

	// 4. Proxy incoming SSE stream to Go Event Service
	eventTarget, err := url.Parse("http://event-service:8081")
	if err != nil {
		log.Fatal(err)
	}
	eventProxy := httputil.NewSingleHostReverseProxy(eventTarget)

	mux.HandleFunc("/stream", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Proxying SSE stream to Event Service")
		eventProxy.ServeHTTP(w, r)
	})

	log.Println("API Gateway running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", corsMiddleware(mux)))
}
