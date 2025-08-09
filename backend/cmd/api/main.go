package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/config"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/loadbalancing"
	"github.com/aungh/GoLoadBalancerApplication/backend/pkg/logger"
	httpapi "github.com/aungh/GoLoadBalancerApplication/backend/api/http"
	"github.com/aungh/GoLoadBalancerApplication/backend/internal/middleware"
)

func main() {
	configPath := os.Getenv("BACKEND_CONFIG_PATH")
	if configPath == "" {
		configPath = "/app/configs/config.yaml"
	}
	
	cfg, err := config.LoadConfig(configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading configuration: %v\n", err)
		os.Exit(1)
	}

	logger.InitLogger(true)
	defer logger.Sync()

	log := zap.L()
	log.Info("Starting standalone API service...", zap.Int("port", cfg.ApiPort))

	// Create a basic server pool for the API service
	roundRobinAlgo := &loadbalancing.RoundRobinAlgorithm{}
	serverPool := loadbalancing.NewServerPool(roundRobinAlgo)

	// API router setup
	apiRouter := mux.NewRouter()
	apiService := &httpapi.APIService{Pool: serverPool, Config: cfg, Logger: log}
	apiService.RegisterRoutes(apiRouter)
	authMiddleware := middleware.APIKeyAuthMiddleware(apiRouter, cfg.APIKey)

	log.Info("API service started successfully", zap.Int("port", cfg.ApiPort))
	log.Fatal("API server failed", zap.Error(http.ListenAndServe(fmt.Sprintf(":%d", cfg.ApiPort), authMiddleware)))
}
