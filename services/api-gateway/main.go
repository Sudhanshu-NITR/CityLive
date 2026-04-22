package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

// PulseNode represents a single geo-tagged incident or hazard
type PulseNode struct {
	ID          string  `json:"id"`
	Type        string  `json:"type"` // e.g. "hazard", "congestion"
	Title       string  `json:"title"`
	Time        string  `json:"time"`
	Description string  `json:"description"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	Color       string  `json:"color"`
	Bg          string  `json:"bg"`
}

// corsMiddleware allows Next.js (port 3000) to communicate with this gateway
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000") // Frontend origin
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()

	// 1. Python Report Service Proxy
	target, err := url.Parse("http://report-service:5000")
	if err != nil {
		log.Fatal(err)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)

	mux.HandleFunc("/api/v1/reports", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Routing request to Python Report Service")
		proxy.ServeHTTP(w, r)
	})

	// 2. Mock Data Ingestion / Node Endpoint for Phase 2 Visualization
	mux.HandleFunc("/api/v1/nodes", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Fetching live nodes for CityPulse map")
		w.Header().Set("Content-Type", "application/json")

		nodes := []PulseNode{
			{ID: "1", Type: "congestion", Title: "Majestic Junction", Time: "2 mins ago", Description: "Heavy traffic buildup due to logging.", Lat: 12.9716, Lng: 77.5946, Color: "text-amber-500", Bg: "bg-amber-500/10"},
			{ID: "2", Type: "hazard", Title: "Koramangala Block 5", Time: "10 mins ago", Description: "Waterlogging reported on main street.", Lat: 12.9352, Lng: 77.6245, Color: "text-red-500", Bg: "bg-red-500/10"},
			{ID: "3", Type: "hazard", Title: "Indiranagar 100ft Rd", Time: "Just now", Description: "Fallen tree blocking the left lane.", Lat: 12.9784, Lng: 77.6408, Color: "text-red-500", Bg: "bg-red-500/10"},
		}

		json.NewEncoder(w).Encode(nodes)
	})

	log.Println("API Gateway running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", corsMiddleware(mux)))
}
