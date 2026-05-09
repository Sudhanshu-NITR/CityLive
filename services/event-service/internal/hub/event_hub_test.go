// internal/hub/event_hub_test.go
package hub_test

import (
	"testing"
	"time"

	"github.com/Sudhanshu-NITR/CityLive/services/event-service/internal/hub"
)

func TestAddClient_ReceivesPublishedMessage(t *testing.T) {
	h := hub.NewEventHub()
	go h.Run()

	clientChan := make(chan string, 1)
	h.AddClient(clientChan)

	msg := `{"type":"TEST","payload":{}}`
	go h.Publish(msg)

	select {
	case received := <-clientChan:
		if received != msg {
			t.Errorf("expected %q, got %q", msg, received)
		}
	case <-time.After(500 * time.Millisecond):
		t.Error("timed out waiting for message")
	}
}

func TestRemoveClient_DoesNotReceiveAfterRemoval(t *testing.T) {
	h := hub.NewEventHub()
	go h.Run()

	clientChan := make(chan string, 1)
	h.AddClient(clientChan)
	h.RemoveClient(clientChan)

	// Channel should be closed — reads should return zero value immediately
	select {
	case _, ok := <-clientChan:
		if ok {
			t.Error("channel should be closed after removal")
		}
	case <-time.After(200 * time.Millisecond):
		t.Error("channel was not closed after RemoveClient")
	}
}

func TestMultipleClients_AllReceiveBroadcast(t *testing.T) {
	h := hub.NewEventHub()
	go h.Run()

	numClients := 3
	channels := make([]chan string, numClients)
	for i := 0; i < numClients; i++ {
		ch := make(chan string, 1)
		channels[i] = ch
		h.AddClient(ch)
	}

	msg := `{"type":"BROADCAST"}`
	go h.Publish(msg)

	for i, ch := range channels {
		select {
		case received := <-ch:
			if received != msg {
				t.Errorf("client %d: expected %q, got %q", i, msg, received)
			}
		case <-time.After(500 * time.Millisecond):
			t.Errorf("client %d timed out waiting for message", i)
		}
	}
}

func TestPublish_NoClientsDoesNotBlock(t *testing.T) {
	h := hub.NewEventHub()
	go h.Run()

	// Publish with no registered clients — must not block or deadlock
	done := make(chan struct{})
	go func() {
		h.Publish(`{"type":"ORPHAN"}`)
		close(done)
	}()

	select {
	case <-done:
		// OK — returned without blocking
	case <-time.After(500 * time.Millisecond):
		t.Error("Publish blocked with no clients")
	}
}

func TestAddMultipleClients_IndependentChannels(t *testing.T) {
	h := hub.NewEventHub()
	go h.Run()

	ch1 := make(chan string, 1)
	ch2 := make(chan string, 1)
	h.AddClient(ch1)
	h.AddClient(ch2)

	// Remove ch1 — ch2 should still receive
	h.RemoveClient(ch1)

	msg := `{"type":"SELECTIVE"}`
	go h.Publish(msg)

	select {
	case received := <-ch2:
		if received != msg {
			t.Errorf("expected %q, got %q", msg, received)
		}
	case <-time.After(500 * time.Millisecond):
		t.Error("remaining client did not receive message after other was removed")
	}
}
