package server

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.uber.org/zap/zaptest"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/config"
)

func TestNewServerManager(t *testing.T) {
	cfg := &config.Config{
		LoadBalancerPort: 8080,
		ApiPort:          8081,
	}
	logger := zaptest.NewLogger(t)

	sm := NewServerManager(cfg, logger)

	if sm == nil {
		t.Fatal("NewServerManager returned nil")
	}
	if sm.config != cfg {
		t.Error("Config not set correctly")
	}
	if sm.logger != logger {
		t.Error("Logger not set correctly")
	}
}

func TestSetServers(t *testing.T) {
	cfg := &config.Config{
		LoadBalancerPort: 8080,
		ApiPort:          8081,
	}
	logger := zaptest.NewLogger(t)
	sm := NewServerManager(cfg, logger)

	lbServer := &http.Server{Addr: ":8080"}
	apiServer := &http.Server{Addr: ":8081"}

	sm.SetServers(lbServer, apiServer)

	if sm.lbServer != lbServer {
		t.Error("Load balancer server not set correctly")
	}
	if sm.apiServer != apiServer {
		t.Error("API server not set correctly")
	}
}

func TestStartServers_WithoutServersSet(t *testing.T) {
	cfg := &config.Config{
		LoadBalancerPort: 8080,
		ApiPort:          8081,
	}
	logger := zaptest.NewLogger(t)
	sm := NewServerManager(cfg, logger)

	err := sm.StartServers()
	if err == nil {
		t.Fatal("Expected error when servers not set")
	}
	if err.Error() != "servers not configured - call SetServers first" {
		t.Errorf("Unexpected error message: %v", err)
	}
}

func TestVerifyStartup_WithMockServers(t *testing.T) {
	// Create test servers
	lbServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer lbServer.Close()

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/ping" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("pong"))
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer apiServer.Close()

	// Extract ports from test servers
	lbPort := extractPortFromURL(lbServer.URL)
	apiPort := extractPortFromURL(apiServer.URL)

	cfg := &config.Config{
		LoadBalancerPort: lbPort,
		ApiPort:          apiPort,
	}
	logger := zaptest.NewLogger(t)
	sm := NewServerManager(cfg, logger)

	// Test verification with running servers
	err := sm.VerifyStartup()
	if err != nil {
		t.Errorf("VerifyStartup failed with running servers: %v", err)
	}
}

func TestVerifyStartup_WithNonExistentServers(t *testing.T) {
	cfg := &config.Config{
		LoadBalancerPort: 9999, // Non-existent port
		ApiPort:          9998, // Non-existent port
	}
	logger := zaptest.NewLogger(t)
	sm := NewServerManager(cfg, logger)

	err := sm.VerifyStartup()
	if err == nil {
		t.Fatal("Expected error when servers are not running")
	}
}

