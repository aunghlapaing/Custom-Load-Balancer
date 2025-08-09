package diagnostics

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"

	"go.uber.org/zap"
)

// DiagnosticInfo contains comprehensive system diagnostic information
type DiagnosticInfo struct {
	Timestamp     time.Time         `json:"timestamp"`
	System        SystemInfo        `json:"system"`
	Network       NetworkInfo       `json:"network"`
	Services      ServicesInfo      `json:"services"`
	Configuration ConfigurationInfo `json:"configuration"`
	Errors        []DiagnosticError `json:"errors,omitempty"`
	Suggestions   []string          `json:"suggestions,omitempty"`
}

// SystemInfo contains system-level diagnostic information
type SystemInfo struct {
	OS           string `json:"os"`
	Architecture string `json:"architecture"`
	GoVersion    string `json:"goVersion"`
	NumCPU       int    `json:"numCPU"`
	WorkingDir   string `json:"workingDir"`
}

// NetworkInfo contains network-related diagnostic information
type NetworkInfo struct {
	Ports []PortInfo `json:"ports"`
}

// PortInfo contains information about a specific port
type PortInfo struct {
	Port      int    `json:"port"`
	Available bool   `json:"available"`
	Service   string `json:"service"`
	Error     string `json:"error,omitempty"`
}

// ServicesInfo contains information about running services
type ServicesInfo struct {
	LoadBalancer ServiceStatus `json:"loadBalancer"`
	API          ServiceStatus `json:"api"`
}

// ServiceStatus contains status information for a service
type ServiceStatus struct {
	Running      bool          `json:"running"`
	Port         int           `json:"port"`
	URL          string        `json:"url"`
	LastChecked  time.Time     `json:"lastChecked"`
	ResponseTime time.Duration `json:"responseTime,omitempty"`
	Error        string        `json:"error,omitempty"`
}

// ConfigurationInfo contains configuration-related diagnostic information
type ConfigurationInfo struct {
	ConfigFile FileInfo   `json:"configFile"`
	BinaryFile FileInfo   `json:"binaryFile"`
	CertFiles  []FileInfo `json:"certFiles"`
}

// FileInfo contains information about a file
type FileInfo struct {
	Path     string `json:"path"`
	Exists   bool   `json:"exists"`
	Readable bool   `json:"readable"`
	Size     int64  `json:"size,omitempty"`
	Error    string `json:"error,omitempty"`
}

// DiagnosticError represents a diagnostic error with troubleshooting information
type DiagnosticError struct {
	Category  string   `json:"category"`
	Message   string   `json:"message"`
	Details   string   `json:"details,omitempty"`
	Solutions []string `json:"solutions,omitempty"`
	Severity  string   `json:"severity"` // "low", "medium", "high", "critical"
}

// Diagnostics provides comprehensive system diagnostics
type Diagnostics struct {
	logger *zap.Logger
}

// NewDiagnostics creates a new diagnostics instance
func NewDiagnostics(logger *zap.Logger) *Diagnostics {
	return &Diagnostics{
		logger: logger,
	}
}

// RunComprehensiveDiagnostics performs a complete system diagnostic check
func (d *Diagnostics) RunComprehensiveDiagnostics(configPath, binaryPath string, ports []int) *DiagnosticInfo {
	info := &DiagnosticInfo{
		Timestamp: time.Now(),
	}

	// Gather system information
	info.System = d.gatherSystemInfo()

	// Check network ports
	info.Network = d.checkNetworkPorts(ports)

	// Check services
	info.Services = d.checkServices(ports)

	// Check configuration
	info.Configuration = d.checkConfiguration(configPath, binaryPath)

	// Analyze issues and provide suggestions
	d.analyzeIssues(info)

	return info
}

