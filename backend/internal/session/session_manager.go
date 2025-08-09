package session

import (
	"net/http"
	"time"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/loadbalancing"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/model"
)

const stickyCookieName = "LB_STICKY_SERVER"

// SessionManager manages sticky sessions via cookies.
type SessionManager struct{}

func NewSessionManager() *SessionManager {
	return &SessionManager{}
}

// GetStickyServer returns the backend server for the sticky session if valid and healthy, else nil.
func (sm *SessionManager) GetStickyServer(req *http.Request, pool *loadbalancing.ServerPool) *model.BackendServer {
	cookie, err := req.Cookie(stickyCookieName)
	if err != nil || cookie.Value == "" {
		return nil
	}
	for _, server := range pool.GetHealthyServers() {
		if server.ID == cookie.Value {
			return server
		}
	}
	return nil
}

// SetStickyServer sets a cookie for the chosen backend server.
func (sm *SessionManager) SetStickyServer(w http.ResponseWriter, server *model.BackendServer) {
	http.SetCookie(w, &http.Cookie{
		Name:     stickyCookieName,
		Value:    server.ID,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(24 * time.Hour),
	})
}
