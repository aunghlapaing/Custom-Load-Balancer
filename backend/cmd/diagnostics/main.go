package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"go.uber.org/zap"

	"github.com/aungh/GoLoadBalancerApplication/backend/pkg/diagnostics"
)

func main() {
	var (
		configPath = flag.String("config", "backend/configs/config.yaml", "Path to configuration file")
		binaryPath = flag.String("binary", "bin/loadbalancer", "Path to loadbalancer binary")
		outputFile = flag.String("output", "", "Output file for diagnostic report (optional)")
		jsonOutput = flag.Bool("json", false, "Output diagnostic information as JSON")
		verbose    = flag.Bool("verbose", false, "Enable verbose logging")
	)
	flag.Parse()

	// Setup logger
	var logger *zap.Logger
	var err error
	if *verbose {
		logger, err = zap.NewDevelopment()
	} else {
		logger, err = zap.NewProduction()
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	// Create diagnostics instance
	diag := diagnostics.NewDiagnostics(logger)

	// Run comprehensive diagnostics
	ports := []int{8080, 8081} // LoadBalancer and API ports
	info := diag.RunComprehensiveDiagnostics(*configPath, *binaryPath, ports)

	// Output results
	if *jsonOutput {
		if *outputFile != "" {
			if err := diag.SaveJSONToFile(info, *outputFile); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to save JSON report: %v\n", err)
				os.Exit(1)
			}
			fmt.Printf("JSON diagnostic report saved to: %s\n", *outputFile)
		} else {
			// Print JSON to stdout
			data, err := json.MarshalIndent(info, "", "  ")
			if err != nil {
				fmt.Fprintf(os.Stderr, "Failed to marshal JSON: %v\n", err)
				os.Exit(1)
			}
			fmt.Println(string(data))
		}
	} else {
		// Generate human-readable report
		report := diag.GenerateReport(info)

		if *outputFile != "" {
			if err := diag.SaveReportToFile(info, *outputFile); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to save report: %v\n", err)
				os.Exit(1)
			}
			fmt.Printf("Diagnostic report saved to: %s\n", *outputFile)
		} else {
			fmt.Print(report)
		}
	}

	// Exit with error code if critical issues found
	criticalIssues := 0
	for _, err := range info.Errors {
		if err.Severity == "critical" {
			criticalIssues++
		}
	}

	if criticalIssues > 0 {
		fmt.Fprintf(os.Stderr, "\n  Found %d critical issue(s) that need immediate attention.\n", criticalIssues)
		os.Exit(1)
	}
}
