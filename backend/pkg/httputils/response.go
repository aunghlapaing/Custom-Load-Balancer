package httputils

import (
	"encoding/json"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// ErrorResponse represents a structured API error response
type ErrorResponse struct {
	Error       string            `json:"error"`
	Message     string            `json:"message"`
	StatusCode  int               `json:"statusCode"`
	Timestamp   time.Time         `json:"timestamp"`
	RequestID   string            `json:"requestId,omitempty"`
	Details     map[string]interface{} `json:"details,omitempty"`
	Suggestions []string          `json:"suggestions,omitempty"`
}

// SuccessResponse represents a structured API success response
type SuccessResponse struct {
	Data      interface{} `json:"data"`
	Message   string      `json:"message,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
	RequestID string      `json:"requestId,omitempty"`
}

// RespondJSON writes the given payload as JSON with the specified status code.
func RespondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload != nil {
		_ = json.NewEncoder(w).Encode(payload)
	}
}

// RespondError writes an error message as JSON with the specified status code.
func RespondError(w http.ResponseWriter, status int, err error) {
	errorResp := ErrorResponse{
		Error:      err.Error(),
		Message:    getErrorMessage(status),
		StatusCode: status,
		Timestamp:  time.Now(),
	}
	
	RespondJSON(w, status, errorResp)
}

// RespondDetailedError writes a detailed error response with additional context
func RespondDetailedError(w http.ResponseWriter, status int, err error, details map[string]interface{}, suggestions []string) {
	errorResp := ErrorResponse{
		Error:       err.Error(),
		Message:     getErrorMessage(status),
		StatusCode:  status,
		Timestamp:   time.Now(),
		Details:     details,
		Suggestions: suggestions,
	}
	
	RespondJSON(w, status, errorResp)
}

// RespondSuccess writes a successful response with structured format
func RespondSuccess(w http.ResponseWriter, data interface{}, message string) {
	successResp := SuccessResponse{
		Data:      data,
		Message:   message,
		Timestamp: time.Now(),
	}
	
	RespondJSON(w, http.StatusOK, successResp)
}

// RespondCreated writes a successful creation response
func RespondCreated(w http.ResponseWriter, data interface{}, message string) {
	successResp := SuccessResponse{
		Data:      data,
		Message:   message,
		Timestamp: time.Now(),
	}
	
	RespondJSON(w, http.StatusCreated, successResp)
}

// LogAndRespondError logs the error and sends a structured error response
func LogAndRespondError(w http.ResponseWriter, logger *zap.Logger, status int, err error, context string) {
	logger.Error(context,
		zap.Error(err),
		zap.Int("statusCode", status),
		zap.String("timestamp", time.Now().Format(time.RFC3339)),
	)
	
	RespondError(w, status, err)
}

// LogAndRespondDetailedError logs the error with details and sends a structured error response
func LogAndRespondDetailedError(w http.ResponseWriter, logger *zap.Logger, status int, err error, context string, details map[string]interface{}, suggestions []string) {
	logger.Error(context,
		zap.Error(err),
		zap.Int("statusCode", status),
		zap.Any("details", details),
		zap.Strings("suggestions", suggestions),
		zap.String("timestamp", time.Now().Format(time.RFC3339)),
	)
	
	RespondDetailedError(w, status, err, details, suggestions)
}

// getErrorMessage returns a human-readable message for common HTTP status codes
func getErrorMessage(status int) string {
	switch status {
	case http.StatusBadRequest:
		return "The request was invalid or malformed"
	case http.StatusUnauthorized:
		return "Authentication is required to access this resource"
	case http.StatusForbidden:
		return "You don't have permission to access this resource"
	case http.StatusNotFound:
		return "The requested resource was not found"
	case http.StatusMethodNotAllowed:
		return "The HTTP method is not allowed for this resource"
	case http.StatusConflict:
		return "The request conflicts with the current state of the resource"
	case http.StatusUnprocessableEntity:
		return "The request was well-formed but contains semantic errors"
	case http.StatusTooManyRequests:
		return "Too many requests have been made in a short period"
	case http.StatusInternalServerError:
		return "An internal server error occurred"
	case http.StatusBadGateway:
		return "The server received an invalid response from an upstream server"
	case http.StatusServiceUnavailable:
		return "The service is temporarily unavailable"
	case http.StatusGatewayTimeout:
		return "The server did not receive a timely response from an upstream server"
	default:
		return "An error occurred while processing the request"
	}
}
