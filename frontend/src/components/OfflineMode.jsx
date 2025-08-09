import React, { useState, useEffect } from 'react'
import { WifiOff, RefreshCw, AlertTriangle, Info } from 'lucide-react'
import { useConnection } from '../contexts/ConnectionContext'
import Button from './Button'

const OfflineMode = ({ children }) => {
  const { 
    isOnline, 
    isBackendConnected, 
    isReconnecting, 
    reconnect,
    getConnectionStatus 
  } = useConnection()

  const [showOfflineBanner, setShowOfflineBanner] = useState(false)
  const [offlineData, setOfflineData] = useState(null)

  const status = getConnectionStatus()
  const isFullyOffline = !isOnline
  const isPartiallyOffline = isOnline && !isBackendConnected

  // Show offline banner when connection is lost
  useEffect(() => {
    if (isFullyOffline || isPartiallyOffline) {
      setShowOfflineBanner(true)
    } else {
      setShowOfflineBanner(false)
    }
  }, [isFullyOffline, isPartiallyOffline])

  // Cache data for offline use
  useEffect(() => {
    if (isOnline && isBackendConnected) {
      // Cache current data when online
      const dataToCache = {
        timestamp: new Date().toISOString(),
        // Add any data you want to cache for offline use
        cachedAt: new Date().toLocaleString()
      }
      
      try {
        localStorage.setItem('offlineCache', JSON.stringify(dataToCache))
        setOfflineData(dataToCache)
      } catch (error) {
        console.warn('Failed to cache data for offline use:', error)
      }
    }
  }, [isOnline, isBackendConnected])

  // Load cached data on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('offlineCache')
      if (cached) {
        setOfflineData(JSON.parse(cached))
      }
    } catch (error) {
      console.warn('Failed to load offline cache:', error)
    }
  }, [])

  const OfflineBanner = () => {
    if (!showOfflineBanner) return null

    const getBannerConfig = () => {
      if (isFullyOffline) {
        return {
          icon: WifiOff,
          title: 'You\'re offline',
          message: 'Check your internet connection. Some features may not work.',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
          iconColor: 'text-red-500'
        }
      } else if (isPartiallyOffline) {
        return {
          icon: AlertTriangle,
          title: 'Backend disconnected',
          message: 'Cannot connect to the server. Trying to reconnect...',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          iconColor: 'text-yellow-500'
        }
      }
    }

    const config = getBannerConfig()
    if (!config) return null

    const Icon = config.icon

    return (
      <div className={`${config.bgColor} border-b ${config.borderColor} px-4 py-3`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0`} />
            <div>
              <p className={`text-sm font-medium ${config.textColor}`}>
                {config.title}
              </p>
              <p className={`text-sm ${config.textColor} opacity-90`}>
                {config.message}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {offlineData && (
              <div className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                Last updated: {offlineData.cachedAt}
              </div>
            )}
            
            {!isFullyOffline && (
              <Button
                onClick={reconnect}
                size="sm"
                variant="outline"
                disabled={isReconnecting}
                className={`${config.borderColor} ${config.textColor} hover:bg-opacity-10`}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isReconnecting ? 'animate-spin' : ''}`} />
                {isReconnecting ? 'Reconnecting...' : 'Retry'}
              </Button>
            )}
            
            <button
              onClick={() => setShowOfflineBanner(false)}
              className={`${config.textColor} hover:opacity-75 p-1`}
              aria-label="Dismiss offline notification"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    )
  }

  const OfflineOverlay = () => {
    if (isOnline || !isFullyOffline) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <WifiOff className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connection Lost
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You've lost your internet connection. Please check your network settings and try again.
            </p>
            
            {offlineData && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <div className="flex items-center">
                  <Info className="h-4 w-4 text-blue-500 mr-2" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Showing cached data from {offlineData.cachedAt}
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              
              <Button
                onClick={() => setShowOfflineBanner(false)}
                variant="outline"
                className="w-full"
              >
                Continue Offline
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <OfflineBanner />
      {children}
      <OfflineOverlay />
    </>
  )
}

export default OfflineMode