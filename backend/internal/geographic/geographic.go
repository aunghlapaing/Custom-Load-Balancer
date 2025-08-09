package geographic

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
)

// GeographicData represents geographic information for an IP address
type GeographicData struct {
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	Region      string  `json:"region"`
	City        string  `json:"city"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	ISP         string  `json:"isp"`
	Timezone    string  `json:"timezone"`
}

// CountryStats represents request statistics for a country
type CountryStats struct {
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	Requests    uint64  `json:"requests"`
	LastSeen    int64   `json:"lastSeen"`
	Percentage  float64 `json:"percentage"`
}

// GeographicTracker handles IP geolocation and statistics
type GeographicTracker struct {
	cache      map[string]*GeographicData
	stats      map[string]*CountryStats
	cacheMutex sync.RWMutex
	statsMutex sync.RWMutex
	logger     *zap.Logger
	httpClient *http.Client
}

// NewGeographicTracker creates a new geographic tracker
func NewGeographicTracker(logger *zap.Logger) *GeographicTracker {
	return &GeographicTracker{
		cache:  make(map[string]*GeographicData),
		stats:  make(map[string]*CountryStats),
		logger: logger,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// ExtractClientIP extracts the real client IP from HTTP request headers
func ExtractClientIP(r *http.Request) string {
	// Check headers in order of reliability
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		if ips := strings.Split(ip, ","); len(ips) > 0 {
			clientIP := strings.TrimSpace(ips[0])
			if clientIP != "" && !isPrivateIP(clientIP) {
				return clientIP
			}
		}
	}

	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		if !isPrivateIP(ip) {
			return ip
		}
	}

	if ip := r.Header.Get("CF-Connecting-IP"); ip != "" {
		if !isPrivateIP(ip) {
			return ip
		}
	}

	if ip := r.Header.Get("X-Client-IP"); ip != "" {
		if !isPrivateIP(ip) {
			return ip
		}
	}

	// Fallback to RemoteAddr
	if ip, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		if !isPrivateIP(ip) {
			return ip
		}
	}

	// Return RemoteAddr as-is if all else fails
	return r.RemoteAddr
}

// isPrivateIP checks if an IP address is private/local or a test IP
func isPrivateIP(ip string) bool {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return true // Invalid IP, treat as private
	}

	// Check for private IP ranges and RFC test ranges
	privateRanges := []string{
		"10.0.0.0/8",      // Private
		"172.16.0.0/12",   // Private
		"192.168.0.0/16",  // Private
		"127.0.0.0/8",     // Loopback
		"169.254.0.0/16",  // Link-local
		"::1/128",         // IPv6 loopback
		"fc00::/7",        // IPv6 private
		"fe80::/10",       // IPv6 link-local
		"192.0.2.0/24",    // RFC 5737 TEST-NET-1
		"198.51.100.0/24", // RFC 5737 TEST-NET-2
		"203.0.113.0/24",  // RFC 5737 TEST-NET-3
	}

	for _, cidr := range privateRanges {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			continue
		}
		if network.Contains(parsedIP) {
			return true
		}
	}

	return false
}

// GetGeographicData gets geographic data for an IP address with caching
func (gt *GeographicTracker) GetGeographicData(ip string) *GeographicData {
	// Skip private/local IPs
	if isPrivateIP(ip) {
		return &GeographicData{
			Country:     "Local Network",
			CountryCode: "LN",
			Region:      "Private",
			City:        "Localhost",
			Latitude:    0.0,
			Longitude:   0.0,
			ISP:         "Local",
			Timezone:    "UTC",
		}
	}

	// Check cache first
	gt.cacheMutex.RLock()
	if cached, exists := gt.cache[ip]; exists {
		gt.cacheMutex.RUnlock()
		return cached
	}
	gt.cacheMutex.RUnlock()

	// Fetch from API
	geoData := gt.fetchGeographicData(ip)
	if geoData != nil {
		// Cache the result
		gt.cacheMutex.Lock()
		gt.cache[ip] = geoData
		gt.cacheMutex.Unlock()
	}

	return geoData
}

// fetchGeographicData fetches geographic data from ip-api.com
func (gt *GeographicTracker) fetchGeographicData(ip string) *GeographicData {
	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp", ip)

	resp, err := gt.httpClient.Get(url)
	if err != nil {
		gt.logger.Error("Failed to fetch geographic data", zap.String("ip", ip), zap.Error(err))
		return nil
	}
	defer resp.Body.Close()

	var result struct {
		Status      string  `json:"status"`
		Message     string  `json:"message"`
		Country     string  `json:"country"`
		CountryCode string  `json:"countryCode"`
		Region      string  `json:"region"`
		RegionName  string  `json:"regionName"`
		City        string  `json:"city"`
		Lat         float64 `json:"lat"`
		Lon         float64 `json:"lon"`
		Timezone    string  `json:"timezone"`
		ISP         string  `json:"isp"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		gt.logger.Error("Failed to decode geographic data", zap.String("ip", ip), zap.Error(err))
		return nil
	}

	if result.Status != "success" {
		gt.logger.Warn("Geographic lookup failed", zap.String("ip", ip), zap.String("message", result.Message))
		return nil
	}

	geoData := &GeographicData{
		Country:     result.Country,
		CountryCode: result.CountryCode,
		Region:      result.RegionName,
		City:        result.City,
		Latitude:    result.Lat,
		Longitude:   result.Lon,
		ISP:         result.ISP,
		Timezone:    result.Timezone,
	}

	gt.logger.Debug("Geographic data fetched",
		zap.String("ip", ip),
		zap.String("country", geoData.Country),
		zap.String("city", geoData.City))

	return geoData
}

