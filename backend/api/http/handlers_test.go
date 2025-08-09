package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.uber.org/zap"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/config"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/loadbalancing"
)

func TestAPIService_listServers(t *testing.T) {
	// Create test dependencies
	algo := &loadbalancing.RoundRobinAlgorithm{}
	pool := loadbalancing.NewServerPool(algo)
	cfg := &config.Config{APIKey: "test-key"}
	logger := zap.NewNop()

	service := &APIService{
		Pool:   pool,
		Config: cfg,
		Logger: logger,
	}

	// Create test request
	req := httptest.NewRequest("GET", "/api/v1/servers", nil)
	w := httptest.NewRecorder()

	// Call handler
	service.listServers(w, req)

	// Check response
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var servers []ServerResponse
	if err := json.NewDecoder(w.Body).Decode(&servers); err != nil {
		t.Errorf("Failed to decode response: %v", err)
	}

	if len(servers) != 0 {
		t.Errorf("Expected empty server list, got %d servers", len(servers))
	}
}

func TestAPIService_addServer(t *testing.T) {
	// Create test dependencies
	algo := &loadbalancing.RoundRobinAlgorithm{}
	pool := loadbalancing.NewServerPool(algo)
	cfg := &config.Config{APIKey: "test-key"}
	logger := zap.NewNop()

	service := &APIService{
		Pool:   pool,
		Config: cfg,
		Logger: logger,
	}

	// Create test request
	reqBody := AddServerRequest{
		ID:     "test-server",
		URL:    "http://localhost:9001",
		Weight: 1,
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/v1/servers", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Call handler
	service.addServer(w, req)

	// Check response
	if w.Code != http.StatusCreated {
		t.Errorf("Expected status 201, got %d", w.Code)
	}

	// Verify server was added
	servers := pool.GetServers()
	if len(servers) != 1 {
		t.Errorf("Expected 1 server, got %d", len(servers))
	}
}
