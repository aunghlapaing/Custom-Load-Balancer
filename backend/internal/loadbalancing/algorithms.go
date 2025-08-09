package loadbalancing

import (
	"hash/fnv"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/model"
)

// RoundRobinAlgorithm implements the Round Robin load balancing strategy.
type RoundRobinAlgorithm struct{}

func (rra *RoundRobinAlgorithm) Select(backends []*model.BackendServer, req *http.Request, current uint64) *model.BackendServer {
	if len(backends) == 0 {
		return nil
	}
	idx := current % uint64(len(backends))
	return backends[idx]
}

// LeastConnectionsAlgorithm implements the Least Connections load balancing strategy.
type LeastConnectionsAlgorithm struct{}

func (lca *LeastConnectionsAlgorithm) Select(backends []*model.BackendServer, req *http.Request, current uint64) *model.BackendServer {
	if len(backends) == 0 {
		return nil
	}
	var minConnections int64 = -1
	var selectedServer *model.BackendServer
	for _, server := range backends {
		conns := server.GetActiveConnections()
		if selectedServer == nil || conns < minConnections {
			minConnections = conns
			selectedServer = server
		}
	}
	return selectedServer
}

// IPHashAlgorithm implements client IP hashing to select a backend.
type IPHashAlgorithm struct{}

func (ipha *IPHashAlgorithm) Select(backends []*model.BackendServer, req *http.Request, current uint64) *model.BackendServer {
	if len(backends) == 0 {
		return nil
	}
	ip := req.RemoteAddr
	h := fnv.New32a()
	h.Write([]byte(ip))
	idx := h.Sum32() % uint32(len(backends))
	return backends[idx]
}

// WeightedRoundRobinAlgorithm implements weighted round robin selection.
type WeightedRoundRobinAlgorithm struct {
	currentWeights map[string]int
	mu             sync.RWMutex
}

func NewWeightedRoundRobinAlgorithm() *WeightedRoundRobinAlgorithm {
	return &WeightedRoundRobinAlgorithm{
		currentWeights: make(map[string]int),
	}
}

func (wrr *WeightedRoundRobinAlgorithm) Select(backends []*model.BackendServer, req *http.Request, current uint64) *model.BackendServer {
	if len(backends) == 0 {
		return nil
	}

	wrr.mu.Lock()
	defer wrr.mu.Unlock()

	// Initialize current weights if needed
	for _, server := range backends {
		if _, exists := wrr.currentWeights[server.ID]; !exists {
			wrr.currentWeights[server.ID] = 0
		}
	}

	// Find total weight and max current weight
	totalWeight := 0
	maxCurrentWeight := 0
	var selectedServer *model.BackendServer

	for _, server := range backends {
		if server.Weight <= 0 {
			continue // Skip servers with zero or negative weight
		}
		
		totalWeight += server.Weight
		wrr.currentWeights[server.ID] += server.Weight
		
		if selectedServer == nil || wrr.currentWeights[server.ID] > maxCurrentWeight {
			maxCurrentWeight = wrr.currentWeights[server.ID]
			selectedServer = server
		}
	}

	if selectedServer == nil {
		// No servers with positive weight, fall back to first server
		return backends[0]
	}

	// Decrease the selected server's current weight by total weight
	wrr.currentWeights[selectedServer.ID] -= totalWeight

	return selectedServer
}

// WeightedAlgorithm implements simple weighted random selection (kept for backward compatibility).
type WeightedAlgorithm struct{}

func (wa *WeightedAlgorithm) Select(backends []*model.BackendServer, req *http.Request, current uint64) *model.BackendServer {
	if len(backends) == 0 {
		return nil
	}
	totalWeight := 0
	for _, s := range backends {
		if s.Weight > 0 {
			totalWeight += s.Weight
		}
	}
	if totalWeight == 0 {
		return backends[0]
	}
	r := rand.New(rand.NewSource(time.Now().UnixNano())).Intn(totalWeight)
	for _, s := range backends {
		if s.Weight > 0 {
			if r < s.Weight {
				return s
			}
			r -= s.Weight
		}
	}
	return backends[0]
}
