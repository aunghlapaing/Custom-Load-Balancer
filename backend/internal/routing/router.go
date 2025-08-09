package routing

import (
	"net/http"
	"strings"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/loadbalancing"
)

type RoutingRule struct {
	ID           string
	Host         string
	PathPrefix   string
	Method       string
	TargetPoolID string
}

type L7Router struct {
	Pools map[string]*loadbalancing.ServerPool
	Rules []RoutingRule
}

func NewL7Router() *L7Router {
	return &L7Router{
		Pools: make(map[string]*loadbalancing.ServerPool),
		Rules: []RoutingRule{},
	}
}

// Route returns the ServerPool for the first matching rule, or nil if none match.
func (r *L7Router) Route(req *http.Request) *loadbalancing.ServerPool {
	for _, rule := range r.Rules {
		if rule.Host != "" && !strings.EqualFold(req.Host, rule.Host) {
			continue
		}
		if rule.PathPrefix != "" && !strings.HasPrefix(req.URL.Path, rule.PathPrefix) {
			continue
		}
		if rule.Method != "" && req.Method != rule.Method {
			continue
		}
		pool, ok := r.Pools[rule.TargetPoolID]
		if ok {
			return pool
		}
	}
	return nil
}
