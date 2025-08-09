#!/bin/bash

# Production deployment script for Load Balancer Dashboard
# Usage: ./scripts/deploy.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-production}
BUILD_DIR="dist"
BACKUP_DIR="/var/backups/frontend"
LOG_FILE="/var/log/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! printf '%s\n%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V -C; then
        error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION+"
    fi
    
    log "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        npm ci --only=production
    else
        npm ci
    fi
    
    log "Dependencies installed successfully"
}

# Run tests
run_tests() {
    if [ "$ENVIRONMENT" != "production" ]; then
        log "Running tests..."
        
        # Run unit tests
        npm run test:ci || error "Unit tests failed"
        
        # Run accessibility tests
        npm run test:a11y || error "Accessibility tests failed"
        
        # Run linting
        npm run lint || error "Linting failed"
        
        log "All tests passed"
    else
        log "Skipping tests in production mode"
    fi
}

# Build application
build_application() {
    log "Building application for $ENVIRONMENT..."
    
    # Set environment variables
    export NODE_ENV=$ENVIRONMENT
    export VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    export VITE_BUILD_VERSION=$(npm pkg get version | tr -d '"')
    
    # Build the application
    npm run build || error "Build failed"
    
    # Verify build output
    if [ ! -d "$BUILD_DIR" ]; then
        error "Build directory $BUILD_DIR not found"
    fi
    
    if [ ! -f "$BUILD_DIR/index.html" ]; then
        error "index.html not found in build directory"
    fi
    
    log "Application built successfully"
}

# Create backup
create_backup() {
    if [ -d "/var/www/html" ] && [ "$ENVIRONMENT" = "production" ]; then
        log "Creating backup..."
        
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        cp -r /var/www/html "$BACKUP_DIR/$BACKUP_NAME" || warn "Backup creation failed"
        
        # Keep only last 5 backups
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -rf
        
        log "Backup created: $BACKUP_NAME"
    fi
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    case $ENVIRONMENT in
        "production")
            deploy_to_production
            ;;
        "staging")
            deploy_to_staging
            ;;
        "development")
            deploy_to_development
            ;;
        *)
            error "Unknown environment: $ENVIRONMENT"
            ;;
    esac
    
    log "Application deployed successfully"
}

# Deploy to production
deploy_to_production() {
    log "Deploying to production environment..."
    
    # Stop services
    sudo systemctl stop nginx || warn "Failed to stop nginx"
    
    # Deploy files
    sudo rm -rf /var/www/html/*
    sudo cp -r "$BUILD_DIR"/* /var/www/html/
    
    # Set permissions
    sudo chown -R www-data:www-data /var/www/html
    sudo chmod -R 755 /var/www/html
    
    # Start services
    sudo systemctl start nginx || error "Failed to start nginx"
    
    # Verify deployment
    sleep 5
    if ! curl -f http://localhost/health > /dev/null 2>&1; then
        error "Health check failed after deployment"
    fi
}

# Deploy to staging
deploy_to_staging() {
    log "Deploying to staging environment..."
    
    # Deploy to staging directory
    STAGING_DIR="/var/www/staging"
    sudo mkdir -p "$STAGING_DIR"
    sudo rm -rf "$STAGING_DIR"/*
    sudo cp -r "$BUILD_DIR"/* "$STAGING_DIR"/
    
    # Set permissions
    sudo chown -R www-data:www-data "$STAGING_DIR"
    sudo chmod -R 755 "$STAGING_DIR"
    
    log "Deployed to staging: http://staging.yourdomain.com"
}

# Deploy to development
deploy_to_development() {
    log "Starting development server..."
    npm run preview
}

# Run smoke tests
run_smoke_tests() {
    if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
        log "Running smoke tests..."
        
        # Test main page
        if ! curl -f http://localhost/ > /dev/null 2>&1; then
            error "Main page is not accessible"
        fi
        
        # Test health endpoint
        if ! curl -f http://localhost/health > /dev/null 2>&1; then
            error "Health endpoint is not accessible"
        fi
        
        # Test API connectivity (if applicable)
        if [ -n "$API_URL" ]; then
            if ! curl -f "$API_URL/health" > /dev/null 2>&1; then
                warn "API health check failed"
            fi
        fi
        
        log "Smoke tests passed"
    fi
}

# Send notifications
send_notifications() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Sending deployment notifications..."
        
        # Slack notification (if webhook is configured)
        if [ -n "$SLACK_WEBHOOK_URL" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"🚀 Frontend deployed to production successfully!\"}" \
                "$SLACK_WEBHOOK_URL" || warn "Failed to send Slack notification"
        fi
        
        # Email notification (if configured)
        if [ -n "$NOTIFICATION_EMAIL" ]; then
            echo "Frontend deployment completed successfully at $(date)" | \
                mail -s "Deployment Notification" "$NOTIFICATION_EMAIL" || \
                warn "Failed to send email notification"
        fi
    fi
}

# Cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove temporary files
    rm -rf .tmp
    
    # Clear npm cache if needed
    if [ "$ENVIRONMENT" = "production" ]; then
        npm cache clean --force
    fi
    
    log "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting deployment to $ENVIRONMENT environment..."
    
    # Trap errors and cleanup
    trap cleanup EXIT
    
    check_prerequisites
    install_dependencies
    run_tests
    build_application
    create_backup
    deploy_application
    run_smoke_tests
    send_notifications
    
    log "Deployment completed successfully! 🎉"
    
    # Display deployment info
    echo ""
    echo "=== Deployment Summary ==="
    echo "Environment: $ENVIRONMENT"
    echo "Build Time: $(date)"
    echo "Version: $(npm pkg get version | tr -d '"')"
    echo "=========================="
}

# Handle script arguments
case "${1:-}" in
    "production"|"staging"|"development")
        main
        ;;
    "--help"|"-h")
        echo "Usage: $0 [environment]"
        echo ""
        echo "Environments:"
        echo "  production  - Deploy to production server"
        echo "  staging     - Deploy to staging server"
        echo "  development - Start development server"
        echo ""
        echo "Options:"
        echo "  --help, -h  - Show this help message"
        exit 0
        ;;
    *)
        echo "Invalid environment: ${1:-}"
        echo "Use --help for usage information"
        exit 1
        ;;
esac