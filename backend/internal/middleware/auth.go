package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/aungh/GoLoadBalancerApplication/backend/pkg/httputils"
)

// APIKeyAuthMiddleware provides API key authentication for handlers.
func APIKeyAuthMiddleware(next http.Handler, validAPIKey string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for OPTIONS requests (CORS preflight)
		if r.Method == "OPTIONS" {
			next.ServeHTTP(w, r)
			return
		}
		
		// Skip auth for public endpoints
		publicEndpoints := []string{
			"/metrics",
			"/api/v1/ping",
			"/api/v1/health",
			"/api/v1/metrics",
			"/api/v1/diagnostics",
		}
		
		for _, endpoint := range publicEndpoints {
			if r.URL.Path == endpoint {
				next.ServeHTTP(w, r)
				return
			}
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			httputils.RespondError(w, http.StatusUnauthorized, fmt.Errorf("authorization header required"))
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			httputils.RespondError(w, http.StatusUnauthorized, fmt.Errorf("invalid authorization header format"))
			return
		}

		if parts[1] != validAPIKey {
			httputils.RespondError(w, http.StatusUnauthorized, fmt.Errorf("invalid API key"))
			return
		}
		next.ServeHTTP(w, r)
	})
}
