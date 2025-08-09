package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func dummyHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

func TestAPIKeyAuthMiddleware(t *testing.T) {
	const validKey = "test-api-key"
	middleware := APIKeyAuthMiddleware(http.HandlerFunc(dummyHandler), validKey)

	tests := []struct {
		name           string
		header         string
		expectedStatus int
		expectedBody   string
	}{
		{"missing header", "", http.StatusUnauthorized, "authorization header required"},
		{"invalid format", "Basic abc", http.StatusUnauthorized, "invalid authorization header format"},
		{"wrong key", "Bearer wrong-key", http.StatusUnauthorized, "invalid API key"},
		{"valid key", "Bearer test-api-key", http.StatusOK, "ok"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			rw := httptest.NewRecorder()
			middleware.ServeHTTP(rw, req)
			if rw.Code != tc.expectedStatus {
				t.Errorf("expected status %d, got %d", tc.expectedStatus, rw.Code)
			}
			if !strings.Contains(rw.Body.String(), tc.expectedBody) {
				t.Errorf("expected body to contain %q, got %q", tc.expectedBody, rw.Body.String())
			}
		})
	}
}
