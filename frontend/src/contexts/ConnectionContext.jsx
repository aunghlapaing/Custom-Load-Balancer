import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { systemApi } from '../services/api'

const ConnectionContext = createContext()

export const useConnection = () => {
  const context = useContext(ConnectionContext)
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider')
  }
  return context
}

export const ConnectionProvider = ({ children }) => {
  const [connectionState, setConnectionState] = useState({
    isOnline: navigator.onLine,
    isBackendConnected: false, // Start pessimistic until we verify
    connectionQuality: 'offline',
    lastConnected: null,
    reconnectAttempts: 0,
    isReconnecting: false,
    latency: null,
    error: null
  })

  const reconnectTimeoutRef = useRef(null)
  const pingIntervalRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 10
  const baseReconnectDelay = 1000 // Start with 1 second
  const maxReconnectDelay = 30000 // Max 30 seconds

  // Calculate exponential backoff delay
  const getReconnectDelay = (attempt) => {
    const delay = Math.min(baseReconnectDelay * Math.pow(2, attempt), maxReconnectDelay)
    // Add some jitter to prevent thundering herd
    return delay + Math.random() * 1000
  }

  // Test backend connection with latency measurement
  const testConnection = useCallback(async () => {
    const startTime = Date.now()
    try {
      const response = await fetch('http://localhost:8081/api/v1/ping', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      })

      const latency = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        if (data.message === 'pong' && data.status === 'ok') {
          setConnectionState(prev => ({
            ...prev,
            isBackendConnected: true,
            connectionQuality: getConnectionQuality(latency),
            lastConnected: new Date(),
            latency,
            error: null,
            reconnectAttempts: 0,
            isReconnecting: false
          }))

          reconnectAttemptsRef.current = 0
          return true
        }
      }

      // If response is not ok or data is invalid
      throw new Error(`Backend responded with status ${response.status}`)
    } catch (error) {
      console.log('Backend connection test failed:', error.message)
      setConnectionState(prev => ({
        ...prev,
        isBackendConnected: false,
        connectionQuality: 'offline',
        latency: null,
        error: error.message || 'Backend connection failed',
        isReconnecting: false
      }))

      return false
    }
  }, [])

  // Determine connection quality based on latency
  const getConnectionQuality = (latency) => {
    if (latency < 100) return 'excellent'
    if (latency < 300) return 'good'
    if (latency < 1000) return 'poor'
    return 'offline'
  }

  // Attempt to reconnect with exponential backoff
  const attemptReconnect = useCallback(async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionState(prev => ({
        ...prev,
        isReconnecting: false,
        error: 'Maximum reconnection attempts reached'
      }))
      return
    }

    setConnectionState(prev => ({
      ...prev,
      isReconnecting: true,
      reconnectAttempts: reconnectAttemptsRef.current + 1
    }))

    const success = await testConnection()

    if (!success) {
      reconnectAttemptsRef.current++
      const delay = getReconnectDelay(reconnectAttemptsRef.current)

      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect()
      }, delay)
    }
  }, [testConnection])

  // Manual reconnect function
  const reconnect = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectAttemptsRef.current = 0
    setConnectionState(prev => ({
      ...prev,
      isReconnecting: true,
      reconnectAttempts: 0,
      error: null
    }))

    await testConnection()
  }, [testConnection])

  // Start periodic connection monitoring
  const startMonitoring = useCallback(() => {
    // Initial connection test
    testConnection()

    // Set up periodic ping
    pingIntervalRef.current = setInterval(async () => {
      if (!connectionState.isReconnecting) {
        const success = await testConnection()

        // If connection failed and we're online, start reconnection
        if (!success && navigator.onLine && !connectionState.isReconnecting) {
          attemptReconnect()
        }
      }
    }, 30000) // Check every 30 seconds
  }, [testConnection, attemptReconnect, connectionState.isReconnecting])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setConnectionState(prev => ({ ...prev, isOnline: true }))
      // Test backend connection when coming back online
      testConnection()
    }

    const handleOffline = () => {
      setConnectionState(prev => ({
        ...prev,
        isOnline: false,
        // Don't set isBackendConnected to false since backend might still be running locally
        connectionQuality: 'offline'
      }))
      stopMonitoring()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [testConnection, stopMonitoring])

  // Start monitoring on mount
  useEffect(() => {
    if (navigator.onLine) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [startMonitoring, stopMonitoring])

  // Handle visibility change (pause monitoring when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopMonitoring()
      } else if (navigator.onLine) {
        startMonitoring()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [startMonitoring, stopMonitoring])

  const contextValue = {
    ...connectionState,
    reconnect,
    testConnection,
    isConnected: connectionState.isOnline && connectionState.isBackendConnected,
    getConnectionStatus: () => {
      if (!connectionState.isOnline) return 'offline'
      if (!connectionState.isBackendConnected) return 'backend-disconnected'
      if (connectionState.isReconnecting) return 'reconnecting'
      return 'connected'
    },
    getConnectionIcon: () => {
      const status = contextValue.getConnectionStatus()
      switch (status) {
        case 'connected':
          return connectionState.connectionQuality === 'excellent' ? 'wifi-high' :
            connectionState.connectionQuality === 'good' ? 'wifi-medium' : 'wifi-low'
        case 'reconnecting':
          return 'wifi-connecting'
        case 'backend-disconnected':
          return 'wifi-error'
        case 'offline':
        default:
          return 'wifi-off'
      }
    }
  }

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  )
}

export default ConnectionProvider