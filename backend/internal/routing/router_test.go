package routing

import (
	"net/http"
	"testing"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/loadbalancing"
)

type dummyPool struct{ id string }

func TestL7Router_Route(t *testing.T) {
	poolA := &loadbalancing.ServerPool{}
	poolB := &loadbalancing.ServerPool{}
	router := &L7Router{
		Pools: map[string]*loadbalancing.ServerPool{
			"A": poolA,
			"B": poolB,
		},
		Rules: []RoutingRule{
			{ID: "1", Host: "example.com", PathPrefix: "/api", Method: "GET", TargetPoolID: "A"},
			{ID: "2", PathPrefix: "/admin", TargetPoolID: "B"},
		},
	}

	tests := []struct {
		name   string
		host   string
		path   string
		method string
		want   *loadbalancing.ServerPool
	}{
		{"host+path+method match", "example.com", "/api/users", "GET", poolA},
		{"host mismatch", "other.com", "/api/users", "GET", nil},
		{"path mismatch", "example.com", "/other", "GET", nil},
		{"method mismatch", "example.com", "/api/users", "POST", nil},
		{"second rule path match", "any.com", "/admin/settings", "GET", poolB},
		{"no match", "any.com", "/foo", "GET", nil},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest(tc.method, "http://"+tc.host+tc.path, nil)
			got := router.Route(req)
			if got != tc.want {
				t.Errorf("expected %v, got %v", tc.want, got)
			}
		})
	}
}
