package healthchecks

import (
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/model"
)

func TestHTTPHealthChecker_OK(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	checker := NewHTTPHealthChecker(1*time.Second, "")
	server := &model.BackendServer{}
	server.URL = mustParseURL(ts.URL)

	if err := checker.Check(server); err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestHTTPHealthChecker_NotOK(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer ts.Close()

	checker := NewHTTPHealthChecker(1*time.Second, "")
	server := &model.BackendServer{}
	server.URL = mustParseURL(ts.URL)

	if err := checker.Check(server); err == nil {
		t.Error("expected error for non-200 status")
	}
}

func TestTCPHealthChecker_OK(t *testing.T) {
	ln, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}
	defer ln.Close()

	go func() {
		conn, _ := ln.Accept()
		if conn != nil {
			conn.Close()
		}
	}()

	checker := NewTCPHealthChecker(1 * time.Second)
	server := &model.BackendServer{}
	server.URL = mustParseURL("tcp://" + ln.Addr().String())

	if err := checker.Check(server); err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestTCPHealthChecker_Fail(t *testing.T) {
	checker := NewTCPHealthChecker(1 * time.Second)
	server := &model.BackendServer{}
	server.URL = mustParseURL("tcp://127.0.0.1:65534") // unlikely to be open

	if err := checker.Check(server); err == nil {
		t.Error("expected error for closed port")
	}
}

func mustParseURL(raw string) *url.URL {
	u, err := url.Parse(raw)
	if err != nil {
		panic(err)
	}
	return u
}
