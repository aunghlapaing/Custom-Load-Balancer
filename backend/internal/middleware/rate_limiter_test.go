package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"golang.org/x/time/rate"
)

func TestRateLimitMiddleware(t *testing.T) {
	limiter := rate.NewLimiter(2, 2) // 2 requests per second, burst 2
	middleware := RateLimitMiddleware(http.HandlerFunc(dummyHandler), limiter)

	// First two requests should pass
	for i := 0; i < 2; i++ {
		rw := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/", nil)
		middleware.ServeHTTP(rw, req)
		if rw.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rw.Code)
		}
	}

	// Third request should be rate limited
	rw := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)
	middleware.ServeHTTP(rw, req)
	if rw.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429 Too Many Requests, got %d", rw.Code)
	}
}
