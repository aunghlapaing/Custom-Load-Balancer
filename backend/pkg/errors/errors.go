package errors

import (
	"fmt"
	"net/http"
)

// APIError represents an API error with status code and message
type APIError struct {
	StatusCode int    `json:"statusCode"`
	Message    string `json:"message"`
	Details    string `json:"details,omitempty"`
}

func (e *APIError) Error() string {
	return e.Message
}

// NewAPIError creates a new API error
func NewAPIError(statusCode int, message string, details ...string) *APIError {
	err := &APIError{
		StatusCode: statusCode,
		Message:    message,
	}
	if len(details) > 0 {
		err.Details = details[0]
	}
	return err
}

// Common error constructors
func BadRequest(message string, details ...string) *APIError {
	return NewAPIError(http.StatusBadRequest, message, details...)
}

func NotFound(resource string) *APIError {
	return NewAPIError(http.StatusNotFound, fmt.Sprintf("%s not found", resource))
}

func InternalServerError(message string, details ...string) *APIError {
	return NewAPIError(http.StatusInternalServerError, message, details...)
}

func Unauthorized(message string) *APIError {
	return NewAPIError(http.StatusUnauthorized, message)
}

func Forbidden(message string) *APIError {
	return NewAPIError(http.StatusForbidden, message)
}