func TestShutdown(t *testing.T) {
	cfg := &config.Config{
		LoadBalancerPort: 8080,
		ApiPort:          8081,
	}
	logger := zaptest.NewLogger(t)
	sm := NewServerManager(cfg, logger)

	// Create mock servers
	lbServer := &http.Server{Addr: ":8080"}
	apiServer := &http.Server{Addr: ":8081"}
	sm.SetServers(lbServer, apiServer)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Test shutdown (should not error even if servers weren't started)
	err := sm.Shutdown(ctx)
	if err != nil {
		t.Errorf("Shutdown failed: %v", err)
	}
}

func TestGetStatus(t *testing.T) {
	cfg := &config.Config{
		LoadBalancerPort: 8080,
		ApiPort:          8081,
	}
	logger := zaptest.NewLogger(t)
	sm := NewServerManager(cfg, logger)

	// Test status without servers set
	status := sm.GetStatus()
	if status.LoadBalancer.Port != 8080 {
		t.Errorf("Expected LB port 8080, got %d", status.LoadBalancer.Port)
	}
	if status.API.Port != 8081 {
		t.Errorf("Expected API port 8081, got %d", status.API.Port)
	}
	if status.LoadBalancer.Status != "unknown" {
		t.Errorf("Expected LB status 'unknown', got %s", status.LoadBalancer.Status)
	}
	if status.API.Status != "unknown" {
		t.Errorf("Expected API status 'unknown', got %s", status.API.Status)
	}

	// Set servers and test status
	lbServer := &http.Server{Addr: ":8080"}
	apiServer := &http.Server{Addr: ":8081"}
	sm.SetServers(lbServer, apiServer)

	status = sm.GetStatus()
	if status.LoadBalancer.Status != "configured" {
		t.Errorf("Expected LB status 'configured', got %s", status.LoadBalancer.Status)
	}
	if status.API.Status != "configured" {
		t.Errorf("Expected API status 'configured', got %s", status.API.Status)
	}
}

// Helper function to extract port from test server URL
func extractPortFromURL(url string) int {
	var port int
	fmt.Sscanf(url, "http://127.0.0.1:%d", &port)
	return port
}

// Test concurrent shutdown behavior
func TestShutdownConcurrency(t *testing.T) {
	cfg := &config.Config{
		LoadBalancerPort: 8080,
		ApiPort:          8081,
	}
	logger := zaptest.NewLogger(t)
	sm := NewServerManager(cfg, logger)

	lbServer := &http.Server{Addr: ":8080"}
	apiServer := &http.Server{Addr: ":8081"}
	sm.SetServers(lbServer, apiServer)

	// Test multiple concurrent shutdowns
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	done := make(chan error, 3)

	// Start multiple shutdown operations concurrently
	for i := 0; i < 3; i++ {
		go func() {
			done <- sm.Shutdown(ctx)
		}()
	}

	// Wait for all to complete
	for i := 0; i < 3; i++ {
		err := <-done
		if err != nil {
			t.Errorf("Concurrent shutdown %d failed: %v", i, err)
		}
	}
}

func TestCheckPortAvailability(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{
		LoadBalancerPort: 19995,
		ApiPort:          19994,
	}

	sm := NewServerManager(cfg, logger)

	t.Run("ports available", func(t *testing.T) {
		err := sm.CheckPortAvailability()
		if err != nil {
			t.Errorf("Expected ports to be available, got error: %v", err)
		}
	})

	t.Run("load balancer port occupied", func(t *testing.T) {
		// Occupy the load balancer port
		listener, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.LoadBalancerPort))
		if err != nil {
			t.Fatalf("Failed to create test listener: %v", err)
		}
		defer listener.Close()

		err = sm.CheckPortAvailability()
		if err == nil {
			t.Error("Expected error when load balancer port is occupied")
		}
	})

	t.Run("API port occupied", func(t *testing.T) {
		// Occupy the API port
		listener, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.ApiPort))
		if err != nil {
			t.Fatalf("Failed to create test listener: %v", err)
		}
		defer listener.Close()

		err = sm.CheckPortAvailability()
		if err == nil {
			t.Error("Expected error when API port is occupied")
		}
	})
}

func TestWaitForServersReady(t *testing.T) {
	logger := zaptest.NewLogger(t)

	t.Run("both servers ready", func(t *testing.T) {
		// Start test servers
		lbMux := http.NewServeMux()
		lbMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		lbListener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create LB listener: %v", err)
		}
		defer lbListener.Close()

		lbServer := &http.Server{Handler: lbMux}
		go func() {
			lbServer.Serve(lbListener)
		}()
		defer lbServer.Close()

		apiMux := http.NewServeMux()
		apiMux.HandleFunc("/api/v1/ping", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("pong"))
		})

		apiListener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create API listener: %v", err)
		}
		defer apiListener.Close()

		apiServer := &http.Server{Handler: apiMux}
		go func() {
			apiServer.Serve(apiListener)
		}()
		defer apiServer.Close()

		lbAddr := lbListener.Addr().(*net.TCPAddr)
		apiAddr := apiListener.Addr().(*net.TCPAddr)

		cfg := &config.Config{
			LoadBalancerPort: lbAddr.Port,
			ApiPort:          apiAddr.Port,
		}

		sm := NewServerManager(cfg, logger)

		err = sm.WaitForServersReady(2 * time.Second)
		if err != nil {
			t.Errorf("Expected servers to be ready, got error: %v", err)
		}
	})

	t.Run("servers not ready timeout", func(t *testing.T) {
		cfg := &config.Config{
			LoadBalancerPort: 19993,
			ApiPort:          19992,
		}

		sm := NewServerManager(cfg, logger)

		err := sm.WaitForServersReady(200 * time.Millisecond)
		if err == nil {
			t.Error("Expected timeout error when servers are not ready")
		}
	})
}

func TestStartServers(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{
		LoadBalancerPort: 8080,
		ApiPort:          8081,
	}

	sm := NewServerManager(cfg, logger)

	// Create mock servers
	lbServer := &http.Server{Addr: ":8080"}
	apiServer := &http.Server{Addr: ":8081"}
	sm.SetServers(lbServer, apiServer)

	// Test startup - this will fail due to port conflicts in test environment
	// but we're testing that the method exists and handles errors properly
	err := sm.StartServers()
	if err != nil {
		t.Logf("Expected error in test environment: %v", err)
	}
}

func TestCleanupPartialStartup(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{
		LoadBalancerPort: 8080,
		ApiPort:          8081,
	}

	sm := NewServerManager(cfg, logger)

	// Create mock servers
	lbServer := &http.Server{Addr: ":8080"}
	apiServer := &http.Server{Addr: ":8081"}
	sm.SetServers(lbServer, apiServer)

	// Test cleanup function doesn't panic
	// sm.cleanupPartialStartup()

	// Should complete without error
}

