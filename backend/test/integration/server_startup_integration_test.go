package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"go.uber.org/zap/zaptest"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/config"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/server"
	"github.com/aungh/GoLoadBalancerApplication/backend/pkg/netutils"
	"github.com/aungh/GoLoadBalancerApplication/backend/test/testutil"
)

// TestFullServerStartupSequence tests the complete server startup process
func TestFullServerStartupSequence(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Find available ports for testing
	portChecker := netutils.NewPortChecker(logger)
	lbPort, err := portChecker.FindAvailablePort(18080)
	if err != nil {
		t.Fatalf("Failed to find available port for load balancer: %v", err)
	}

	apiPort, err := portChecker.FindAvailablePort(lbPort + 1)
	if err != nil {
		t.Fatalf("Failed to find available port for API: %v", err)
	}

	// Create test configuration
	cfg := &config.Config{
		LoadBalancerPort: lbPort,
		ApiPort:          apiPort,
		BackendServers: []config.BackendServerConfig{
			{
				ID:     "test-server-1",
				URL:    "http://localhost:19001",
				Weight: 1,
			},
		},
		LoadBalancingAlgorithm: "roundrobin",
		HealthCheck: config.HealthCheckConfig{
			IntervalSeconds: 5,
			TimeoutSeconds:  2,
			Path:            "/",
		},
	}

	t.Run("server startup and verification", func(t *testing.T) {
		// Create server manager
		sm := server.NewServerManager(cfg, logger)

		// Create HTTP servers (simplified for test)
		lbServer := &http.Server{
			Addr: fmt.Sprintf(":%d", cfg.LoadBalancerPort),
			Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				w.Write([]byte("Load Balancer OK"))
			}),
		}

		apiServer := &http.Server{
			Addr:    fmt.Sprintf(":%d", cfg.ApiPort),
			Handler: createTestAPIHandler(),
		}

		sm.SetServers(lbServer, apiServer)

		// Test port availability check
		err := sm.CheckPortAvailability()
		if err != nil {
			t.Errorf("Port availability check failed: %v", err)
		}

		// Start servers
		err = sm.StartServers() // Remove HTTPS parameter
		if err != nil {
			t.Fatalf("Failed to start servers: %v", err)
		}

		// Verify startup
		err = sm.VerifyStartup()
		if err != nil {
			t.Errorf("Server startup verification failed: %v", err)
		}

		// Test that both servers are responding
		testServerConnectivity(t, cfg.LoadBalancerPort, cfg.ApiPort)

		// Cleanup
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		err = sm.Shutdown(ctx)
		if err != nil {
			t.Errorf("Server shutdown failed: %v", err)
		}
	})
}

