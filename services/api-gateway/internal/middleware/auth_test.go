// internal/middleware/auth_test.go
package middleware_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Sudhanshu-NITR/CityLive/services/api-gateway/internal/middleware"
)

// nextCalled is a helper that records whether the next handler was invoked
func nextHandler(called *bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		*called = true
		w.WriteHeader(http.StatusOK)
	}
}

func TestRequireAdmin_AllowsAdminRole(t *testing.T) {
	called := false
	handler := middleware.RequireAdmin(nextHandler(&called))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/validation_nodes", nil)
	req.Header.Set("X-User-Role", "admin")
	rr := httptest.NewRecorder()

	handler(rr, req)

	if !called {
		t.Error("expected next handler to be called for admin role")
	}
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestRequireAdmin_BlocksCitizenRole(t *testing.T) {
	called := false
	handler := middleware.RequireAdmin(nextHandler(&called))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/validation_nodes", nil)
	req.Header.Set("X-User-Role", "citizen")
	rr := httptest.NewRecorder()

	handler(rr, req)

	if called {
		t.Error("next handler should NOT be called for citizen role")
	}
	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
}

func TestRequireAdmin_BlocksMissingHeader(t *testing.T) {
	called := false
	handler := middleware.RequireAdmin(nextHandler(&called))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/validation_nodes", nil)
	// No X-User-Role header
	rr := httptest.NewRecorder()

	handler(rr, req)

	if called {
		t.Error("next handler should NOT be called with no role header")
	}
	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
}

func TestRequireAdmin_CaseInsensitive(t *testing.T) {
	called := false
	handler := middleware.RequireAdmin(nextHandler(&called))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/validation_nodes", nil)
	req.Header.Set("X-User-Role", "Admin") // Capital A
	rr := httptest.NewRecorder()

	handler(rr, req)

	if !called {
		t.Error("admin role check should be case-insensitive")
	}
}

func TestRequireAdmin_ResponseIsJSON(t *testing.T) {
	handler := middleware.RequireAdmin(func(w http.ResponseWriter, r *http.Request) {})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-User-Role", "citizen")
	rr := httptest.NewRecorder()

	handler(rr, req)

	contentType := rr.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", contentType)
	}

	var body map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Errorf("response body is not valid JSON: %v", err)
	}
	if _, ok := body["error"]; !ok {
		t.Error("JSON response should contain 'error' key")
	}
}

func TestRequireAdmin_BlocksEmptyRoleString(t *testing.T) {
	called := false
	handler := middleware.RequireAdmin(nextHandler(&called))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-User-Role", "")
	rr := httptest.NewRecorder()

	handler(rr, req)

	if called {
		t.Error("empty role string should be blocked")
	}
	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
}
