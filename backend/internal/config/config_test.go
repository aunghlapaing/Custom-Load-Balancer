package config

import (
	"os"
	"testing"
)

const testYAML = `
loadBalancerPort: 8080
apiPort: 8081
apiKey: testkey
backendServers:
  - id: "server1"
    url: "http://localhost:9001"
    weight: 1
  - id: "server2"
    url: "http://localhost:9002"
    weight: 1
healthCheck:
  intervalSeconds: 5
  timeoutSeconds: 3
  path: "/health"
`

func TestLoadConfig(t *testing.T) {
	tmpfile, err := os.CreateTemp("", "config_test_*.yaml")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpfile.Name())

	if _, err := tmpfile.Write([]byte(testYAML)); err != nil {
		t.Fatalf("failed to write to temp file: %v", err)
	}
	tmpfile.Close()

	cfg, err := LoadConfig(tmpfile.Name())
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}
	if cfg.LoadBalancerPort != 8080 {
		t.Errorf("expected LoadBalancerPort 8080, got %d", cfg.LoadBalancerPort)
	}
	if len(cfg.BackendServers) != 2 {
		t.Errorf("expected 2 backend servers, got %d", len(cfg.BackendServers))
	}
	if cfg.HealthCheck.IntervalSeconds != 5 {
		t.Errorf("expected health check interval 5, got %d", cfg.HealthCheck.IntervalSeconds)
	}
	if cfg.APIKey != "testkey" {
		t.Errorf("expected APIKey 'testkey', got %q", cfg.APIKey)
	}
}