// TestAPIConnectivity tests frontend-backend API connectivity
func TestAPIConnectivity(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Find available port for API server
	portChecker := netutils.NewPortChecker(logger)
	apiPort, err := portChecker.FindAvailablePort(18090)
	if err != nil {
		t.Fatalf("Failed to find available port for API: %v", err)
	}

	// Start test API server
	apiServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", apiPort),
		Handler: createTestAPIHandler(),
	}

	go func() {
		if err := apiServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			t.Logf("API server error: %v", err)
		}
	}()

	// Wait for server to start
	time.Sleep(100 * time.Millisecond)

	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		apiServer.Shutdown(ctx)
	}()

	baseURL := fmt.Sprintf("http://localhost:%d", apiPort)

	t.Run("ping endpoint", func(t *testing.T) {
		resp, err := http.Get(baseURL + "/api/v1/ping")
		if err != nil {
			t.Fatalf("Failed to ping API: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Errorf("Failed to decode ping response: %v", err)
		}

		if result["message"] != "pong" {
			t.Errorf("Expected pong message, got %v", result["message"])
		}
	})

	t.Run("health endpoint", func(t *testing.T) {
		resp, err := http.Get(baseURL + "/api/v1/health")
		if err != nil {
			t.Fatalf("Failed to get health: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Errorf("Failed to decode health response: %v", err)
		}

		if result["status"] != "ok" {
			t.Errorf("Expected status ok, got %v", result["status"])
		}
	})

	t.Run("diagnostics endpoint", func(t *testing.T) {
		resp, err := http.Get(baseURL + "/api/v1/diagnostics")
		if err != nil {
			t.Fatalf("Failed to get diagnostics: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Errorf("Failed to decode diagnostics response: %v", err)
		}

		// Check that diagnostics contains expected fields
		if _, ok := result["data"]; !ok {
			t.Error("Expected diagnostics to contain data field")
		}
	})

	t.Run("CORS headers", func(t *testing.T) {
		// Test OPTIONS request for CORS
		req, err := http.NewRequest("OPTIONS", baseURL+"/api/v1/ping", nil)
		if err != nil {
			t.Fatalf("Failed to create OPTIONS request: %v", err)
		}

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Failed to send OPTIONS request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200 for OPTIONS, got %d", resp.StatusCode)
		}

		// Check CORS headers
		corsOrigin := resp.Header.Get("Access-Control-Allow-Origin")
		if corsOrigin != "*" {
			t.Errorf("Expected CORS origin *, got %s", corsOrigin)
		}

		corsMethods := resp.Header.Get("Access-Control-Allow-Methods")
		if corsMethods == "" {
			t.Error("Expected CORS methods header to be set")
		}
	})
}

// TestErrorRecoveryScenarios tests error recovery and fallback scenarios
func TestErrorRecoveryScenarios(t *testing.T) {
	logger := zaptest.NewLogger(t)

	t.Run("port conflict resolution", func(t *testing.T) {
		// Find an available port
		portChecker := netutils.NewPortChecker(logger)
		testPort, err := portChecker.FindAvailablePort(18100)
		if err != nil {
			t.Fatalf("Failed to find available port: %v", err)
		}

		// Occupy the port
		conflictServer := &http.Server{
			Addr: fmt.Sprintf(":%d", testPort),
			Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}),
		}

		go conflictServer.ListenAndServe()
		time.Sleep(100 * time.Millisecond)

		defer func() {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			conflictServer.Shutdown(ctx)
		}()

		// Try to check port availability - should fail
		err = portChecker.CheckPortAvailability(testPort)
		if err == nil {
			t.Error("Expected error when checking occupied port")
		}

		// Find alternative port
		altPort, err := portChecker.FindAvailablePort(testPort + 1)
		if err != nil {
			t.Errorf("Failed to find alternative port: %v", err)
		}

		if altPort <= testPort {
			t.Errorf("Expected alternative port to be higher than %d, got %d", testPort, altPort)
		}
	})

	t.Run("server readiness timeout", func(t *testing.T) {
		portChecker := netutils.NewPortChecker(logger)

		// Test waiting for non-existent server
		err := portChecker.WaitForServerReady(19999, 200*time.Millisecond)
		if err == nil {
			t.Error("Expected timeout error when waiting for non-existent server")
		}

		// Test waiting for both servers when only one exists
		testServer := testutil.StartDummyServer(19998, "test")
		defer testServer()

		err = portChecker.WaitForBothServersReady(19998, 19997, 300*time.Millisecond)
		if err == nil {
			t.Error("Expected error when one server is missing")
		}
	})
}

