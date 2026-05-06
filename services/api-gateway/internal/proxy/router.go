// internal/proxy/router.go
package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/Sudhanshu-NITR/CityLive/services/api-gateway/internal/config"
)

// SetupRouter creates the Mux and registers proxy routes
func SetupRouter(cfg *config.Config) *http.ServeMux {
	mux := http.NewServeMux()

	// 1. Python Report Service Target
	reportTarget, err := url.Parse(cfg.ReportServiceURL)
	if err != nil {
		log.Fatalf("Failed to parse ReportServiceURL: %v", err)
	}
	reportProxy := httputil.NewSingleHostReverseProxy(reportTarget)

	// Proxy incoming POST reports
	mux.HandleFunc("/api/v1/reports", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Routing POST report to Python Service")
		reportProxy.ServeHTTP(w, r)
	})

	// Proxy incoming GET requests for nodes
	mux.HandleFunc("/api/v1/nodes", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Fetching verified live nodes from Python Service")
		// Rewrite the URL path to match Python's endpoint
		r.URL.Path = "/api/v1/verified_nodes"
		reportProxy.ServeHTTP(w, r)
	})

	// 2. Go Event Service Target
	eventTarget, err := url.Parse(cfg.EventServiceURL)
	if err != nil {
		log.Fatalf("Failed to parse EventServiceURL: %v", err)
	}
	eventProxy := httputil.NewSingleHostReverseProxy(eventTarget)

	// Proxy incoming SSE stream
	mux.HandleFunc("/stream", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Proxying SSE stream to Event Service")
		eventProxy.ServeHTTP(w, r)
	})

	// 3. Node.js User Service Target
	userTarget, err := url.Parse(cfg.UserServiceURL)
	if err != nil {
		log.Fatalf("Failed to parse UserServiceURL: %v", err)
	}
	userProxy := httputil.NewSingleHostReverseProxy(userTarget)

	// Proxy incoming User Service requests
	mux.HandleFunc("/api/v1/users", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Proxying request to User Service")
		userProxy.ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/v1/users/", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Proxying request to User Service")
		userProxy.ServeHTTP(w, r)
	})

	return mux
}
