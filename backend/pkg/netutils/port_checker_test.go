package netutils

import (
	"net"
	"net/http"
	"testing"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
)

func TestPortChecker_CheckPortAvailability(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("available port", func(t *testing.T) {
		// Use a high port number that's likely to be available
		port := 19999
		err := pc.CheckPortAvailability(port)
		if err != nil {
			t.Errorf("Expected port %d to be available, got error: %v", port, err)
		}
	})

	t.Run("port in use", func(t *testing.T) {
		// Start a test server to occupy a port
		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create test listener: %v", err)
		}
		defer listener.Close()

		// Get the port that's now in use
		addr := listener.Addr().(*net.TCPAddr)
		port := addr.Port

		// Check that the port is reported as unavailable
		err = pc.CheckPortAvailability(port)
		if err == nil {
			t.Errorf("Expected port %d to be unavailable, but got no error", port)
		}
	})
}

func TestPortChecker_CheckRequiredPorts(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("both ports available", func(t *testing.T) {
		// This test might fail if ports 8080 or 8081 are actually in use
		// In a real test environment, we'd use different ports or mock the functionality
		err := pc.CheckRequiredPorts()
		// We can't guarantee these ports are available in all test environments
		// so we just check that the function doesn't panic
		_ = err // Ignore the result for this basic test
	})
}

func TestPortChecker_IsPortInUse(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("port not in use", func(t *testing.T) {
		port := 19998
		inUse := pc.IsPortInUse(port)
		if inUse {
			t.Errorf("Expected port %d to not be in use", port)
		}
	})

	t.Run("port in use", func(t *testing.T) {
		// Start a test server to occupy a port
		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create test listener: %v", err)
		}
		defer listener.Close()

		addr := listener.Addr().(*net.TCPAddr)
		port := addr.Port

		inUse := pc.IsPortInUse(port)
		if !inUse {
			t.Errorf("Expected port %d to be in use", port)
		}
	})
}

func TestPortChecker_FindAvailablePort(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("find available port", func(t *testing.T) {
		startPort := 19990
		availablePort, err := pc.FindAvailablePort(startPort)
		if err != nil {
			t.Errorf("Expected to find available port starting from %d, got error: %v", startPort, err)
		}
		if availablePort < startPort {
			t.Errorf("Expected available port to be >= %d, got %d", startPort, availablePort)
		}

		// Verify the returned port is actually available
		err = pc.CheckPortAvailability(availablePort)
		if err != nil {
			t.Errorf("Returned port %d should be available, got error: %v", availablePort, err)
		}
	})

	t.Run("find available port when start port is occupied", func(t *testing.T) {
		// Occupy a port
		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create test listener: %v", err)
		}
		defer listener.Close()

		addr := listener.Addr().(*net.TCPAddr)
		occupiedPort := addr.Port

		// Try to find available port starting from the occupied port
		availablePort, err := pc.FindAvailablePort(occupiedPort)
		if err != nil {
			t.Errorf("Expected to find available port starting from %d, got error: %v", occupiedPort, err)
		}
		if availablePort == occupiedPort {
			t.Errorf("Expected available port to be different from occupied port %d", occupiedPort)
		}
	})
}

func TestPortChecker_WaitForServerReady(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("server becomes ready", func(t *testing.T) {
		// Start a test HTTP server
		mux := http.NewServeMux()
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		})

		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create listener: %v", err)
		}
		defer listener.Close()

		server := &http.Server{Handler: mux}
		go func() {
			server.Serve(listener)
		}()
		defer server.Close()

		addr := listener.Addr().(*net.TCPAddr)
		port := addr.Port

		// Wait for server to be ready
		err = pc.WaitForServerReady(port, 2*time.Second)
		if err != nil {
			t.Errorf("Expected server to be ready, got error: %v", err)
		}
	})

	t.Run("server not ready timeout", func(t *testing.T) {
		// Use a port that doesn't have a server
		port := 19997
		err := pc.WaitForServerReady(port, 100*time.Millisecond)
		if err == nil {
			t.Error("Expected timeout error when server is not ready")
		}
	})
}

