package core

import (
	"net/http"
	"net/http/httputil"

	"go.uber.org/zap"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/loadbalancing"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/routing"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/session"
)

// LoadBalancer is the core load balancing service handler.
type LoadBalancer struct {
	Pool       *loadbalancing.ServerPool
	Logger     *zap.Logger
	SessionMgr *session.SessionManager
	L7Router   *routing.L7Router
}

// NewLoadBalancer creates a new LoadBalancer instance.
func NewLoadBalancer(pool *loadbalancing.ServerPool, log *zap.Logger) *LoadBalancer {
	return &LoadBalancer{
		Pool:       pool,
		Logger:     log,
		SessionMgr: session.NewSessionManager(),
		L7Router:   nil, // Set externally if needed
	}
}

// ServeHTTP implements the http.Handler interface for the load balancer.
func (lb *LoadBalancer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	lb.Logger.Info("Incoming request", zap.String("method", r.Method), zap.String("path", r.URL.Path), zap.String("remote_addr", r.RemoteAddr))

	// Layer 7 routing: select pool based on rules, else use default
	pool := lb.Pool
	if lb.L7Router != nil {
		if routed := lb.L7Router.Route(r); routed != nil {
			pool = routed
		}
	}

	// Sticky session logic (per pool)
	backend := lb.SessionMgr.GetStickyServer(r, pool)
	if backend == nil {
		backend = pool.SelectBackend(r)
		if backend != nil {
			lb.SessionMgr.SetStickyServer(w, backend)
		}
		// Increment counter after successful backend selection for Round Robin
		pool.Next()
	}

	if backend == nil {
		lb.Logger.Error("No healthy backend servers available", zap.String("path", r.URL.Path))
		http.Error(w, "Service Unavailable", http.StatusServiceUnavailable)
		return
	}

	// Track request with geographic information when we successfully have a backend to route to
	lb.Pool.TrackRequestWithIP(r)

	// Increment active connections to the selected backend
	backend.IncrementConnections()
	defer backend.DecrementConnections() // Decrement when request is done

	// Create and execute a reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(backend.URL)
	proxy.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, err error) {
		lb.Logger.Error("Proxy error", zap.Error(err), zap.String("backend_id", backend.ID), zap.String("backend_url", backend.URL.String()))
		http.Error(rw, "Bad Gateway", http.StatusBadGateway)
	}

	// Log the chosen backend
	lb.Logger.Info("Routing request",
		zap.String("backend_id", backend.ID),
		zap.String("backend_url", backend.URL.String()),
		zap.Int64("active_connections", backend.GetActiveConnections()),
	)

	proxy.ServeHTTP(w, r)
}
