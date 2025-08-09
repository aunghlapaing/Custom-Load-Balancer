import { useCallback, useState } from 'react'

// Generate unique error ID
const generateErrorId = () => `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

/**
 * Hook for handling errors in functional components
 * Provides error state management and reporting capabilities
 */
export const useErrorHandler = (options = {}) => {
  const [error, setError] = useState(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRetry,
    autoRetry = false
  } = options

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
    setIsRetrying(false)
  }, [])

  // Handle error with optional retry logic
  const handleError = useCallback(async (error, context = {}) => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      retryCount,
      errorId: generateErrorId()
    }

    setError(errorInfo)

    // Report error
    if (onError) {
      onError(errorInfo)
    }

    // Log error
    console.error('Error handled by useErrorHandler:', error, context)

    // Auto retry logic
    if (autoRetry && retryCount < maxRetries) {
      setIsRetrying(true)
      setTimeout(() => {
        setRetryCount(prev => prev + 1)
        setIsRetrying(false)
        if (onRetry) {
          onRetry(retryCount + 1)
        }
      }, retryDelay)
    }
  }, [retryCount, maxRetries, retryDelay, onError, onRetry, autoRetry])

  // Manual retry function
  const retry = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1)
      setError(null)
      setIsRetrying(true)
      
      setTimeout(() => {
        setIsRetrying(false)
        if (onRetry) {
          onRetry(retryCount + 1)
        }
      }, retryDelay)
    }
  }, [retryCount, maxRetries, retryDelay, onRetry])

  // Reset retry count
  const resetRetries = useCallback(() => {
    setRetryCount(0)
  }, [])

  return {
    error,
    isRetrying,
    retryCount,
    canRetry: retryCount < maxRetries,
    handleError,
    clearError,
    retry,
    resetRetries
  }
}

/**
 * Hook for wrapping async operations with error handling
 */
export const useAsyncError = () => {
  const throwError = useCallback((error) => {
    // This will be caught by the nearest error boundary
    throw error
  }, [])

  const wrapAsync = useCallback((asyncFn) => {
    return async (...args) => {
      try {
        return await asyncFn(...args)
      } catch (error) {
        throwError(error)
      }
    }
  }, [throwError])

  return { throwError, wrapAsync }
}

/**
 * Hook for error reporting and analytics
 */
export const useErrorReporting = () => {
  const reportError = useCallback((error, context = {}) => {
    const errorReport = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context,
      errorId: generateErrorId()
    }

    // Send to error reporting service (implement based on your service)
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to external service
      // sendToErrorService(errorReport)
    }

    // Store locally for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorReports') || '[]')
      existingErrors.push(errorReport)
      // Keep only last 50 errors
      const recentErrors = existingErrors.slice(-50)
      localStorage.setItem('errorReports', JSON.stringify(recentErrors))
    } catch (e) {
      console.warn('Failed to store error report:', e)
    }

    console.error('Error reported:', errorReport)
    return errorReport
  }, [])

  const getErrorReports = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('errorReports') || '[]')
    } catch (e) {
      console.warn('Failed to retrieve error reports:', e)
      return []
    }
  }, [])

  const clearErrorReports = useCallback(() => {
    try {
      localStorage.removeItem('errorReports')
    } catch (e) {
      console.warn('Failed to clear error reports:', e)
    }
  }, [])

  return {
    reportError,
    getErrorReports,
    clearErrorReports
  }
}

export default useErrorHandler