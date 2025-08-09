package session

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/loadbalancing"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/model"
)

func newTestPoolWithServers(servers []*model.BackendServer) *loadbalancing.ServerPool {
	pool := loadbalancing.NewServerPool(&dummyAlgo{})
	for _, s := range servers {
		pool.AddServer(s)
	}
	return pool
}

type dummyAlgo struct{}

func (d *dummyAlgo) Select(backends []*model.BackendServer, _ *http.Request, _ uint64) *model.BackendServer {
	if len(backends) == 0 {
		return nil
	}
	return backends[0]
}

func TestSetAndGetStickyServer(t *testing.T) {
	sm := NewSessionManager()
	srv := &model.BackendServer{ID: "s1", HealthStatus: model.HEALTHY}
	pool := newTestPoolWithServers([]*model.BackendServer{srv})

	rw := httptest.NewRecorder()
	sm.SetStickyServer(rw, srv)
	resp := rw.Result()
	cookie := resp.Cookies()[0]

	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(cookie)
	got := sm.GetStickyServer(req, pool)
	if got == nil || got.ID != "s1" {
		t.Errorf("expected to get sticky server s1, got %v", got)
	}
}

func TestGetStickyServer_UnhealthyOrRemoved(t *testing.T) {
	sm := NewSessionManager()
	srv := &model.BackendServer{ID: "s1", HealthStatus: model.UNHEALTHY}
	pool := newTestPoolWithServers([]*model.BackendServer{srv})

	rw := httptest.NewRecorder()
	sm.SetStickyServer(rw, srv)
	resp := rw.Result()
	cookie := resp.Cookies()[0]

	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(cookie)
	got := sm.GetStickyServer(req, pool)
	if got != nil {
		t.Errorf("expected nil for unhealthy sticky server, got %v", got)
	}

	// Remove server from pool
	pool = newTestPoolWithServers([]*model.BackendServer{})
	got = sm.GetStickyServer(req, pool)
	if got != nil {
		t.Errorf("expected nil for removed sticky server, got %v", got)
	}
}

func TestGetStickyServer_NoCookie(t *testing.T) {
	sm := NewSessionManager()
	pool := newTestPoolWithServers([]*model.BackendServer{})
	req := httptest.NewRequest("GET", "/", nil)
	got := sm.GetStickyServer(req, pool)
	if got != nil {
		t.Errorf("expected nil when no cookie, got %v", got)
	}
}
