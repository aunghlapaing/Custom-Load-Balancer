package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/config"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/core"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/healthchecks"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/loadbalancing"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/model"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/server"
	"github.com/aungh/GoLoadBalancerApplication/backend/pkg/logger"
	"github.com/gorilla/mux"
	"golang.org/x/time/rate"

	httpapi "github.com/aungh/GoLoadBalancerApplication/backend/api/http"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/middleware"
)

func main() {
	configPath := os.Getenv("BACKEND_CONFIG_PATH")
	if configPath == "" {
		configPath = "backend/configs/config.yaml"
	}
	cfg, err := config.LoadConfig(configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading configuration: %v\n", err)
		os.Exit(1)
	}

	logger.InitLogger(true) // true for debug logging in dev
	defer logger.Sync()

	log := zap.L()
	log.Info("Starting Load Balancer service...", zap.Int("port", cfg.LoadBalancerPort))

	// 1. Initialize Load Balancing Components
	// Create algorithm based on config
	var algorithm loadbalancing.LoadBalancingAlgorithm
	switch cfg.LoadBalancingAlgorithm {
	case "leastconnections":
		algorithm = &loadbalancing.LeastConnectionsAlgorithm{}
	case "iphash":
		algorithm = &loadbalancing.IPHashAlgorithm{}
	case "weighted":
		algorithm = loadbalancing.NewWeightedRoundRobinAlgorithm()
	case "weightedrandom":
		algorithm = &loadbalancing.WeightedAlgorithm{}
	default:
		algorithm = &loadbalancing.RoundRobinAlgorithm{}
	}

	log.Info("Initialized load balancing algorithm", zap.String("algorithm", cfg.LoadBalancingAlgorithm))
	serverPool := loadbalancing.NewServerPoolWithLogger(algorithm, log)

	// Populate server pool from config
	for _, sCfg := range cfg.BackendServers {
		server, err := model.NewBackendServer(sCfg.ID, sCfg.URL, sCfg.Weight)
		if err != nil {
			log.Error("Failed to parse backend server URL", zap.Error(err), zap.String("url", sCfg.URL))
			continue
		}
		serverPool.AddServer(server)
		log.Info("Added backend server to pool", zap.String("id", server.ID), zap.String("url", server.URL.String()))
	}

	// 2. Start Health Checks
	healthchecks.StartHealthChecks(serverPool, cfg.HealthCheck, log)

	// 3. Create core Load Balancer handler
	lbHandler := core.NewLoadBalancer(serverPool, log)

	// API router setup
	apiRouter := mux.NewRouter()
	apiService := &httpapi.APIService{Pool: serverPool, Config: cfg, Logger: log}
	apiService.RegisterRoutes(apiRouter)
	authMiddleware := middleware.APIKeyAuthMiddleware(apiRouter, cfg.APIKey)

	// 4. Set up HTTP server for load balancing
	limiter := rate.NewLimiter(10, 20) // 10 req/sec, burst 20
	lbServer := &http.Server{
		Addr: fmt.Sprintf(":%d", cfg.LoadBalancerPort),
		Handler: middleware.RateLimitMiddleware(
			lbHandler,
			limiter,
		),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// 4.1. Set up HTTP server for management API
	apiServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.ApiPort),
		Handler:      authMiddleware,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// 5. Initialize ServerManager
	serverManager := server.NewServerManager(cfg, log)
	serverManager.SetServers(lbServer, apiServer)

	log.Info("Starting servers",
		zap.Int("lbPort", cfg.LoadBalancerPort),
		zap.Int("apiPort", cfg.ApiPort))

	if err := serverManager.StartServers(); err != nil {
		log.Error("Failed to start servers", zap.Error(err))
		fmt.Fprintf(os.Stderr, "Server startup failed: %v\n", err)
		os.Exit(1)
	}

	log.Info("Load Balancer service started successfully",
		zap.Int("lbPort", cfg.LoadBalancerPort),
		zap.Int("apiPort", cfg.ApiPort))

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("Shutting down Load Balancer service...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := serverManager.Shutdown(ctx); err != nil {
		log.Error("Server shutdown failed", zap.Error(err))
	} else {
		log.Info("Load Balancer service gracefully stopped.")
	}
}
