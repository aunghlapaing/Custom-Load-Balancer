package healthchecks

import (
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/config"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/loadbalancing"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/model"
	"go.uber.org/zap"
)

// Checker defines the interface for different health check types.
type Checker interface {
	Check(server *model.BackendServer) error
}

// HTTPHealthChecker performs HTTP GET health checks.
type HTTPHealthChecker struct {
	client *http.Client
	path   string
}

func NewHTTPHealthChecker(timeout time.Duration, path string) *HTTPHealthChecker {
	return &HTTPHealthChecker{
		client: &http.Client{
			Timeout: timeout,
		},
		path: path,
	}
}

func (hc *HTTPHealthChecker) Check(server *model.BackendServer) error {
	req, err := http.NewRequest("GET", server.URL.String()+hc.path, nil)
	if err != nil {
		return err
	}
	
	// Measure response time
	start := time.Now()
	resp, err := hc.client.Do(req)
	responseTime := time.Since(start)
	
	// Always record response time, even for failed requests
	server.SetResponseTime(responseTime)
	
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("http status not OK: %d", resp.StatusCode)
	}
	return nil
}

// TCPHealthChecker performs TCP dial health checks.
type TCPHealthChecker struct {
	timeout time.Duration
}

func NewTCPHealthChecker(timeout time.Duration) *TCPHealthChecker {
	return &TCPHealthChecker{timeout: timeout}
}

func (tc *TCPHealthChecker) Check(server *model.BackendServer) error {
	// Measure response time
	start := time.Now()
	conn, err := net.DialTimeout("tcp", server.URL.Host, tc.timeout)
	responseTime := time.Since(start)
	
	// Always record response time, even for failed connections
	server.SetResponseTime(responseTime)
	
	if err != nil {
		return err
	}
	_ = conn.Close()
	return nil
}

// StartHealthChecks begins a goroutine to periodically check backend health.
func StartHealthChecks(pool *loadbalancing.ServerPool, cfg config.HealthCheckConfig, log *zap.Logger) {
	ticker := time.NewTicker(time.Duration(cfg.IntervalSeconds) * time.Second)
	go func() {
		for range ticker.C {
			log.Debug("Running health checks...")
			servers := pool.GetServers() // Get all servers, even if marked unhealthy
			for _, server := range servers {
				if server.HealthStatus == model.MAINTENANCE {
					continue // Skip health checks for servers in maintenance
				}

				var checker Checker
				// You can make this configurable per server or global in config
				if server.URL.Scheme == "http" || server.URL.Scheme == "https" {
					checker = NewHTTPHealthChecker(time.Duration(cfg.TimeoutSeconds)*time.Second, cfg.Path)
				} else {
					checker = NewTCPHealthChecker(time.Duration(cfg.TimeoutSeconds) * time.Second)
				}

				err := checker.Check(server)
				if err != nil {
					server.SetStatus(model.UNHEALTHY)
					log.Error("Backend server unhealthy", zap.Error(err), zap.String("server_id", server.ID), zap.String("url", server.URL.String()))
				} else {
					if server.HealthStatus != model.HEALTHY {
						server.SetStatus(model.HEALTHY)
						log.Info("Backend server healthy again", zap.String("server_id", server.ID), zap.String("url", server.URL.String()))
					}
				}
			}
		}
	}()
}
