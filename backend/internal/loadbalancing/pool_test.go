package loadbalancing

import (
	"net/http"
	"net/url"
	"testing"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/model"
)

type dummyAlgo struct{}

func (d *dummyAlgo) Select(backends []*model.BackendServer, _ *http.Request, _ uint64) *model.BackendServer {
	if len(backends) == 0 {
		return nil
	}
	return backends[0]
}

func newTestServer(id, rawurl string, weight int, status model.HealthStatus) *model.BackendServer {
	u, _ := url.Parse(rawurl)
	return &model.BackendServer{
		ID:           id,
		URL:          u,
		Weight:       weight,
		HealthStatus: status,
	}
}

func TestAddAndRemoveServer(t *testing.T) {
	pool := NewServerPool(&dummyAlgo{})
	s1 := newTestServer("s1", "http://localhost:9001", 1, model.HEALTHY)
	s2 := newTestServer("s2", "http://localhost:9002", 1, model.UNHEALTHY)
	pool.AddServer(s1)
	pool.AddServer(s2)
	if len(pool.GetServers()) != 2 {
		t.Errorf("expected 2 servers, got %d", len(pool.GetServers()))
	}
	removed := pool.RemoveServer("s1")
	if !removed || len(pool.GetServers()) != 1 {
		t.Errorf("expected 1 server after removal, got %d", len(pool.GetServers()))
	}
}

func TestGetHealthyServers(t *testing.T) {
	pool := NewServerPool(&dummyAlgo{})
	s1 := newTestServer("s1", "http://localhost:9001", 1, model.HEALTHY)
	s2 := newTestServer("s2", "http://localhost:9002", 1, model.UNHEALTHY)
	pool.AddServer(s1)
	pool.AddServer(s2)
	healthy := pool.GetHealthyServers()
	if len(healthy) != 1 || healthy[0].ID != "s1" {
		t.Errorf("expected only s1 to be healthy")
	}
}

func TestSetBackendStatus(t *testing.T) {
	pool := NewServerPool(&dummyAlgo{})
	s1 := newTestServer("s1", "http://localhost:9001", 1, model.UNHEALTHY)
	pool.AddServer(s1)
	pool.SetBackendStatus("s1", model.HEALTHY)
	healthy := pool.GetHealthyServers()
	if len(healthy) != 1 || healthy[0].HealthStatus != model.HEALTHY {
		t.Errorf("expected s1 to be healthy after status update")
	}
}
