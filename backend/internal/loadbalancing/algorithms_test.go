package loadbalancing

import (
	"net/http"
	"net/url"
	"strconv"
	"testing"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/model"
)

func makeBackends(n int) []*model.BackendServer {
	backends := make([]*model.BackendServer, n)
	for i := 0; i < n; i++ {
		u, _ := url.Parse("http://localhost:" + strconv.Itoa(9001+i))
		backends[i] = &model.BackendServer{
			ID:           string(rune('A' + i)),
			URL:          u,
			Weight:       1,
			HealthStatus: model.HEALTHY,
		}
	}
	return backends
}

func TestRoundRobinAlgorithm_Select(t *testing.T) {
	algo := &RoundRobinAlgorithm{}
	req := &http.Request{}
	backends := makeBackends(3)

	// Should cycle through 0, 1, 2, 0, 1, 2 ...
	for i := 0; i < 6; i++ {
		backend := algo.Select(backends, req, uint64(i))
		expectedID := string(rune('A' + (i % 3)))
		if backend == nil || backend.ID != expectedID {
			t.Errorf("expected backend %s, got %v", expectedID, backend)
		}
	}

	// Should return nil if no backends
	if algo.Select([]*model.BackendServer{}, req, 0) != nil {
		t.Error("expected nil when no backends")
	}
}
