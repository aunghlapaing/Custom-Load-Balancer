package server

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/config"
	"github.com/aungh/GoLoadBalancerApplication/backend/pkg/netutils"
)

// ServerManager coordinates the startup and shutdown of both load balancer and API servers
type ServerManager struct {
	config      *config.Config
	logger      *zap.Logger
	lbServer    *http.Server
	apiServer   *http.Server
	portChecker *netutils.PortChecker
}

// ServerInfo represents the status of a server
type ServerInfo struct {
	Port      int    `json:"port"`
	Status    string `json:"status"`   // "running", "stopped", "error"
	Protocol  string `json:"protocol"` // "http"
	Error     string `json:"error,omitempty"`
	StartTime string `json:"startTime,omitempty"`
}

// ServerStatus represents the status of both servers
type ServerStatus struct {
	LoadBalancer ServerInfo `json:"loadBalancer"`
	API          ServerInfo `json:"api"`
}

// NewServerManager creates a new ServerManager instance
func NewServerManager(cfg *config.Config, logger *zap.Logger) *ServerManager {
	return &ServerManager{
		config:      cfg,
		logger:      logger,
		portChecker: netutils.NewPortChecker(logger),
	}
}

// SetServers sets the HTTP servers to be managed
func (sm *ServerManager) SetServers(lbServer, apiServer *http.Server) {
	sm.lbServer = lbServer
	sm.apiServer = apiServer
}

// StartServers starts both servers sequentially
func (sm *ServerManager) StartServers() error {
	if sm.lbServer == nil || sm.apiServer == nil {
		return fmt.Errorf("servers not configured - call SetServers first")
	}

	sm.logger.Info("Starting servers sequentially",
		zap.Int("lbPort", sm.config.LoadBalancerPort),
		zap.Int("apiPort", sm.config.ApiPort))

	// Check port availability before starting servers
	if err := sm.CheckPortAvailability(); err != nil {
		return fmt.Errorf("port availability check failed: %w", err)
	}

	// Start servers
	if err := sm.startBothServers(); err != nil {
		return fmt.Errorf("failed to start servers: %w", err)
	}

	// Verify both servers are ready
	if err := sm.VerifyStartup(); err != nil {
		sm.logger.Error("Server startup verification failed", zap.Error(err))
		// Attempt graceful shutdown of both servers
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		sm.shutdownBothServers(ctx)
		return fmt.Errorf("server startup verification failed: %w", err)
	}

	sm.logger.Info("Both servers started successfully and verified")
	return nil
}

// startBothServers starts both servers
func (sm *ServerManager) startBothServers() error {
	// Start load balancer server first
	if err := sm.startLoadBalancerServer(); err != nil {
		return fmt.Errorf("failed to start load balancer server: %w", err)
	}

	// Start API server second
	if err := sm.startAPIServer(); err != nil {
		// If API server fails, shutdown the load balancer server
		sm.logger.Error("API server failed to start, shutting down load balancer server")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if shutdownErr := sm.lbServer.Shutdown(ctx); shutdownErr != nil {
			sm.logger.Error("Failed to shutdown load balancer server after API failure", zap.Error(shutdownErr))
		}
		return fmt.Errorf("failed to start API server: %w", err)
	}

	return nil
}

// startLoadBalancerServer starts the load balancer server
func (sm *ServerManager) startLoadBalancerServer() error {
	sm.logger.Info("Starting load balancer server",
		zap.Int("port", sm.config.LoadBalancerPort))

	// Start server in a goroutine
	errChan := make(chan error, 1)
	go func() {
		err := sm.lbServer.ListenAndServe()
		if err != nil && err != http.ErrServerClosed {
			sm.logger.Error("Load Balancer server failed", zap.Error(err))
			errChan <- err
		}
	}()

	// Wait a moment to see if the server fails immediately
	select {
	case err := <-errChan:
		return err
	case <-time.After(100 * time.Millisecond):
		// Server started without immediate error
		sm.logger.Info("Load balancer server started successfully", zap.Int("port", sm.config.LoadBalancerPort))
		return nil
	}
}

// startAPIServer starts the API server
func (sm *ServerManager) startAPIServer() error {
	sm.logger.Info("Starting API server", zap.Int("port", sm.config.ApiPort))

	// Start server in a goroutine
	errChan := make(chan error, 1)
	go func() {
		err := sm.apiServer.ListenAndServe()
		if err != nil && err != http.ErrServerClosed {
			sm.logger.Error("API server failed", zap.Error(err), zap.Int("port", sm.config.ApiPort))
			errChan <- err
		}
	}()

	// Wait a moment to see if the server fails immediately
	select {
	case err := <-errChan:
		return err
	case <-time.After(100 * time.Millisecond):
		// Server started without immediate error
		sm.logger.Info("API server started successfully", zap.Int("port", sm.config.ApiPort))
		return nil
	}
}