// TestFrontendBackendIntegration tests the complete frontend-backend integration
func TestFrontendBackendIntegration(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Find available ports
	portChecker := netutils.NewPortChecker(logger)
	lbPort, err := portChecker.FindAvailablePort(18120)
	if err != nil {
		t.Fatalf("Failed to find available port: %v", err)
	}

	apiPort, err := portChecker.FindAvailablePort(lbPort + 1)
	if err != nil {
		t.Fatalf("Failed to find available port: %v", err)
	}

	// Start backend servers
	backend1 := testutil.StartDummyServer(19201, "backend1")
	backend2 := testutil.StartDummyServer(19202, "backend2")
	defer backend1()
	defer backend2()

	// Start API server with full handler
	apiServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", apiPort),
		Handler: createTestAPIHandler(),
	}

	go func() {
		if err := apiServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			t.Logf("API server error: %v", err)
		}
	}()

	time.Sleep(200 * time.Millisecond)

	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		apiServer.Shutdown(ctx)
	}()

	baseURL := fmt.Sprintf("http://localhost:%d", apiPort)

	t.Run("frontend can connect to backend API", func(t *testing.T) {
		// Simulate frontend connecting to backend
		client := &http.Client{Timeout: 5 * time.Second}

		// Test ping endpoint (like frontend health check)
		resp, err := client.Get(baseURL + "/api/v1/ping")
		if err != nil {
			t.Fatalf("Frontend failed to connect to backend: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		// Verify response format expected by frontend
		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Errorf("Failed to decode response: %v", err)
		}

		if result["message"] != "pong" {
			t.Errorf("Expected pong message, got %v", result["message"])
		}
	})

	t.Run("frontend can retrieve server data", func(t *testing.T) {
		client := &http.Client{Timeout: 5 * time.Second}

		// Test servers endpoint
		resp, err := client.Get(baseURL + "/api/v1/servers")
		if err != nil {
			t.Fatalf("Failed to get servers: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var servers []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&servers); err != nil {
			t.Errorf("Failed to decode servers response: %v", err)
		}

		// Should return empty list initially (no servers configured in test handler)
		if servers == nil {
			t.Error("Expected servers array, got nil")
		}
	})

	t.Run("frontend can add server", func(t *testing.T) {
		client := &http.Client{Timeout: 5 * time.Second}

		// Add a server
		serverData := map[string]interface{}{
			"id":     "test-server",
			"url":    "http://localhost:19201",
			"weight": 1,
		}

		jsonData, err := json.Marshal(serverData)
		if err != nil {
			t.Fatalf("Failed to marshal server data: %v", err)
		}

		resp, err := client.Post(baseURL+"/api/v1/servers", "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			t.Fatalf("Failed to add server: %v", err)
		}
		defer resp.Body.Close()

		// Should return 201 Created or similar success status
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			t.Errorf("Expected success status, got %d", resp.StatusCode)
		}
	})
}

// Helper function to create a test API handler
func createTestAPIHandler() http.Handler {
	mux := http.NewServeMux()

	// Add CORS middleware
	corsHandler := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next(w, r)
		}
	}

	// Ping endpoint
	mux.HandleFunc("/api/v1/ping", corsHandler(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "pong",
			"status":  "ok",
		})
	}))

	// Health endpoint
	mux.HandleFunc("/api/v1/health", corsHandler(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":         "ok",
			"timestamp":      time.Now().Format(time.RFC3339),
			"totalServers":   0,
			"healthyServers": 0,
			"version":        "test",
		})
	}))

	// Diagnostics endpoint
	mux.HandleFunc("/api/v1/diagnostics", corsHandler(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"timestamp": time.Now().Format(time.RFC3339),
				"services": map[string]interface{}{
					"api": map[string]interface{}{
						"status": "running",
					},
				},
			},
		})
	}))

	// Servers endpoint
	mux.HandleFunc("/api/v1/servers", corsHandler(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case "GET":
			// Return empty server list for test
			json.NewEncoder(w).Encode([]map[string]interface{}{})
		case "POST":
			// Accept server addition
			var serverData map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&serverData); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON"})
				return
			}

			// Validate required fields
			if serverData["id"] == "" || serverData["url"] == "" {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{"error": "Missing required fields"})
				return
			}

			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":                serverData["id"],
				"url":               serverData["url"],
				"weight":            serverData["weight"],
				"healthStatus":      "unknown",
				"activeConnections": 0,
			})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	return mux
}

// Helper function to test server connectivity
func testServerConnectivity(t *testing.T, lbPort, apiPort int) {
	client := &http.Client{Timeout: 5 * time.Second}

	// Test load balancer
	lbURL := fmt.Sprintf("http://localhost:%d", lbPort)
	resp, err := client.Get(lbURL)
	if err != nil {
		t.Errorf("Failed to connect to load balancer: %v", err)
		return
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Load balancer returned status %d", resp.StatusCode)
	}

	// Test API server
	apiURL := fmt.Sprintf("http://localhost:%d/api/v1/ping", apiPort)
	resp, err = client.Get(apiURL)
	if err != nil {
		t.Errorf("Failed to connect to API server: %v", err)
		return
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("API server returned status %d", resp.StatusCode)
	}
}