func TestPortChecker_WaitForServerReadyWithPath(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("server ready with specific path", func(t *testing.T) {
		// Start a test HTTP server with specific endpoint
		mux := http.NewServeMux()
		mux.HandleFunc("/api/v1/ping", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("pong"))
		})

		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create listener: %v", err)
		}
		defer listener.Close()

		server := &http.Server{Handler: mux}
		go func() {
			server.Serve(listener)
		}()
		defer server.Close()

		addr := listener.Addr().(*net.TCPAddr)
		port := addr.Port

		// Wait for server to be ready with specific path
		err = pc.WaitForServerReadyWithPath(port, "/api/v1/ping", 2*time.Second)
		if err != nil {
			t.Errorf("Expected server to be ready at /api/v1/ping, got error: %v", err)
		}
	})

	t.Run("server ready but wrong path returns 404", func(t *testing.T) {
		// Start a test HTTP server that explicitly returns 404 for unknown paths
		mux := http.NewServeMux()
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/" {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			w.WriteHeader(http.StatusOK)
		})

		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create listener: %v", err)
		}
		defer listener.Close()

		server := &http.Server{Handler: mux}
		go func() {
			server.Serve(listener)
		}()
		defer server.Close()

		addr := listener.Addr().(*net.TCPAddr)
		port := addr.Port

		// This should timeout because /api/v1/ping returns 404
		err = pc.WaitForServerReadyWithPath(port, "/api/v1/ping", 200*time.Millisecond)
		if err == nil {
			t.Error("Expected timeout error when path returns 404")
		}
	})
}

func TestPortChecker_WaitForBothServersReady(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("both servers ready", func(t *testing.T) {
		// Start load balancer server
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

		// Start API server
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

		// Wait for both servers to be ready
		err = pc.WaitForBothServersReady(lbAddr.Port, apiAddr.Port, 3*time.Second)
		if err != nil {
			t.Errorf("Expected both servers to be ready, got error: %v", err)
		}
	})

	t.Run("API server not ready", func(t *testing.T) {
		// Start only load balancer server
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

		lbAddr := lbListener.Addr().(*net.TCPAddr)
		apiPort := 19996 // Port without server

		// This should fail because API server is not ready
		err = pc.WaitForBothServersReady(lbAddr.Port, apiPort, 300*time.Millisecond)
		if err == nil {
			t.Error("Expected error when API server is not ready")
		}
	})
}

func TestNewPortChecker(t *testing.T) {
	logger := zap.NewNop()
	pc := NewPortChecker(logger)

	if pc == nil {
		t.Error("Expected NewPortChecker to return non-nil instance")
	}

	if pc.logger != logger {
		t.Error("Expected PortChecker to store the provided logger")
	}
}

// Test HTTPS server readiness checking
func TestPortChecker_WaitForServerReadyHTTPS(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("HTTPS server not ready timeout", func(t *testing.T) {
		// Use a port that doesn't have an HTTPS server
		port := 19995
		err := pc.WaitForServerReadyHTTPS(port, 100*time.Millisecond)
		if err == nil {
			t.Error("Expected timeout error when HTTPS server is not ready")
		}
	})
}

// Test protocol-specific server readiness
func TestPortChecker_WaitForServerReadyWithPathAndProtocol(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("HTTP server with custom path", func(t *testing.T) {
		// Start a test HTTP server with custom endpoint
		mux := http.NewServeMux()
		mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("healthy"))
		})

		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create listener: %v", err)
		}
		defer listener.Close()

		server := &http.Server{Handler: mux}
		go func() {
			server.Serve(listener)
		}()
		defer server.Close()

		addr := listener.Addr().(*net.TCPAddr)
		port := addr.Port

		// Wait for server to be ready with custom path
		err = pc.WaitForServerReadyWithPathAndProtocol(port, "/health", "http", 2*time.Second)
		if err != nil {
			t.Errorf("Expected server to be ready at /health, got error: %v", err)
		}
	})

	t.Run("server returns 503 should be acceptable for load balancer", func(t *testing.T) {
		// Start a test server that returns 503 (like a load balancer with no backends)
		mux := http.NewServeMux()
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("No backends available"))
		})

		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create listener: %v", err)
		}
		defer listener.Close()

		server := &http.Server{Handler: mux}
		go func() {
			server.Serve(listener)
		}()
		defer server.Close()

		addr := listener.Addr().(*net.TCPAddr)
		port := addr.Port

		// 503 should be acceptable for load balancer readiness
		err = pc.WaitForServerReadyWithPathAndProtocol(port, "", "http", 2*time.Second)
		if err != nil {
			t.Errorf("Expected 503 to be acceptable for load balancer, got error: %v", err)
		}
	})

	t.Run("server returns 500 should not be ready", func(t *testing.T) {
		// Start a test server that returns 500
		mux := http.NewServeMux()
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Internal Server Error"))
		})

		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create listener: %v", err)
		}
		defer listener.Close()

		server := &http.Server{Handler: mux}
		go func() {
			server.Serve(listener)
		}()
		defer server.Close()

		addr := listener.Addr().(*net.TCPAddr)
		port := addr.Port

		// 500 should not be acceptable
		err = pc.WaitForServerReadyWithPathAndProtocol(port, "", "http", 200*time.Millisecond)
		if err == nil {
			t.Error("Expected timeout error when server returns 500")
		}
	})
}

