package integration

import (
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/aungh/GoLoadBalancerApplication/backend/test/testutil"
)

func TestLoadBalancer_RoundRobinAndHealthCheck(t *testing.T) {
	// Start two dummy backend servers
	stop1 := testutil.StartDummyServer(9001, "backend1")
	stop2 := testutil.StartDummyServer(9002, "backend2")
	defer stop1()
	defer stop2()

	// Write a temporary config.yaml pointing to these servers
	configContent := `loadBalancerPort: 8080
apiPort: 8081
backendServers:
  - id: "server1"
    url: "http://localhost:9001"
    weight: 1
  - id: "server2"
    url: "http://localhost:9002"
    weight: 1
healthCheck:
  intervalSeconds: 1
  timeoutSeconds: 1
  path: "/"
`
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.yaml")
	if err := ioutil.WriteFile(configPath, []byte(configContent), 0644); err != nil {
		t.Fatalf("failed to write temp config: %v", err)
	}

	// Start the load balancer as a subprocess
	mainPath, _ := filepath.Abs("../../../backend/cmd/loadbalancer/main.go")
	cmd := exec.Command("go", "run", mainPath)
	cmd.Env = append(os.Environ(), "BACKEND_CONFIG_PATH="+configPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		t.Fatalf("failed to start load balancer: %v", err)
	}
	defer func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	}()

	// Wait for LB to start
	time.Sleep(2 * time.Second)

	// Send 6 requests, expect both backends to be used
	results := make([]string, 0, 6)
	for i := 0; i < 6; i++ {
		resp, err := http.Get("http://localhost:8080/")
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		body, _ := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		results = append(results, string(body))
	}
	// Should see both backend1 and backend2 in the results, and counts should be roughly equal
	count1, count2 := 0, 0
	for _, r := range results {
		if strings.Contains(r, "backend1") {
			count1++
		} else if strings.Contains(r, "backend2") {
			count2++
		}
	}
	if count1 == 0 || count2 == 0 {
		t.Errorf("expected both backends to be used, got backend1: %d, backend2: %d", count1, count2)
	}
	if abs(count1-count2) > 2 {
		t.Errorf("expected balanced distribution, got backend1: %d, backend2: %d", count1, count2)
	}

	// Stop backend2, wait for health check to mark it unhealthy
	stop2()
	time.Sleep(2 * time.Second)

	// Send 3 more requests, should only get backend1
	for i := 0; i < 3; i++ {
		resp, err := http.Get("http://localhost:8080/")
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		body, _ := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		if !strings.Contains(string(body), "backend1") {
			t.Errorf("expected backend1, got %s", string(body))
		}
	}

	// Restart backend2, wait for health check to mark it healthy
	stop2 = testutil.StartDummyServer(9002, "backend2")
	defer stop2()
	time.Sleep(2 * time.Second)

	// Send 4 more requests, should see both backends again
	results = results[:0]
	for i := 0; i < 4; i++ {
		resp, err := http.Get("http://localhost:8080/")
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		body, _ := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		results = append(results, string(body))
	}
	count1, count2 = 0, 0
	for _, r := range results {
		if strings.Contains(r, "backend1") {
			count1++
		} else if strings.Contains(r, "backend2") {
			count2++
		}
	}
	if count1 == 0 || count2 == 0 {
		t.Errorf("expected both backends to be used after recovery, got backend1: %d, backend2: %d", count1, count2)
	}
	if abs(count1-count2) > 2 {
		t.Errorf("expected balanced distribution after recovery, got backend1: %d, backend2: %d", count1, count2)
	}
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
