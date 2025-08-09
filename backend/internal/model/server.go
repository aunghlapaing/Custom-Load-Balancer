package model

import (
	"net/url"
	"sync"
	"time"
)

// HealthStatus defines the health state of a backend server.
type HealthStatus string

const (
	HEALTHY     HealthStatus = "HEALTHY"
	DEGRADED    HealthStatus = "DEGRADED"
	UNHEALTHY   HealthStatus = "UNHEALTHY"
	MAINTENANCE HealthStatus = "MAINTENANCE"
)

// BackendServer represents a single backend server that the load balancer can forward requests to.
type BackendServer struct {
	ID                string        `json:"id"`
	URL               *url.URL      `json:"url"`
	Weight            int           `json:"weight"`
	ActiveConnections int64         `json:"activeConnections"` // Using int64 for atomic operations
	HealthStatus      HealthStatus  `json:"healthStatus"`
	lastHealthCheck   time.Time
	lastResponseTime  time.Duration // Track response time from health checks
	mu                sync.RWMutex  // Protects healthStatus, activeConnections, and responseTime
}

// NewBackendServer creates a new BackendServer instance.
func NewBackendServer(id string, rawURL string, weight int) (*BackendServer, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	return &BackendServer{
		ID:                id,
		URL:               u,
		Weight:            weight,
		ActiveConnections: 0,
		HealthStatus:      UNHEALTHY, // Initially unhealthy
	}, nil
}

// SetStatus atomically updates the health status.
func (b *BackendServer) SetStatus(status HealthStatus) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.HealthStatus = status
	b.lastHealthCheck = time.Now()
}

// IsAlive checks if the server is healthy or degraded.
func (b *BackendServer) IsAlive() bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.HealthStatus == HEALTHY || b.HealthStatus == DEGRADED
}

// IncrementConnections atomically increments active connections.
func (b *BackendServer) IncrementConnections() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.ActiveConnections++
}

// DecrementConnections atomically decrements active connections.
func (b *BackendServer) DecrementConnections() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.ActiveConnections > 0 {
		b.ActiveConnections--
	}
}

// GetActiveConnections returns the current active connections.
func (b *BackendServer) GetActiveConnections() int64 {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.ActiveConnections
}

// SetResponseTime atomically updates the last response time.
func (b *BackendServer) SetResponseTime(responseTime time.Duration) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.lastResponseTime = responseTime
}

// GetResponseTime returns the last recorded response time in milliseconds.
func (b *BackendServer) GetResponseTime() int64 {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.lastResponseTime.Nanoseconds() / int64(time.Millisecond)
}
