package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type BackendServerConfig struct {
	ID     string `yaml:"id"`
	URL    string `yaml:"url"`
	Weight int    `yaml:"weight,omitempty"`
	// Add health check specific configs here later
}

type HealthCheckConfig struct {
	IntervalSeconds int    `yaml:"intervalSeconds"`
	TimeoutSeconds  int    `yaml:"timeoutSeconds"`
	Path            string `yaml:"path,omitempty"` // For HTTP checks
}

type Config struct {
	LoadBalancerPort int                   `yaml:"loadBalancerPort"`
	ApiPort          int                   `yaml:"apiPort"`
	BackendServers   []BackendServerConfig `yaml:"backendServers"`
	HealthCheck      HealthCheckConfig     `yaml:"healthCheck"`
	// Add other config fields as you implement features (e.g., algorithms, SSL, rate limits)
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}
	return &cfg, nil
}