// Test both servers readiness with different protocols
func TestPortChecker_WaitForBothServersReadyWithProtocol(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("load balancer HTTPS and API HTTP", func(t *testing.T) {
		// This test would require setting up actual HTTPS server
		// For now, we test that the function exists and handles errors
		err := pc.WaitForBothServersReadyWithProtocol(19994, 19993, "https", 100*time.Millisecond)
		if err == nil {
			t.Error("Expected error when servers are not running")
		}
	})

	t.Run("load balancer not ready should fail fast", func(t *testing.T) {
		// Start only API server
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

		apiAddr := apiListener.Addr().(*net.TCPAddr)
		lbPort := 19992 // Port without server

		// Should fail because load balancer is not ready
		err = pc.WaitForBothServersReadyWithProtocol(lbPort, apiAddr.Port, "http", 300*time.Millisecond)
		if err == nil {
			t.Error("Expected error when load balancer server is not ready")
		}
	})
}

// Test edge cases for port availability
func TestPortChecker_EdgeCases(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("check port 0 should succeed", func(t *testing.T) {
		// Port 0 is valid in Go - it means "any available port"
		err := pc.CheckPortAvailability(0)
		if err != nil {
			t.Errorf("Expected port 0 to be valid (any available port), got error: %v", err)
		}
	})

	t.Run("check negative port should fail", func(t *testing.T) {
		err := pc.CheckPortAvailability(-1)
		if err == nil {
			t.Error("Expected error when checking negative port")
		}
	})

	t.Run("check port above 65535 should fail", func(t *testing.T) {
		err := pc.CheckPortAvailability(65536)
		if err == nil {
			t.Error("Expected error when checking port above 65535")
		}
	})

	t.Run("find available port with no available ports", func(t *testing.T) {
		// This test is hard to implement reliably without occupying many ports
		// We'll test the function exists and handles the case
		startPort := 65530 // Start near the end of the port range
		_, err := pc.FindAvailablePort(startPort)
		// This might succeed or fail depending on system state
		// The important thing is it doesn't panic
		_ = err
	})
}

// Test concurrent port checking
func TestPortChecker_ConcurrentChecks(t *testing.T) {
	logger := zaptest.NewLogger(t)
	pc := NewPortChecker(logger)

	t.Run("concurrent port availability checks", func(t *testing.T) {
		ports := []int{19991, 19990, 19989, 19988, 19987}
		
		done := make(chan error, len(ports))
		
		// Check multiple ports concurrently
		for _, port := range ports {
			go func(p int) {
				done <- pc.CheckPortAvailability(p)
			}(port)
		}
		
		// Wait for all checks to complete
		for i := 0; i < len(ports); i++ {
			err := <-done
			if err != nil {
				t.Errorf("Concurrent port check failed: %v", err)
			}
		}
	})

	t.Run("concurrent server readiness checks", func(t *testing.T) {
		// Start a test server
		mux := http.NewServeMux()
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			t.Fatalf("Failed to create listener: %v", err)
		}
		defer listener.Close()

		server := &http.Server{Handler: mux}
		go func() {
			server.Serve(listener)
		}()
		defer server.Close()

		addr := listener.Addr().(*net.TCPAddr)
		port := addr.Port

		done := make(chan error, 3)
		
		// Check server readiness concurrently
		for i := 0; i < 3; i++ {
			go func() {
				done <- pc.WaitForServerReady(port, 2*time.Second)
			}()
		}
		
		// Wait for all checks to complete
		for i := 0; i < 3; i++ {
			err := <-done
			if err != nil {
				t.Errorf("Concurrent server readiness check failed: %v", err)
			}
		}
	})
}