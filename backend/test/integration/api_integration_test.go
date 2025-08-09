package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"
)

func TestAPIIntegration(t *testing.T) {
	t.Run("Basic HTTP connectivity", func(t *testing.T) {
		// Test that we can create HTTP requests
		req, err := http.NewRequest("GET", "http://example.com", nil)
		if err != nil {
			t.Errorf("Failed to create request: %v", err)
		}

		if req.Method != "GET" {
			t.Errorf("Expected GET method, got %s", req.Method)
		}
	})

	t.Run("JSON marshaling", func(t *testing.T) {
		data := map[string]interface{}{
			"id":     "test-server",
			"url":    "http://localhost:9001",
			"weight": 1,
		}

		body, err := json.Marshal(data)
		if err != nil {
			t.Errorf("Failed to marshal JSON: %v", err)
		}

		if len(body) == 0 {
			t.Error("Expected non-empty JSON body")
		}

		// Test that we can create a request with the body
		req, err := http.NewRequest("POST", "http://example.com", bytes.NewReader(body))
		if err != nil {
			t.Errorf("Failed to create request with body: %v", err)
		}

		if req.Body == nil {
			t.Error("Expected request body to be set")
		}
	})
}
