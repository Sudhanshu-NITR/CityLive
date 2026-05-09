// internal/api/handlers_test.go
package api_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Sudhanshu-NITR/CityLive/services/event-service/internal/api"
	"github.com/Sudhanshu-NITR/CityLive/services/event-service/internal/hub"
)

func newTestHandler() (*api.Handler, *hub.EventHub) {
	h := hub.NewEventHub()
	go h.Run()
	return api.NewHandler(h), h
}

// ── PublishHandler ────────────────────────────────────────────────────────────

func TestPublishHandler_Returns200OnValidJSON(t *testing.T) {
	handler, _ := newTestHandler()
	body := bytes.NewBufferString(`{"type":"TEST","payload":{"id":"123"}}`)
	req := httptest.NewRequest(http.MethodPost, "/publish", body)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.PublishHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestPublishHandler_Returns400OnMalformedJSON(t *testing.T) {
	handler, _ := newTestHandler()
	body := bytes.NewBufferString(`{invalid json here`)
	req := httptest.NewRequest(http.MethodPost, "/publish", body)
	rr := httptest.NewRecorder()

	handler.PublishHandler(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestPublishHandler_BroadcastsToConnectedClient(t *testing.T) {
	handler, h := newTestHandler()

	// Register a client before publishing
	clientChan := make(chan string, 1)
	h.AddClient(clientChan)

	body := bytes.NewBufferString(`{"type":"VALIDATION_UPDATED","payload":{"id":"val_1"}}`)
	req := httptest.NewRequest(http.MethodPost, "/publish", body)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.PublishHandler(rr, req)

	select {
	case msg := <-clientChan:
		if !strings.Contains(msg, "VALIDATION_UPDATED") {
			t.Errorf("message should contain event type, got: %s", msg)
		}
	case <-time.After(500 * time.Millisecond):
		t.Error("client did not receive broadcast message from PublishHandler")
	}
}

// ── StreamHandler ─────────────────────────────────────────────────────────────

func TestStreamHandler_SetsCorrectSSEHeaders(t *testing.T) {
	handler, _ := newTestHandler()

	req := httptest.NewRequest(http.MethodGet, "/stream", nil)
	// httptest.ResponseRecorder does NOT implement http.Flusher by default
	// Use a custom recorder that does
	rr := &flushRecorder{ResponseRecorder: httptest.NewRecorder()}

	// Run in goroutine since StreamHandler blocks waiting for messages
	done := make(chan struct{})
	go func() {
		handler.StreamHandler(rr, req)
		close(done)
	}()

	time.Sleep(50 * time.Millisecond) // Let handler set headers
	req.Context() // no-op, just reference

	contentType := rr.ResponseRecorder.Header().Get("Content-Type")
	if contentType != "text/event-stream" {
		t.Errorf("expected Content-Type text/event-stream, got %s", contentType)
	}

	cacheControl := rr.ResponseRecorder.Header().Get("Cache-Control")
	if cacheControl != "no-cache" {
		t.Errorf("expected Cache-Control no-cache, got %s", cacheControl)
	}
}

// flushRecorder wraps httptest.ResponseRecorder to implement http.Flusher
type flushRecorder struct {
	*httptest.ResponseRecorder
}

func (f *flushRecorder) Flush() {}
