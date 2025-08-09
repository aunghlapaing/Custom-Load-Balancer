package middleware

import (
	"net/http"

	"golang.org/x/time/rate"
)

// RateLimitMiddleware applies a rate limiter to the handler.
func RateLimitMiddleware(next http.Handler, limiter *rate.Limiter) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !limiter.Allow() {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