// gatherSystemInfo collects basic system information
func (d *Diagnostics) gatherSystemInfo() SystemInfo {
	wd, _ := os.Getwd()

	return SystemInfo{
		OS:           runtime.GOOS,
		Architecture: runtime.GOARCH,
		GoVersion:    runtime.Version(),
		NumCPU:       runtime.NumCPU(),
		WorkingDir:   wd,
	}
}

// checkNetworkPorts checks the availability of required ports
func (d *Diagnostics) checkNetworkPorts(ports []int) NetworkInfo {
	var portInfos []PortInfo

	for _, port := range ports {
		info := PortInfo{
			Port: port,
		}

		// Try to listen on the port to check availability
		listener, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
		if err != nil {
			info.Available = false
			info.Error = err.Error()

			// Try to identify what's using the port
			if strings.Contains(err.Error(), "address already in use") {
				info.Service = d.identifyPortUser(port)
			}
		} else {
			info.Available = true
			listener.Close()
		}

		portInfos = append(portInfos, info)
	}

	return NetworkInfo{
		Ports: portInfos,
	}
}

// identifyPortUser attempts to identify what service is using a port
func (d *Diagnostics) identifyPortUser(port int) string {
	// This is a simplified implementation
	// In a real scenario, you might use system commands or libraries
	// to identify the process using the port
	switch port {
	case 8080:
		return "Likely LoadMaster Load Balancer or another web service"
	case 8081:
		return "Likely LoadMaster API Server or another web service"
	case 3000:
		return "Likely React development server or another Node.js service"
	default:
		return "Unknown service"
	}
}

// checkServices checks the status of LoadMaster services
func (d *Diagnostics) checkServices(ports []int) ServicesInfo {
	services := ServicesInfo{}

	// Check load balancer (typically on port 8080)
	if len(ports) > 0 {
		services.LoadBalancer = d.checkServiceStatus(ports[0], "")
	}

	// Check API server (typically on port 8081)
	if len(ports) > 1 {
		services.API = d.checkServiceStatus(ports[1], "/api/v1/ping")
	}

	return services
}