// CheckPortAvailability checks if the required ports are available before starting servers
func (sm *ServerManager) CheckPortAvailability() error {
	sm.logger.Info("Checking port availability",
		zap.Int("lbPort", sm.config.LoadBalancerPort),
		zap.Int("apiPort", sm.config.ApiPort))

	// Check load balancer port
	if err := sm.portChecker.CheckPortAvailability(sm.config.LoadBalancerPort); err != nil {
		return fmt.Errorf("load balancer port %d is not available: %w", sm.config.LoadBalancerPort, err)
	}

	// Check API port
	if err := sm.portChecker.CheckPortAvailability(sm.config.ApiPort); err != nil {
		return fmt.Errorf("API port %d is not available: %w", sm.config.ApiPort, err)
	}

	sm.logger.Info("All required ports are available")
	return nil
}

// WaitForServersReady waits for both servers to be ready with timeout
func (sm *ServerManager) WaitForServersReady(timeout time.Duration) error {
	return sm.WaitForServersReadyWithProtocol("http", timeout)
}

// WaitForServersReadyWithProtocol waits for both servers to be ready with specified load balancer protocol
func (sm *ServerManager) WaitForServersReadyWithProtocol(lbProtocol string, timeout time.Duration) error {
	return sm.portChecker.WaitForBothServersReadyWithProtocol(sm.config.LoadBalancerPort, sm.config.ApiPort, lbProtocol, timeout)
}

// VerifyStartup verifies that both servers are running and responding
func (sm *ServerManager) VerifyStartup() error {
	sm.logger.Info("Verifying server startup")

	// Use HTTP protocol for verification
	if err := sm.WaitForServersReadyWithProtocol("http", 5*time.Second); err != nil {
		return fmt.Errorf("server readiness verification failed: %w", err)
	}

	sm.logger.Info("Server startup verification completed successfully")
	return nil
}

// Shutdown gracefully shuts down both servers
func (sm *ServerManager) Shutdown(ctx context.Context) error {
	sm.logger.Info("Shutting down servers gracefully")
	return sm.shutdownBothServers(ctx)
}

// shutdownBothServers shuts down both servers with the given context
func (sm *ServerManager) shutdownBothServers(ctx context.Context) error {
	var lbErr, apiErr error

	// Shutdown both servers concurrently
	done := make(chan struct{}, 2)

	// Shutdown load balancer server
	go func() {
		defer func() { done <- struct{}{} }()
		if sm.lbServer != nil {
			if err := sm.lbServer.Shutdown(ctx); err != nil {
				sm.logger.Error("Load Balancer server shutdown failed", zap.Error(err))
				lbErr = err
			} else {
				sm.logger.Info("Load Balancer server shutdown successfully")
			}
		}
	}()

	// Shutdown API server
	go func() {
		defer func() { done <- struct{}{} }()
		if sm.apiServer != nil {
			if err := sm.apiServer.Shutdown(ctx); err != nil {
				sm.logger.Error("API server shutdown failed", zap.Error(err))
				apiErr = err
			} else {
				sm.logger.Info("API server shutdown successfully")
			}
		}
	}()

	// Wait for both shutdowns to complete
	<-done
	<-done

	// Return any errors that occurred
	if lbErr != nil && apiErr != nil {
		return fmt.Errorf("both servers failed to shutdown: lb=%v, api=%v", lbErr, apiErr)
	}
	if lbErr != nil {
		return fmt.Errorf("load balancer shutdown failed: %w", lbErr)
	}
	if apiErr != nil {
		return fmt.Errorf("API server shutdown failed: %w", apiErr)
	}

	sm.logger.Info("All servers shutdown successfully")
	return nil
}

// GetStatus returns the current status of both servers
func (sm *ServerManager) GetStatus() ServerStatus {
	status := ServerStatus{
		LoadBalancer: ServerInfo{
			Port:   sm.config.LoadBalancerPort,
			Status: "unknown",
		},
		API: ServerInfo{
			Port:   sm.config.ApiPort,
			Status: "unknown",
		},
	}

	// Simple check to see if servers are configured
	if sm.lbServer != nil {
		status.LoadBalancer.Status = "configured"
	}
	if sm.apiServer != nil {
		status.API.Status = "configured"
	}

	return status
}