// TrackRequest tracks a request from a specific IP address
func (gt *GeographicTracker) TrackRequest(ip string) {
	geoData := gt.GetGeographicData(ip)
	if geoData == nil {
		return
	}

	gt.statsMutex.Lock()
	defer gt.statsMutex.Unlock()

	if stats, exists := gt.stats[geoData.Country]; exists {
		stats.Requests++
		stats.LastSeen = time.Now().Unix()
	} else {
		gt.stats[geoData.Country] = &CountryStats{
			Country:     geoData.Country,
			CountryCode: geoData.CountryCode,
			Requests:    1,
			LastSeen:    time.Now().Unix(),
			Percentage:  0, // Will be calculated when getting stats
		}
	}
}

// GetGeographicStats returns current geographic statistics
func (gt *GeographicTracker) GetGeographicStats() []*CountryStats {
	gt.statsMutex.RLock()
	defer gt.statsMutex.RUnlock()

	// Calculate total requests
	var totalRequests uint64
	for _, stats := range gt.stats {
		totalRequests += stats.Requests
	}

	// Create result slice and calculate percentages
	result := make([]*CountryStats, 0, len(gt.stats))
	for _, stats := range gt.stats {
		statsCopy := &CountryStats{
			Country:     stats.Country,
			CountryCode: stats.CountryCode,
			Requests:    stats.Requests,
			LastSeen:    stats.LastSeen,
			Percentage:  0,
		}

		if totalRequests > 0 {
			statsCopy.Percentage = float64(stats.Requests) / float64(totalRequests) * 100
		}

		result = append(result, statsCopy)
	}

	// Sort by request count (descending)
	for i := 0; i < len(result)-1; i++ {
		for j := i + 1; j < len(result); j++ {
			if result[i].Requests < result[j].Requests {
				result[i], result[j] = result[j], result[i]
			}
		}
	}

	return result
}

// GetCacheSize returns the current cache size
func (gt *GeographicTracker) GetCacheSize() int {
	gt.cacheMutex.RLock()
	defer gt.cacheMutex.RUnlock()
	return len(gt.cache)
}

// ClearOldCache clears cache entries older than the specified duration
func (gt *GeographicTracker) ClearOldCache(maxAge time.Duration) {
	// For now, don't track cache timestamps, so this is a placeholder
	// In a production system, want to track when each entry was cached
	gt.logger.Info("Cache cleanup requested", zap.Duration("maxAge", maxAge))
}