// checkServiceStatus checks if a service is running and responding
func (d *Diagnostics) checkServiceStatus(port int, path string) ServiceStatus {
	status := ServiceStatus{
		Port:        port,
		URL:         fmt.Sprintf("http://localhost:%d%s", port, path),
		LastChecked: time.Now(),
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	start := time.Now()
	resp, err := client.Get(status.URL)
	status.ResponseTime = time.Since(start)

	if err != nil {
		status.Running = false
		status.Error = err.Error()
		return status
	}
	defer resp.Body.Close()

	// Consider service running if we get any HTTP response
	status.Running = true

	// For API endpoints, we might want to check specific response codes
	if path != "" && resp.StatusCode >= 400 {
		status.Error = fmt.Sprintf("HTTP %d", resp.StatusCode)
	}

	return status
}

// checkConfiguration checks configuration files and binaries
func (d *Diagnostics) checkConfiguration(configPath, binaryPath string) ConfigurationInfo {
	config := ConfigurationInfo{
		ConfigFile: d.checkFile(configPath),
		BinaryFile: d.checkFile(binaryPath),
	}

	// Check common certificate paths
	certPaths := []string{
		"backend/certs/cert.pem",
		"backend/certs/key.pem",
		"certs/cert.pem",
		"certs/key.pem",
	}

	for _, path := range certPaths {
		config.CertFiles = append(config.CertFiles, d.checkFile(path))
	}

	return config
}

// checkFile checks if a file exists and is readable
func (d *Diagnostics) checkFile(path string) FileInfo {
	info := FileInfo{
		Path: path,
	}

	stat, err := os.Stat(path)
	if err != nil {
		info.Exists = false
		info.Error = err.Error()
		return info
	}

	info.Exists = true
	info.Size = stat.Size()

	// Check if file is readable
	file, err := os.Open(path)
	if err != nil {
		info.Readable = false
		info.Error = err.Error()
	} else {
		info.Readable = true
		file.Close()
	}

	return info
}

// analyzeIssues analyzes the diagnostic information and provides suggestions
func (d *Diagnostics) analyzeIssues(info *DiagnosticInfo) {
	var errors []DiagnosticError
	var suggestions []string

	// Check for port conflicts
	for _, port := range info.Network.Ports {
		if !port.Available {
			errors = append(errors, DiagnosticError{
				Category: "Network",
				Message:  fmt.Sprintf("Port %d is not available", port.Port),
				Details:  port.Error,
				Solutions: []string{
					fmt.Sprintf("Stop the service using port %d", port.Port),
					"Use a different port in configuration",
					fmt.Sprintf("Run: lsof -i :%d to identify the process", port.Port),
				},
				Severity: "high",
			})
		}
	}

	// Check for service issues
	if !info.Services.LoadBalancer.Running {
		errors = append(errors, DiagnosticError{
			Category: "Service",
			Message:  "Load Balancer service is not running",
			Details:  info.Services.LoadBalancer.Error,
			Solutions: []string{
				"Check if the binary exists and is executable",
				"Verify configuration file is valid",
				"Check logs for startup errors",
				"Ensure required ports are available",
			},
			Severity: "critical",
		})
	}

	if !info.Services.API.Running {
		errors = append(errors, DiagnosticError{
			Category: "Service",
			Message:  "API service is not running",
			Details:  info.Services.API.Error,
			Solutions: []string{
				"Check if the API server is configured to start",
				"Verify API port configuration",
				"Check authentication configuration",
				"Review startup logs for API-specific errors",
			},
			Severity: "critical",
		})
	}

	// Check for configuration issues
	if !info.Configuration.ConfigFile.Exists {
		errors = append(errors, DiagnosticError{
			Category: "Configuration",
			Message:  "Configuration file not found",
			Details:  info.Configuration.ConfigFile.Error,
			Solutions: []string{
				"Create a configuration file",
				"Check the configuration file path",
				"Use the default configuration template",
			},
			Severity: "high",
		})
	}

	if !info.Configuration.BinaryFile.Exists {
		errors = append(errors, DiagnosticError{
			Category: "Build",
			Message:  "Binary file not found",
			Details:  info.Configuration.BinaryFile.Error,
			Solutions: []string{
				"Build the application: make backend-build",
				"Check if Go is installed and configured",
				"Verify the build process completed successfully",
			},
			Severity: "critical",
		})
	} else if !info.Configuration.BinaryFile.Readable {
		errors = append(errors, DiagnosticError{
			Category: "Permissions",
			Message:  "Binary file is not executable",
			Details:  info.Configuration.BinaryFile.Error,
			Solutions: []string{
				"Make binary executable: chmod +x " + info.Configuration.BinaryFile.Path,
				"Check file permissions",
			},
			Severity: "medium",
		})
	}

	// Generate general suggestions
	if len(errors) == 0 {
		suggestions = append(suggestions, "System appears to be healthy")
	} else {
		suggestions = append(suggestions, "Address the errors listed above in order of severity")
		suggestions = append(suggestions, "Check application logs for additional details")
		suggestions = append(suggestions, "Ensure all dependencies are installed")
	}

	info.Errors = errors
	info.Suggestions = suggestions
}

// GenerateReport generates a human-readable diagnostic report
func (d *Diagnostics) GenerateReport(info *DiagnosticInfo) string {
	var report strings.Builder

	report.WriteString("LoadMaster Pro - Diagnostic Report\n")
	report.WriteString("==================================\n\n")
	report.WriteString(fmt.Sprintf("Generated: %s\n\n", info.Timestamp.Format(time.RFC3339)))

	// System Information
	report.WriteString("System Information:\n")
	report.WriteString(fmt.Sprintf("  OS: %s (%s)\n", info.System.OS, info.System.Architecture))
	report.WriteString(fmt.Sprintf("  Go Version: %s\n", info.System.GoVersion))
	report.WriteString(fmt.Sprintf("  CPUs: %d\n", info.System.NumCPU))
	report.WriteString(fmt.Sprintf("  Working Directory: %s\n\n", info.System.WorkingDir))

	// Network Status
	report.WriteString("Network Status:\n")
	for _, port := range info.Network.Ports {
		status := "✅ Available"
		if !port.Available {
			status = "❌ In Use"
		}
		report.WriteString(fmt.Sprintf("  Port %d: %s\n", port.Port, status))
		if port.Service != "" {
			report.WriteString(fmt.Sprintf("    Service: %s\n", port.Service))
		}
		if port.Error != "" {
			report.WriteString(fmt.Sprintf("    Error: %s\n", port.Error))
		}
	}
	report.WriteString("\n")

	// Service Status
	report.WriteString("Service Status:\n")
	lbStatus := "❌ Not Running"
	if info.Services.LoadBalancer.Running {
		lbStatus = "✅ Running"
	}
	report.WriteString(fmt.Sprintf("  Load Balancer: %s (Port %d)\n", lbStatus, info.Services.LoadBalancer.Port))
	if info.Services.LoadBalancer.Error != "" {
		report.WriteString(fmt.Sprintf("    Error: %s\n", info.Services.LoadBalancer.Error))
	}

	apiStatus := "❌ Not Running"
	if info.Services.API.Running {
		apiStatus = "✅ Running"
	}
	report.WriteString(fmt.Sprintf("  API Server: %s (Port %d)\n", apiStatus, info.Services.API.Port))
	if info.Services.API.Error != "" {
		report.WriteString(fmt.Sprintf("    Error: %s\n", info.Services.API.Error))
	}
	report.WriteString("\n")

	// Configuration Status
	report.WriteString("Configuration Status:\n")
	configStatus := "❌ Missing"
	if info.Configuration.ConfigFile.Exists {
		configStatus = "✅ Found"
	}
	report.WriteString(fmt.Sprintf("  Config File: %s (%s)\n", configStatus, info.Configuration.ConfigFile.Path))

	binaryStatus := "❌ Missing"
	if info.Configuration.BinaryFile.Exists {
		binaryStatus = "✅ Found"
	}
	report.WriteString(fmt.Sprintf("  Binary File: %s (%s)\n", binaryStatus, info.Configuration.BinaryFile.Path))
	report.WriteString("\n")

	// Errors and Issues
	if len(info.Errors) > 0 {
		report.WriteString("Issues Found:\n")
		for i, err := range info.Errors {
			report.WriteString(fmt.Sprintf("  %d. [%s] %s\n", i+1, strings.ToUpper(err.Severity), err.Message))
			if err.Details != "" {
				report.WriteString(fmt.Sprintf("     Details: %s\n", err.Details))
			}
			if len(err.Solutions) > 0 {
				report.WriteString("     Solutions:\n")
				for _, solution := range err.Solutions {
					report.WriteString(fmt.Sprintf("       - %s\n", solution))
				}
			}
			report.WriteString("\n")
		}
	}

	// Suggestions
	if len(info.Suggestions) > 0 {
		report.WriteString("Recommendations:\n")
		for i, suggestion := range info.Suggestions {
			report.WriteString(fmt.Sprintf("  %d. %s\n", i+1, suggestion))
		}
		report.WriteString("\n")
	}

	return report.String()
}

// SaveReportToFile saves the diagnostic report to a file
func (d *Diagnostics) SaveReportToFile(info *DiagnosticInfo, filename string) error {
	report := d.GenerateReport(info)
	return os.WriteFile(filename, []byte(report), 0644)
}

// SaveJSONToFile saves the diagnostic information as JSON
func (d *Diagnostics) SaveJSONToFile(info *DiagnosticInfo, filename string) error {
	data, err := json.MarshalIndent(info, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filename, data, 0644)
}
