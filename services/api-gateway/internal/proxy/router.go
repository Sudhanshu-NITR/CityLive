// internal/proxy/router.go
package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/Sudhanshu-NITR/CityLive/services/api-gateway/internal/config"
	"github.com/Sudhanshu-NITR/CityLive/services/api-gateway/internal/middleware"
)

// SetupRouter creates the Mux and registers proxy routes
func SetupRouter(cfg *config.Config) *http.ServeMux {
	mux := http.NewServeMux()

	// ── Report Service (Python/FastAPI) ────────────────────────────────
	reportTarget, err := url.Parse(cfg.ReportServiceURL)
	if err != nil {
		log.Fatalf("Failed to parse ReportServiceURL: %v", err)
	}
	reportProxy := httputil.NewSingleHostReverseProxy(reportTarget)

	// Citizen: submit a report
	mux.HandleFunc("/api/v1/reports", withCORS(func(w http.ResponseWriter, r *http.Request) {
		log.Println("[Gateway] -> Report Service: POST /reports")
		reportProxy.ServeHTTP(w, r)
	}))

	// User map: fetch approved (verified) nodes
	mux.HandleFunc("/api/v1/approved_nodes", withCORS(func(w http.ResponseWriter, r *http.Request) {
		log.Println("[Gateway] -> Report Service: GET /approved_nodes")
		reportProxy.ServeHTTP(w, r)
	}))

	// Admin: fetch pending validation queue (role-guarded)
	mux.HandleFunc("/api/v1/validation_nodes", withCORS(
		middleware.RequireAdmin(func(w http.ResponseWriter, r *http.Request) {
			log.Println("[Gateway] -> Report Service: GET /validation_nodes")
			reportProxy.ServeHTTP(w, r)
		}),
	))

	// Admin: fetch reports for a specific ValidationNode (role-guarded)
	mux.HandleFunc("/api/v1/validation/", withCORS(
		middleware.RequireAdmin(func(w http.ResponseWriter, r *http.Request) {
			log.Printf("[Gateway] -> Report Service: %s /validation/...", r.Method)
			reportProxy.ServeHTTP(w, r)
		}),
	))

	// Admin: approve or reject a ValidationNode (role-guarded)
	mux.HandleFunc("/api/v1/admin/", withCORS(
		middleware.RequireAdmin(func(w http.ResponseWriter, r *http.Request) {
			log.Printf("[Gateway] -> Report Service: %s /admin/...", r.Method)
			reportProxy.ServeHTTP(w, r)
		}),
	))

	// AI Insights
	mux.HandleFunc("/api/v1/ai-insights", withCORS(func(w http.ResponseWriter, r *http.Request) {
		log.Println("[Gateway] -> Report Service: GET /ai-insights")
		reportProxy.ServeHTTP(w, r)
	}))

	// ── Event Service (Go SSE Hub) ─────────────────────────────────────
	eventTarget, err := url.Parse(cfg.EventServiceURL)
	if err != nil {
		log.Fatalf("Failed to parse EventServiceURL: %v", err)
	}
	eventProxy := httputil.NewSingleHostReverseProxy(eventTarget)

	mux.HandleFunc("/stream", withCORS(func(w http.ResponseWriter, r *http.Request) {
		log.Println("[Gateway] -> Event Service: SSE /stream")
		// SSE requires flushing — disable buffering
		w.Header().Set("X-Accel-Buffering", "no")
		eventProxy.ServeHTTP(w, r)
	}))

	// ── User Service (Node.js) ─────────────────────────────────────────
	userTarget, err := url.Parse(cfg.UserServiceURL)
	if err != nil {
		log.Fatalf("Failed to parse UserServiceURL: %v", err)
	}
	userProxy := httputil.NewSingleHostReverseProxy(userTarget)

	mux.HandleFunc("/api/v1/users", withCORS(func(w http.ResponseWriter, r *http.Request) {
		log.Println("[Gateway] -> User Service: /users")
		userProxy.ServeHTTP(w, r)
	}))
	mux.HandleFunc("/api/v1/users/", withCORS(func(w http.ResponseWriter, r *http.Request) {
		log.Println("[Gateway] -> User Service: /users/...")
		userProxy.ServeHTTP(w, r)
	}))

	return mux
}

// withCORS wraps a handler with permissive CORS headers for local dev
func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-User-Id, X-User-Role")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}
