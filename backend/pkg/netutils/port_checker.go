package netutils

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// PortChecker provides utilities for checking port availability and server readiness
type PortChecker struct {
	logger *zap.Logger
}

// NewPortChecker creates a new PortChecker instance
func NewPortChecker(logger *zap.Logger) *PortChecker {
	return &PortChecker{
		logger: logger,
	}
}

// CheckPortAvailability checks if a specific port is available for binding
func (pc *PortChecker) CheckPortAvailability(port int) error {
	address := fmt.Sprintf(":%d", port)
	
	// Try to listen on the port
	listener, err := net.Listen("tcp", address)
	if err != nil {
		pc.logger.Error("Port is not available", 
			zap.Int("port", port), 
			zap.Error(err))
		return fmt.Errorf("port %d is not available: %w", port, err)
	}
	
	// Close the listener immediately since we're just checking availability
	if closeErr := listener.Close(); closeErr != nil {
		pc.logger.Warn("Failed to close test listener", 
			zap.Int("port", port), 
			zap.Error(closeErr))
	}
	
	pc.logger.Debug("Port is available", zap.Int("port", port))
	return nil
}

// CheckRequiredPorts checks if both required ports (8080 and 8081) are available
func (pc *PortChecker) CheckRequiredPorts() error {
	ports := []int{8080, 8081}
	
	for _, port := range ports {
		if err := pc.CheckPortAvailability(port); err != nil {
			return fmt.Errorf("required port check failed: %w", err)
		}
	}
	
	pc.logger.Info("All required ports are available", zap.Ints("ports", ports))
	return nil
}

// WaitForServerReady waits for a server to be ready on the specified port with timeout
func (pc *PortChecker) WaitForServerReady(port int, timeout time.Duration) error {
	return pc.WaitForServerReadyWithPath(port, "", timeout)
}

// WaitForServerReadyHTTPS waits for an HTTPS server to be ready on the specified port with timeout
func (pc *PortChecker) WaitForServerReadyHTTPS(port int, timeout time.Duration) error {
	return pc.WaitForServerReadyWithPathAndProtocol(port, "", "https", timeout)
}

// WaitForServerReadyWithPath waits for a server to be ready on the specified port and path with timeout
func (pc *PortChecker) WaitForServerReadyWithPath(port int, path string, timeout time.Duration) error {
	return pc.WaitForServerReadyWithPathAndProtocol(port, path, "http", timeout)
}

// WaitForServerReadyWithPathAndProtocol waits for a server to be ready with specified protocol, port and path
func (pc *PortChecker) WaitForServerReadyWithPathAndProtocol(port int, path, protocol string, timeout time.Duration) error {
	url := fmt.Sprintf("%s://localhost:%d%s", protocol, port, path)
	
	pc.logger.Info("Waiting for server to be ready", 
		zap.String("url", url), 
		zap.Duration("timeout", timeout))
	
	client := &http.Client{
		Timeout: 1 * time.Second, // Short timeout for individual requests
	}
	
	// For HTTPS, we need to handle self-signed certificates
	if protocol == "https" {
		client.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
	}
	
	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			if time.Now().After(deadline) {
				pc.logger.Error("Timeout waiting for server to be ready", 
					zap.String("url", url), 
					zap.Duration("timeout", timeout))
				return fmt.Errorf("timeout waiting for server on port %d to be ready after %v", port, timeout)
			}
			
			resp, err := client.Get(url)
			if err != nil {
				pc.logger.Debug("Server not ready yet", 
					zap.String("url", url), 
					zap.Error(err))
				continue
			}
			
			resp.Body.Close()
			
			// For load balancer, 503 is acceptable (means server is running but no backends)
			// For API server, we expect 2xx or 3xx status codes
			if (resp.StatusCode >= 200 && resp.StatusCode < 400) || resp.StatusCode == 503 {
				pc.logger.Info("Server is ready", 
					zap.String("url", url), 
					zap.Int("statusCode", resp.StatusCode))
				return nil
			}
			
			pc.logger.Debug("Server responded but not ready", 
				zap.String("url", url), 
				zap.Int("statusCode", resp.StatusCode))
		}
	}
}

// WaitForBothServersReady waits for both load balancer and API servers to be ready
func (pc *PortChecker) WaitForBothServersReady(lbPort, apiPort int, timeout time.Duration) error {
	return pc.WaitForBothServersReadyWithProtocol(lbPort, apiPort, "http", timeout)
}

// WaitForBothServersReadyWithProtocol waits for both servers to be ready with specified load balancer protocol
func (pc *PortChecker) WaitForBothServersReadyWithProtocol(lbPort, apiPort int, lbProtocol string, timeout time.Duration) error {
	pc.logger.Info("Waiting for both servers to be ready", 
		zap.Int("lbPort", lbPort), 
		zap.Int("apiPort", apiPort), 
		zap.String("lbProtocol", lbProtocol),
		zap.Duration("timeout", timeout))
	
	// Wait for load balancer server with appropriate protocol
	if err := pc.WaitForServerReadyWithPathAndProtocol(lbPort, "", lbProtocol, timeout/2); err != nil {
		return fmt.Errorf("load balancer server not ready: %w", err)
	}
	
	// Wait for API server with ping endpoint (always HTTP)
	if err := pc.WaitForServerReadyWithPath(apiPort, "/api/v1/ping", timeout/2); err != nil {
		return fmt.Errorf("API server not ready: %w", err)
	}
	
	pc.logger.Info("Both servers are ready and responding")
	return nil
}

// IsPortInUse checks if a port is currently in use (opposite of CheckPortAvailability)
func (pc *PortChecker) IsPortInUse(port int) bool {
	err := pc.CheckPortAvailability(port)
	return err != nil
}

// FindAvailablePort finds an available port starting from the given port
func (pc *PortChecker) FindAvailablePort(startPort int) (int, error) {
	for port := startPort; port < startPort+100; port++ {
		if err := pc.CheckPortAvailability(port); err == nil {
			pc.logger.Info("Found available port", 
				zap.Int("requestedPort", startPort), 
				zap.Int("availablePort", port))
			return port, nil
		}
	}
	
	return 0, fmt.Errorf("no available port found starting from %d", startPort)
}