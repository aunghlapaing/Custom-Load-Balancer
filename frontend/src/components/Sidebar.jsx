import React, { useRef, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Server,
  Activity,
  Shield,
  Lock,
  TrendingUp,
  Settings,
  User,
  Zap,
  Gauge,
  ChevronLeft,
  ChevronRight,
  X,
  WifiOff,
  AlertTriangle
} from 'lucide-react'
import clsx from 'clsx'
import useServerCount from '../hooks/useServerCount'
import { useConnection } from '../contexts/ConnectionContext'

// Modern navigation structure with better organization
const getNavigationGroups = (serverCount, loading) => [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: BarChart3, badge: null },
    ]
  },
  {
    name: 'Infrastructure',
    items: [
      { name: 'Load Balancing', href: '/load-balancing', icon: Zap, badge: null },
      {
        name: 'Servers',
        href: '/servers',
        icon: Server,
        badge: loading ? '...' : (serverCount > 0 ? serverCount.toString() : null)
      },
      { name: 'Health Checks', href: '/health-checks', icon: Activity, badge: null },
    ]
  },
  {
    name: 'Analytics',
    items: [
      { name: 'Metrics', href: '/analytics', icon: TrendingUp, badge: null },
      { name: 'Profile Settings', href: '/profile', icon: User, badge: null },
    ]
  }
]

// Navigation groups are used directly in the component

