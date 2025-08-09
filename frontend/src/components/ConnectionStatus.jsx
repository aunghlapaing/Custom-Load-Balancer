import React, { useState } from 'react'
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Clock,
  Signal
} from 'lucide-react'
import { useConnection } from '../contexts/ConnectionContext'
import Button from './Button'

const ConnectionStatus = ({ 
  showDetails = false, 
  showInHeader = false,
  compact = false 
}) => {
  const {
    isOnline,
    isBackendConnected,
    connectionQuality,
    lastConnected,
    reconnectAttempts,
    isReconnecting,
    latency,
    error,
    reconnect,
    getConnectionStatus
  } = useConnection()

  const [showTooltip, setShowTooltip] = useState(false)
  const status = getConnectionStatus()

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          label: 'Connected',
          description: `Backend connected • ${connectionQuality} connection`
        }
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          label: 'Reconnecting',
          description: `Attempting to reconnect (${reconnectAttempts}/${10})`,
          animate: true
        }
      case 'backend-disconnected':
        return {
          icon: AlertTriangle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          label: 'Backend Offline',
          description: 'Cannot connect to backend service'
        }
      case 'offline':
      default:
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          label: 'Offline',
          description: 'No internet connection'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  // Compact version for header
  if (compact) {
    return (
      <div 
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
          <Icon 
            className={`h-4 w-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`} 
          />
        </div>
        
        {showTooltip && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50">
            <div className="flex items-center space-x-2 mb-2">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className="font-medium text-gray-900 dark:text-white">
                {config.label}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {config.description}
            </p>
            {latency && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Latency: {latency}ms
              </p>
            )}
            {status !== 'connected' && (
              <Button 
                onClick={reconnect}
                size="sm"
                variant="outline"
                className="w-full mt-2"
                disabled={isReconnecting}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isReconnecting ? 'animate-spin' : ''}`} />
                {isReconnecting ? 'Reconnecting...' : 'Retry'}
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Full status component
  if (!showDetails && showInHeader) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${config.bgColor}`}>
        <Icon 
          className={`h-4 w-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`} 
        />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>
    )
  }

  // Detailed status panel
  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Icon 
            className={`h-6 w-6 ${config.color} ${config.animate ? 'animate-spin' : ''}`} 
          />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {config.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {config.description}
            </p>
          </div>
        </div>
        
        {status !== 'connected' && (
          <Button 
            onClick={reconnect}
            size="sm"
            variant="outline"
            disabled={isReconnecting}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isReconnecting ? 'animate-spin' : ''}`} />
            {isReconnecting ? 'Reconnecting...' : 'Retry'}
          </Button>
        )}
      </div>

      {/* Connection Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <span className="text-gray-600 dark:text-gray-300">
            Internet: {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isBackendConnected ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <span className="text-gray-600 dark:text-gray-300">
            Backend: {isBackendConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {latency && (
          <div className="flex items-center space-x-2">
            <Signal className="h-4 w-4 text-blue-500" />
            <span className="text-gray-600 dark:text-gray-300">
              Latency: {latency}ms
            </span>
          </div>
        )}

        {lastConnected && (
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-300">
              Last: {lastConnected ? lastConnected.toLocaleTimeString() : 'Never'}
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Reconnection Info */}
      {isReconnecting && reconnectAttempts > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Reconnection attempt {reconnectAttempts} of 10
          </p>
        </div>
      )}
    </div>
  )
}

export default ConnectionStatus