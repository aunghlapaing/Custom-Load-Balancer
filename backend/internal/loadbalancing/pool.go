package loadbalancing

import (
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"go.uber.org/zap"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/geographic"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/model"
)

// LoadBalancingAlgorithm defines the interface for different load balancing strategies.
type LoadBalancingAlgorithm interface {
	Select(backends []*model.BackendServer, req *http.Request, current uint64) *model.BackendServer
}

type ServerPool struct {
	backends     []*model.BackendServer
	current      uint64 // For Round Robin, or other algorithm state
	algorithm    LoadBalancingAlgorithm
	mu           sync.RWMutex // Protects 'backends' slice
	
	// Request metrics
	totalRequests    uint64 // Total requests processed
	requestsLastMin  uint64 // Requests in the last minute (for RPS calculation)
	lastResetTime    int64  // Last time we reset the per-minute counter
	
	// Geographic tracking
	geoTracker *geographic.GeographicTracker
}

// NewServerPool creates a new ServerPool.
func NewServerPool(algo LoadBalancingAlgorithm) *ServerPool {
	return &ServerPool{
		backends:      make([]*model.BackendServer, 0),
		algorithm:     algo,
		lastResetTime: time.Now().Unix(),
		geoTracker:    nil, // Will be initialized when logger is available
	}
}

// NewServerPoolWithLogger creates a new ServerPool with geographic tracking enabled.
func NewServerPoolWithLogger(algo LoadBalancingAlgorithm, logger *zap.Logger) *ServerPool {
	return &ServerPool{
		backends:      make([]*model.BackendServer, 0),
		algorithm:     algo,
		lastResetTime: time.Now().Unix(),
		geoTracker:    geographic.NewGeographicTracker(logger),
	}
}

// AddServer adds a backend server to the pool.
func (sp *ServerPool) AddServer(server *model.BackendServer) {
	sp.mu.Lock()
	defer sp.mu.Unlock()
	sp.backends = append(sp.backends, server)
}

// RemoveServer removes a backend server from the pool by ID.
func (sp *ServerPool) RemoveServer(serverID string) bool {
	sp.mu.Lock()
	defer sp.mu.Unlock()
	for i, server := range sp.backends {
		if server.ID == serverID {
			sp.backends = append(sp.backends[:i], sp.backends[i+1:]...)
			return true
		}
	}
	return false
}

// GetHealthyServers returns a list of currently healthy backend servers.
func (sp *ServerPool) GetHealthyServers() []*model.BackendServer {
	sp.mu.RLock()
	defer sp.mu.RUnlock()
	healthy := make([]*model.BackendServer, 0)
	for _, s := range sp.backends {
		if s.IsAlive() {
			healthy = append(healthy, s)
		}
	}
	return healthy
}

// GetServers returns all backend servers (healthy or not).
func (sp *ServerPool) GetServers() []*model.BackendServer {
	sp.mu.RLock()
	defer sp.mu.RUnlock()
	servers := make([]*model.BackendServer, len(sp.backends))
	copy(servers, sp.backends)
	return servers
}

// Select a backend using the configured algorithm.
func (sp *ServerPool) SelectBackend(req *http.Request) *model.BackendServer {
	return sp.algorithm.Select(sp.GetHealthyServers(), req, sp.current) // Pass current for RR
}

// Next increments the Round Robin counter
func (sp *ServerPool) Next() {
	atomic.AddUint64(&sp.current, 1)
}

// SetBackendStatus updates the health status of a specific backend.
func (sp *ServerPool) SetBackendStatus(serverID string, status model.HealthStatus) {
	sp.mu.RLock() // Use RLock first to find, then Lock for update if needed
	for _, server := range sp.backends {
		if server.ID == serverID {
			sp.mu.RUnlock()
			server.SetStatus(status)
			return
		}
	}
	sp.mu.RUnlock()
}

// SetAlgorithm sets the load balancing algorithm for the pool.
func (sp *ServerPool) SetAlgorithm(algo LoadBalancingAlgorithm) {
	sp.mu.Lock()
	defer sp.mu.Unlock()
	sp.algorithm = algo
}

// IncrementRequestCount increments the total request count and per-minute counter
func (sp *ServerPool) IncrementRequestCount() {
	atomic.AddUint64(&sp.totalRequests, 1)
	atomic.AddUint64(&sp.requestsLastMin, 1)
}

// GetTotalRequests returns the total number of requests processed
func (sp *ServerPool) GetTotalRequests() uint64 {
	return atomic.LoadUint64(&sp.totalRequests)
}

// GetRequestsPerSecond calculates and returns the current requests per second
func (sp *ServerPool) GetRequestsPerSecond() float64 {
	now := time.Now().Unix()
	lastReset := atomic.LoadInt64(&sp.lastResetTime)
	
	// If more than 60 seconds have passed, reset the counter
	if now-lastReset >= 60 {
		if atomic.CompareAndSwapInt64(&sp.lastResetTime, lastReset, now) {
			// Reset the per-minute counter
			atomic.StoreUint64(&sp.requestsLastMin, 0)
			return 0.0
		}
	}
	
	// Calculate RPS based on requests in the current minute
	requestsInMin := atomic.LoadUint64(&sp.requestsLastMin)
	elapsedSeconds := now - lastReset
	if elapsedSeconds > 0 {
		return float64(requestsInMin) / float64(elapsedSeconds)
	}
	
	return 0.0
}

// TrackRequestWithIP tracks a request with geographic information
func (sp *ServerPool) TrackRequestWithIP(req *http.Request) {
	// Increment request count
	sp.IncrementRequestCount()
	
	// Track geographic data if tracker is available
	if sp.geoTracker != nil {
		clientIP := geographic.ExtractClientIP(req)
		sp.geoTracker.TrackRequest(clientIP)
	}
}

// GetGeographicStats returns geographic statistics
func (sp *ServerPool) GetGeographicStats() []*geographic.CountryStats {
	if sp.geoTracker == nil {
		return []*geographic.CountryStats{}
	}
	return sp.geoTracker.GetGeographicStats()
}

// InitializeGeographicTracker initializes the geographic tracker with a logger
func (sp *ServerPool) InitializeGeographicTracker(logger *zap.Logger) {
	if sp.geoTracker == nil {
		sp.geoTracker = geographic.NewGeographicTracker(logger)
	}
}