const Sidebar = ({
  state,
  isMobile,
  isTablet,
  isDesktop,
  onClose,
  onToggle,
  currentPath,
  className
}) => {
  const isCollapsed = state === 'collapsed'
  const isExpanded = state === 'expanded'
  const sidebarRef = useRef(null)
  const firstFocusableRef = useRef(null)
  const { serverCount, loading } = useServerCount()
  
  // Get real connection status
  const { 
    isBackendConnected, 
    connectionQuality, 
    isReconnecting, 
    error,
    getConnectionStatus 
  } = useConnection()

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback((event) => {
    if (!sidebarRef.current) return

    const focusableElements = sidebarRef.current.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const focusableArray = Array.from(focusableElements)
    const currentIndex = focusableArray.indexOf(document.activeElement)

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        const nextIndex = currentIndex < focusableArray.length - 1 ? currentIndex + 1 : 0
        focusableArray[nextIndex]?.focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableArray.length - 1
        focusableArray[prevIndex]?.focus()
        break
      case 'Home':
        event.preventDefault()
        focusableArray[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        focusableArray[focusableArray.length - 1]?.focus()
        break
      case 'Escape':
        if (isMobile && isExpanded) {
          event.preventDefault()
          onClose?.()
        }
        break
    }
  }, [isMobile, isExpanded, onClose])

  // Focus management for accessibility
  useEffect(() => {
    if (isExpanded && isMobile && firstFocusableRef.current) {
      // Focus first focusable element when mobile sidebar opens
      firstFocusableRef.current.focus()
    }
  }, [isExpanded, isMobile])

  // Navigation item component with enhanced accessibility and animations
  const NavigationItem = ({ item, onClick, showTooltip = false, isFirst = false }) => {
    const isActive = currentPath === item.href
    const linkRef = useRef(null)

    const linkContent = (
      <Link
        ref={isFirst ? firstFocusableRef : linkRef}
        to={item.href}
        onClick={onClick}
        className={clsx(
          'group relative flex items-center justify-between transition-all duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1',
          isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5',
          isActive
            ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-r-2 border-primary'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100',
          'rounded-lg font-medium text-sm',
          'border border-transparent hover:border-gray-200 dark:hover:border-gray-700',
          isActive && 'shadow-sm'
        )}
        aria-label={isCollapsed ? item.name : undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        <div className="flex items-center min-w-0">
          <item.icon
            className={clsx(
              'flex-shrink-0 h-5 w-5 transition-all duration-200',
              isActive ? 'text-primary' : 'text-current group-hover:scale-105',
              !isCollapsed && 'mr-3'
            )}
            aria-hidden="true"
          />
          {!isCollapsed && (
            <span className="truncate transition-all duration-200">
              {item.name}
            </span>
          )}
        </div>

        {/* Badge for notifications/counts */}
        {!isCollapsed && item.badge && (
          <span className={clsx(
            'inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full',
            isActive
              ? 'bg-primary/20 text-primary'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          )}>
            {item.badge}
          </span>
        )}

        {/* Active indicator dot for collapsed state */}
        {isActive && isCollapsed && (
          <div className="absolute -right-1 -top-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}

        {/* Badge dot for collapsed state */}
        {isCollapsed && item.badge && !isActive && (
          <div className="absolute -right-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </Link>
    )

    // Enhanced tooltip with better positioning and animation
    if (showTooltip && isCollapsed) {
      return (
        <div className="relative group/tooltip">
          {linkContent}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg border border-border opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
            {item.name}
            {/* Tooltip arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-popover" />
          </div>
        </div>
      )
    }

    return linkContent
  }



  // Status indicator component with real backend connection status
  const StatusIndicator = () => {
    const connectionStatus = getConnectionStatus()
    
    // Determine status configuration based on real connection state
    const getStatusConfig = () => {
      if (!isBackendConnected) {
        return {
          bgColor: 'bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          dotColor: 'bg-red-500',
          pingColor: 'bg-red-400',
          textColor: 'text-red-700 dark:text-red-300',
          subTextColor: 'text-red-600 dark:text-red-400',
          title: 'Backend Offline',
          subtitle: 'API services unavailable',
          icon: WifiOff,
          animate: false
        }
      }
      
      if (isReconnecting) {
        return {
          bgColor: 'bg-gradient-to-r from-yellow-50 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          dotColor: 'bg-yellow-500',
          pingColor: 'bg-yellow-400',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          subTextColor: 'text-yellow-600 dark:text-yellow-400',
          title: 'Reconnecting',
          subtitle: 'Attempting to restore connection',
          icon: AlertTriangle,
          animate: true
        }
      }
      
      if (connectionQuality === 'poor') {
        return {
          bgColor: 'bg-gradient-to-r from-orange-50 to-orange-50 dark:from-orange-900/20 dark:to-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          dotColor: 'bg-orange-500',
          pingColor: 'bg-orange-400',
          textColor: 'text-orange-700 dark:text-orange-300',
          subTextColor: 'text-orange-600 dark:text-orange-400',
          title: 'Poor Connection',
          subtitle: 'High latency detected',
          icon: AlertTriangle,
          animate: true
        }
      }
      
      // Default: Connected and healthy
      return {
        bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        dotColor: 'bg-green-500',
        pingColor: 'bg-green-400',
        textColor: 'text-green-700 dark:text-green-300',
        subTextColor: 'text-green-600 dark:text-green-400',
        title: 'System Online',
        subtitle: 'All services operational',
        icon: Gauge,
        animate: true
      }
    }
    
    const config = getStatusConfig()
    
    return (
      <div className={clsx(
        'flex-shrink-0 border-t border-gray-100 dark:border-gray-800',
        isCollapsed ? 'p-3' : 'p-4'
      )}>
        <div className={clsx(
          config.bgColor,
          'border', config.borderColor, 'rounded-xl transition-all duration-200',
          isCollapsed ? 'p-2' : 'p-3'
        )}>
          <div className={clsx(
            'flex items-center',
            isCollapsed && 'justify-center'
          )}>
            <div className="flex-shrink-0 relative">
              <div className={clsx(
                'w-2 h-2 rounded-full',
                config.dotColor,
                config.animate && 'animate-pulse'
              )}></div>
              {config.animate && (
                <div className={clsx(
                  'absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-75',
                  config.pingColor
                )}></div>
              )}
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <p className={clsx('text-xs font-semibold', config.textColor)}>
                  {config.title}
                </p>
                <p className={clsx('text-xs', config.subTextColor)}>
                  {config.subtitle}
                </p>
                {error && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Brand header component with modern design
  const BrandHeader = ({ showToggle = false }) => (
    <div className={clsx(
      'flex items-center flex-shrink-0 border-b border-gray-100 dark:border-gray-800 transition-all duration-200',
      isCollapsed ? 'justify-center p-4' : 'justify-between p-4'
    )}>
      <div className={clsx(
        'flex items-center transition-all duration-200',
        isCollapsed && 'justify-center'
      )}>
        <div className="flex-shrink-0 relative">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <Gauge className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
          )}
        </div>
        {!isCollapsed && (
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">LoadMaster</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Version 1.1</p>
          </div>
        )}
      </div>
      {showToggle && (
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )

  // Main sidebar content
  const SidebarContent = ({ showToggle = false }) => {
    let isFirstItem = true
    const navigationGroups = getNavigationGroups(serverCount, loading)

    return (
      <div className="flex flex-col h-full">
        <BrandHeader showToggle={showToggle} />

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <nav className={clsx(
            'transition-all duration-200',
            isCollapsed ? 'px-2 py-3' : 'px-3 py-4'
          )}>
            {/* Render grouped navigation */}
            {navigationGroups.map((group, groupIndex) => (
              <div key={group.name} className={clsx(
                groupIndex > 0 && (isCollapsed ? 'mt-8' : 'mt-7')
              )}>
                {!isCollapsed && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {group.name}
                  </h3>
                )}
                <div className={clsx(
                  isCollapsed ? 'space-y-2' : 'space-y-1'
                )}>
                  {group.items.map((item) => {
                    const isFirst = isFirstItem
                    isFirstItem = false
                    return (
                      <NavigationItem
                        key={item.href}
                        item={item}
                        onClick={isMobile ? onClose : undefined}
                        showTooltip={!isMobile}
                        isFirst={isFirst}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <StatusIndicator />
      </div>
    )
  }

  // Mobile navigation with modern design
  if (isMobile) {
    return (
      <div className={clsx(
        'fixed inset-0 z-50 lg:hidden',
        isExpanded ? 'block' : 'hidden'
      )}>
        {/* Enhanced overlay with backdrop blur */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modern mobile sidebar */}
        <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 shadow-2xl border-r border-gray-200 dark:border-gray-800">
          {/* Mobile header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg mr-3">
                <Gauge className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">LoadMaster</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enterprise Pro</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            {getNavigationGroups(serverCount, loading).map((group, groupIndex) => (
              <div key={group.name} className={clsx('mb-6', groupIndex === 0 && 'mt-2')}>
                <h3 className="px-3 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {group.name}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={clsx(
                        'flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                        'border border-transparent hover:border-gray-200 dark:hover:border-gray-700',
                        currentPath === item.href
                          ? 'bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-sm'
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        {item.name}
                      </div>
                      {item.badge && (
                        <span className={clsx(
                          'inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full',
                          currentPath === item.href
                            ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Mobile status indicator - using real connection status */}
          <StatusIndicator />
        </div>
      </div>
    )
  }

  // Desktop/Tablet sidebar with modern design
  return (
    <div
      ref={sidebarRef}
      className={clsx(
        className,
        'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-all duration-300 ease-in-out shadow-sm',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label="Main navigation"
    >
      <SidebarContent />

      {/* Modern toggle button for desktop/tablet */}
      {(isDesktop || isTablet) && (
        <button
          onClick={onToggle}
          className={clsx(
            'absolute -right-3 top-8 w-6 h-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-md hover:shadow-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  )
}

export default Sidebar