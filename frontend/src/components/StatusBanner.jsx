import React, { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Clock, 
  Cpu, 
  X, 
  RefreshCw, 
  Settings, 
  Activity, 
  Server, 
  Shield,
  Zap,
  Database,
  Network
} from 'lucide-react'
import clsx from 'clsx'
import { useAnimations, hoverEffects, pageTransitions } from '../lib/animations'

const StatusBanner = ({ 
  isOnline = true,
  uptime = '0m',
  version = 'v1.0.0',
  alerts = [],
  systemHealth = {},
  autoRefresh = true,
  refreshInterval = 30,
  dismissible = false,
  quickActions = [],
  onDismiss,
  onRefresh,
  onQuickAction,
  className,
  ...props 
}) => {
  const [isDismissed, setIsDismissed] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(refreshInterval)
  const { getAnimationClass } = useAnimations()

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      setTimeUntilRefresh(prev => {
        if (prev <= 1) {
          setLastRefresh(new Date())
          onRefresh?.()
          return refreshInterval
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, onRefresh])

  // Don't render if dismissed
  if (isDismissed) return null

  // Determine overall system status
  const getSystemStatus = () => {
    if (!isOnline) return 'critical'
    if (alerts.some(alert => alert.type === 'critical')) return 'critical'
    if (alerts.some(alert => alert.type === 'warning')) return 'warning'
    if (alerts.some(alert => alert.type === 'info')) return 'info'
    return 'healthy'
  }

  const systemStatus = getSystemStatus()

  // Status configuration
  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      title: 'LoadMaster Pro is Running!',
      subtitle: 'All systems operational - Load balancing active',
      gradient: 'bg-gradient-to-r from-green-500 to-green-600',
      textColor: 'text-white',
      accentColor: 'text-green-100'
    },
    warning: {
      icon: AlertTriangle,
      title: 'System Warning',
      subtitle: 'Some issues detected - Monitoring required',
      gradient: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
      textColor: 'text-white',
      accentColor: 'text-yellow-100'
    },
    critical: {
      icon: XCircle,
      title: 'System Alert',
      subtitle: 'Critical issues detected - Immediate attention required',
      gradient: 'bg-gradient-to-r from-red-500 to-red-600',
      textColor: 'text-white',
      accentColor: 'text-red-100'
    },
    info: {
      icon: Info,
      title: 'System Information',
      subtitle: 'Updates and notifications available',
      gradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
      textColor: 'text-white',
      accentColor: 'text-blue-100'
    }
  }

  const config = statusConfig[systemStatus]
  const StatusIcon = config.icon

  // Default system health metrics
  const defaultHealth = {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    activeConnections: 0,
    requestsPerSecond: 0,
    ...systemHealth
  }

  // Default quick actions
  const defaultQuickActions = [
    { id: 'restart', label: 'Restart Service', icon: RefreshCw, variant: 'secondary' },
    { id: 'settings', label: 'Settings', icon: Settings, variant: 'secondary' },
    { id: 'logs', label: 'View Logs', icon: Activity, variant: 'secondary' },
    ...quickActions
  ]

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleQuickAction = (actionId) => {
    onQuickAction?.(actionId)
  }

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div 
      className={clsx(
        'rounded-xl shadow-lg',
        getAnimationClass(hoverEffects.glowSubtle),
        getAnimationClass(pageTransitions.slideUpFade),
        config.gradient,
        className
      )}
      {...props}
    >
      <div className="p-6">
        {/* Main Status Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <StatusIcon className="h-8 w-8 text-white" />
              <div>
                <h2 className={clsx('text-2xl font-bold', config.textColor)}>
                  {config.title}
                </h2>
                <p className={clsx('text-lg', config.accentColor)}>
                  {config.subtitle}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Auto-refresh indicator */}
            {autoRefresh && (
              <div className="flex items-center space-x-2">
                <RefreshCw className={clsx('h-4 w-4', config.accentColor, 'animate-spin')} />
                <span className={clsx('text-sm', config.accentColor)}>
                  Refresh in {timeUntilRefresh}s
                </span>
              </div>
            )}
            
            {/* Dismiss button */}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className={clsx(
                  'p-1 rounded-full hover:bg-white/20 transition-colors',
                  config.textColor
                )}
                aria-label="Dismiss banner"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* System Health Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Clock className={clsx('h-5 w-5', config.accentColor)} />
            <div>
              <p className={clsx('text-sm', config.accentColor)}>Uptime</p>
              <p className={clsx('font-semibold', config.textColor)}>{uptime}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Cpu className={clsx('h-5 w-5', config.accentColor)} />
            <div>
              <p className={clsx('text-sm', config.accentColor)}>CPU</p>
              <p className={clsx('font-semibold', config.textColor)}>{defaultHealth.cpu}%</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Database className={clsx('h-5 w-5', config.accentColor)} />
            <div>
              <p className={clsx('text-sm', config.accentColor)}>Memory</p>
              <p className={clsx('font-semibold', config.textColor)}>{defaultHealth.memory}%</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Network className={clsx('h-5 w-5', config.accentColor)} />
            <div>
              <p className={clsx('text-sm', config.accentColor)}>Network</p>
              <p className={clsx('font-semibold', config.textColor)}>{defaultHealth.network}%</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Activity className={clsx('h-5 w-5', config.accentColor)} />
            <div>
              <p className={clsx('text-sm', config.accentColor)}>Connections</p>
              <p className={clsx('font-semibold', config.textColor)}>{defaultHealth.activeConnections}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Zap className={clsx('h-5 w-5', config.accentColor)} />
            <div>
              <p className={clsx('text-sm', config.accentColor)}>Req/s</p>
              <p className={clsx('font-semibold', config.textColor)}>{defaultHealth.requestsPerSecond}</p>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-4">
            <h3 className={clsx('text-lg font-semibold mb-2', config.textColor)}>
              Active Alerts ({alerts.length})
            </h3>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between bg-white/10 rounded-lg p-3"
                >
                  <div className="flex items-center space-x-3">
                    {alert.type === 'critical' && <XCircle className="h-4 w-4 text-red-200" />}
                    {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-200" />}
                    {alert.type === 'info' && <Info className="h-4 w-4 text-blue-200" />}
                    <div>
                      <p className={clsx('font-medium', config.textColor)}>{alert.title}</p>
                      <p className={clsx('text-sm', config.accentColor)}>{alert.message}</p>
                    </div>
                  </div>
                  <span className={clsx('text-xs', config.accentColor)}>
                    {alert.timestamp ? formatTimeAgo(new Date(alert.timestamp)) : 'Now'}
                  </span>
                </div>
              ))}
              {alerts.length > 3 && (
                <p className={clsx('text-sm', config.accentColor)}>
                  +{alerts.length - 3} more alerts
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {defaultQuickActions.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span className={clsx('font-medium', config.textColor)}>Live</span>
              <span className={clsx('text-sm', config.accentColor)}>
                Last updated {formatTimeAgo(lastRefresh)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {defaultQuickActions.slice(0, 4).map((action) => {
                const ActionIcon = action.icon
                return (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.id)}
                    className={clsx(
                      'flex items-center space-x-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200',
                      action.variant === 'primary' 
                        ? 'bg-white text-gray-900 hover:bg-gray-100' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    )}
                  >
                    <ActionIcon className="h-4 w-4" />
                    <span>{action.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Version Info */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center space-x-2">
            <Server className={clsx('h-4 w-4', config.accentColor)} />
            <span className={clsx('text-sm', config.accentColor)}>
              LoadMaster Pro {version}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className={clsx('h-4 w-4', config.accentColor)} />
              <span className={clsx('text-sm', config.accentColor)}>
                Security: Active
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Activity className={clsx('h-4 w-4', config.accentColor)} />
              <span className={clsx('text-sm', config.accentColor)}>
                Monitoring: Enabled
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusBanner