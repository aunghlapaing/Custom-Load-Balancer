package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/aungh/GoLoadBalancerApplication/backend/internal/config"
	"github.com/aungh/GoLoadBalancerApplication/backend/pkg/logger"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.LoadConfig("../../configs/config.yaml")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading configuration: %v\n", err)
		os.Exit(1)
	}

	logger.InitLogger(true) // true for debug logging in dev
	defer logger.Sync()

	logger.Info("Starting Load Balancer service...", zap.Int("port", cfg.LoadBalancerPort))

	// Simple handler for now
	lbHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.Info("Received request", zap.String("method", r.Method), zap.String("path", r.URL.Path))
		fmt.Fprintln(w, "Load Balancer is Running!")
	})

	lbServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.LoadBalancerPort),
		Handler:      lbHandler,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		if err := lbServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("Load Balancer server failed", err)
		}
	}()

	logger.Info("Load Balancer service started successfully.")

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down Load Balancer service...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := lbServer.Shutdown(ctx); err != nil {
		logger.Error("Load Balancer server shutdown failed", err)
	}
	logger.Info("Load Balancer service gracefully stopped.")
}
