// internal/middleware/auth.go
package middleware

import (
	"encoding/json"
	"net/http"
	"strings"
)

// RequireAdmin checks the X-User-Role header (set by frontend from localStorage).
// If the role is not "admin", returns 403 Forbidden.
// This prevents URL-manipulation access to admin routes.
func RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role := r.Header.Get("X-User-Role")
		if strings.ToLower(role) != "admin" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Access denied: admin role required",
			})
			return
		}
		next(w, r)
	}
}