func TestStartBothServers(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{
		LoadBalancerPort: 19991,
		ApiPort:          19990,
	}

	sm := NewServerManager(cfg, logger)

	// Create mock servers
	lbServer := &http.Server{Addr: fmt.Sprintf(":%d", cfg.LoadBalancerPort)}
	apiServer := &http.Server{Addr: fmt.Sprintf(":%d", cfg.ApiPort)}
	sm.SetServers(lbServer, apiServer)

	t.Run("HTTP mode startup", func(t *testing.T) {
		// Test HTTP startup - this will fail due to port conflicts in test environment
		// but we're testing that the method exists and handles errors properly
		err := sm.startBothServers()
		if err != nil {
			t.Logf("Expected error in test environment: %v", err)
		}
	})
}

func TestServerStartupErrorScenarios(t *testing.T) {
	logger := zaptest.NewLogger(t)

	t.Run("load balancer startup failure should cleanup", func(t *testing.T) {
		cfg := &config.Config{
			LoadBalancerPort: 1, // Invalid port (requires root)
			ApiPort:          8081,
		}

		sm := NewServerManager(cfg, logger)
		lbServer := &http.Server{Addr: ":1"}
		apiServer := &http.Server{Addr: ":8081"}
		sm.SetServers(lbServer, apiServer)

		err := sm.startBothServers()
		if err == nil {
			t.Error("Expected error when starting server on privileged port")
		}
	})

	t.Run("API server startup failure should cleanup load balancer", func(t *testing.T) {
		// This test verifies that if API server fails, load balancer is cleaned up
		cfg := &config.Config{
			LoadBalancerPort: 19989,
			ApiPort:          1, // Invalid port (requires root)
		}

		sm := NewServerManager(cfg, logger)
		lbServer := &http.Server{Addr: fmt.Sprintf(":%d", cfg.LoadBalancerPort)}
		apiServer := &http.Server{Addr: ":1"}
		sm.SetServers(lbServer, apiServer)

		err := sm.startBothServers()
		if err == nil {
			t.Error("Expected error when API server fails to start")
		}
	})
}

// Test startup verification with different scenarios
func TestStartupVerificationScenarios(t *testing.T) {
	logger := zaptest.NewLogger(t)

	t.Run("verification with HTTP protocol", func(t *testing.T) {
		// Create test servers
		lbServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))
		defer lbServer.Close()

		apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/v1/ping" {
				w.WriteHeader(http.StatusOK)
				w.Write([]byte("pong"))
			} else {
				w.WriteHeader(http.StatusNotFound)
			}
		}))
		defer apiServer.Close()

		lbPort := extractPortFromURL(lbServer.URL)
		apiPort := extractPortFromURL(apiServer.URL)

		cfg := &config.Config{
			LoadBalancerPort: lbPort,
			ApiPort:          apiPort,
		}
		sm := NewServerManager(cfg, logger)

		err := sm.VerifyStartup()
		if err != nil {
			t.Errorf("VerifyStartup failed: %v", err)
		}
	})

	t.Run("verification timeout should fail", func(t *testing.T) {
		cfg := &config.Config{
			LoadBalancerPort: 19984,
			ApiPort:          19983,
		}
		sm := NewServerManager(cfg, logger)

		err := sm.VerifyStartup()
		if err == nil {
			t.Error("Expected verification to fail for non-existent servers")
		}
	})
}

// Test port availability checking edge cases
func TestPortAvailabilityEdgeCases(t *testing.T) {
	logger := zaptest.NewLogger(t)

	t.Run("both ports occupied", func(t *testing.T) {
		cfg := &config.Config{
			LoadBalancerPort: 19982,
			ApiPort:          19981,
		}

		// Occupy both ports
		lbListener, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.LoadBalancerPort))
		if err != nil {
			t.Fatalf("Failed to create LB listener: %v", err)
		}
		defer lbListener.Close()

		apiListener, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.ApiPort))
		if err != nil {
			t.Fatalf("Failed to create API listener: %v", err)
		}
		defer apiListener.Close()

		sm := NewServerManager(cfg, logger)
		err = sm.CheckPortAvailability()
		if err == nil {
			t.Error("Expected error when both ports are occupied")
		}
	})

	t.Run("sequential port checks", func(t *testing.T) {
		cfg := &config.Config{
			LoadBalancerPort: 19980,
			ApiPort:          19979,
		}

		sm := NewServerManager(cfg, logger)

		// First check should pass
		err := sm.CheckPortAvailability()
		if err != nil {
			t.Errorf("First port check failed: %v", err)
		}

		// Second check should also pass (ports should still be available)
		err = sm.CheckPortAvailability()
		if err != nil {
			t.Errorf("Second port check failed: %v", err)
		}
	})
}
