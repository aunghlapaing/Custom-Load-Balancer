import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu,
  Bell,
  User,
  RefreshCw,
  Settings,
  LogOut,
  ChevronDown,
  X,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'
import ConnectionStatus from './ConnectionStatus'
import { serverApi, metricsApi } from '../services/api'

const Header = ({ onMenuToggle, sidebarState, isMobile }) => {
  // Authentication context
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // State management for various features
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [servers, setServers] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Refs for dropdown management
  const notificationsRef = useRef(null)
  const userMenuRef = useRef(null)

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Connection notifications functionality simplified - handled by ConnectionStatus component

  // Fetch real data from backend
  const fetchBackendData = useCallback(async () => {
    console.log('🔄 Starting fetchBackendData...')
    console.log('🔧 API Base URL:', import.meta.env.VITE_API_BASE_URL)
    console.log('🔧 API Key:', import.meta.env.VITE_API_KEY ? 'Set' : 'Not Set')

    try {
      // First test if backend is reachable with a simple ping
      console.log('📡 Testing backend connectivity...')
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      try {
        const pingResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/ping`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!pingResponse.ok) {
          throw new Error(`Backend ping failed: ${pingResponse.status} ${pingResponse.statusText}`)
        }
        
        console.log('✅ Backend is reachable')
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('Backend connection timeout - service may be down')
        }
        throw fetchError
      }

      // Fetch servers
      console.log('📡 Fetching servers...')
      const serversResponse = await serverApi.getAll()
      console.log('📡 Servers response:', serversResponse)
      const serverData = serversResponse.data || []
      console.log('📊 Server data:', serverData)
      setServers(serverData)

      // Fetch metrics
      console.log('📡 Fetching metrics...')
      const metricsResponse = await metricsApi.get()
      console.log('📡 Metrics response:', metricsResponse)
      const metricsData = metricsResponse.data || null
      console.log('📊 Metrics data:', metricsData)
      setMetrics(metricsData)

      // Generate notifications inline to avoid dependency issues
      const newNotifications = []
      let notificationId = 1

      console.log('🔔 Generating notifications with server data:', serverData)
      console.log('🔔 Metrics data:', metricsData)

      // Check for unhealthy servers (handle both 'UNHEALTHY' and 'unhealthy')
      serverData.forEach(server => {
        const healthStatus = server.healthStatus?.toLowerCase()
        console.log(`🔍 Checking server ${server.id}: healthStatus="${server.healthStatus}" -> lowercase="${healthStatus}" -> isUnhealthy=${healthStatus !== 'healthy'}`)

        if (healthStatus !== 'healthy') {
          // Create unique notification ID based on server ID and issue type
          const notificationKey = `server-health-${server.id}`

          // Only add notification if it hasn't been dismissed
          if (!dismissedNotifications.has(notificationKey)) {
            console.log(`⚠️ Adding notification for unhealthy server: ${server.id}`)
            newNotifications.push({
              id: notificationKey,
              type: 'warning',
              title: 'Server Health Issue',
              message: `Server ${server.id} is ${server.healthStatus}`,
              time: 'Just now',
              unread: true,
              icon: AlertTriangle
            })
          } else {
            console.log(`🔇 Notification for server ${server.id} was dismissed, not showing again`)
          }
        } else {
          console.log(`✅ Server ${server.id} is healthy, no notification needed`)
        }
      })

      // Check system metrics if available
      if (metricsData?.system) {
        const { cpu, memory } = metricsData.system

        if (cpu?.usage > 80) {
          const notificationKey = 'system-cpu-high'
          if (!dismissedNotifications.has(notificationKey)) {
            newNotifications.push({
              id: notificationKey,
              type: 'warning',
              title: 'High CPU Usage',
              message: `System CPU usage is at ${cpu.usage.toFixed(1)}%`,
              time: 'Just now',
              unread: true,
              icon: AlertTriangle
            })
          }
        }

        if (memory?.usage > 85) {
          const notificationKey = 'system-memory-high'
          if (!dismissedNotifications.has(notificationKey)) {
            newNotifications.push({
              id: notificationKey,
              type: 'warning',
              title: 'High Memory Usage',
              message: `System memory usage is at ${memory.usage.toFixed(1)}%`,
              time: 'Just now',
              unread: true,
              icon: AlertTriangle
            })
          }
        }
      }

      // Check load balancer health
      if (metricsData?.health?.overall === 'critical') {
        const notificationKey = 'loadbalancer-critical'
        if (!dismissedNotifications.has(notificationKey)) {
          newNotifications.push({
            id: notificationKey,
            type: 'warning',
            title: 'Load Balancer Critical',
            message: 'Load balancer is in critical state',
            time: 'Just now',
            unread: true,
            icon: AlertTriangle
          })
        }
      }

      // Add success notification if everything is healthy
      if (newNotifications.length === 0 && serverData.length > 0) {
        newNotifications.push({
          id: notificationId++,
          type: 'success',
          title: 'All Systems Healthy',
          message: `All ${serverData.length} servers are running normally`,
          time: '1 minute ago',
          unread: false,
          icon: CheckCircle
        })
      }

      // Log debug information
      if (serverData.length > 0) {
        console.log('Server data found, should have notifications for UNHEALTHY servers')
        console.log('First server health status:', serverData[0]?.healthStatus)
        console.log('Health status check:', serverData[0]?.healthStatus?.toLowerCase() !== 'healthy')
      }

      console.log('✅ Backend online - Generated notifications:', newNotifications)
      console.log('📊 Setting notifications to:', newNotifications)
      
      // Force update notifications state
      setNotifications(prevNotifications => {
        console.log('🔄 Previous notifications:', prevNotifications)
        console.log('🔄 New notifications being set:', newNotifications)
        return newNotifications
      })
    } catch (error) {
      console.error('Failed to fetch backend data:', error)

      // Generate backend offline notification
      const offlineNotifications = []
      let notificationId = 1

      // Add backend offline notification
      offlineNotifications.push({
        id: notificationId++,
        type: 'warning',
        title: 'Backend Offline',
        message: 'Cannot connect to backend API. Load balancer management is unavailable.',
        time: 'Just now',
        unread: true,
        icon: AlertTriangle
      })

      // Add connection error details
      offlineNotifications.push({
        id: notificationId++,
        type: 'info',
        title: 'Connection Error',
        message: `Error: ${error.message || 'Network connection failed'}`,
        time: 'Just now',
        unread: true,
        icon: AlertTriangle
      })

      console.log('Backend offline - generated offline notifications:', offlineNotifications)
      setNotifications(offlineNotifications)
      setServers([])
      setMetrics(null)
    }
  }, [dismissedNotifications])



  const unreadCount = notifications.filter(n => n.unread).length

  // Notification management functions
  const markNotificationAsRead = useCallback((notificationId) => {
    // Add to dismissed notifications set so it doesn't reappear
    setDismissedNotifications(prev => new Set([...prev, notificationId]))

    // Remove from current notifications
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== notificationId)
    )
    console.log(`Notification ${notificationId} marked as read and removed`)
  }, [])

  const markAllNotificationsAsRead = useCallback(() => {
    // Add all current notification IDs to dismissed notifications set
    setDismissedNotifications(prev => {
      const newDismissed = new Set(prev)
      notifications.forEach(notification => {
        newDismissed.add(notification.id)
      })
      return newDismissed
    })

    // Clear all notifications
    setNotifications([])
    console.log('All notifications marked as read and removed')
  }, [notifications])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debug effect to monitor notifications state
  useEffect(() => {
    console.log('🔔 Notifications state updated:', notifications)
    console.log('🔔 Unread count:', unreadCount)
    console.log('🔔 Dismissed notifications:', dismissedNotifications)
  }, [notifications, unreadCount, dismissedNotifications])



  // Fetch data on component mount and set up real-time updates
  useEffect(() => {
    // Initial fetch
    fetchBackendData()

    // Set up periodic updates every 30 seconds for real-time data
    const interval = setInterval(() => {
      fetchBackendData()
    }, 30000) // 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [fetchBackendData])

  // Refresh functionality - now fetches real data
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchBackendData()
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }



  // Notifications dropdown
  const NotificationsDropdown = () => (
    <div ref={notificationsRef} className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg relative transition-colors duration-200"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-error text-error-foreground text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute top-full right-0 mt-1 w-80 bg-popover border border-border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => markNotificationAsRead(notification.id)}
                  className={clsx(
                    'w-full p-4 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors duration-200 text-left',
                    notification.unread && 'bg-accent/20',
                    'focus:outline-none focus:bg-accent/50'
                  )}
                  title="Click to mark as read and remove"
                >
                  <div className="flex items-start space-x-3">
                    <notification.icon className={clsx(
                      'h-5 w-5 flex-shrink-0 mt-0.5',
                      notification.type === 'warning' && 'text-warning',
                      notification.type === 'success' && 'text-success',
                      notification.type === 'info' && 'text-info'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {notification.time}
                      </p>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      {notification.unread && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                      <X className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border">
            <button className="w-full text-sm text-primary hover:text-primary/80 text-center">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // User menu dropdown
  const UserMenuDropdown = () => (
    <div ref={userMenuRef} className="relative">
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center space-x-2 p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors duration-200"
        aria-label="User menu"
      >
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-foreground">{user?.name || 'Admin User'}</p>
          <p className="text-xs text-muted-foreground">{user?.role || 'System Administrator'}</p>
        </div>
        <div className="flex items-center space-x-1">
          <User className="h-5 w-5" />
          <ChevronDown className="h-3 w-3" />
        </div>
      </button>

      {showUserMenu && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">{user?.name || 'Admin User'}</p>
            <p className="text-xs text-muted-foreground">{user?.email || 'admin@loadmaster.com'}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setShowUserMenu(false)
                navigate('/profile')
              }}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors duration-200 flex items-center space-x-2"
            >
              <User className="h-4 w-4" />
              <span>Profile Settings</span>
            </button>
            <button
              onClick={() => {
                setShowUserMenu(false)
                navigate('/settings')
              }}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors duration-200 flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>System Settings</span>
            </button>
          </div>
          <div className="border-t border-border py-1">
            <button
              onClick={() => {
                setShowUserMenu(false)
                handleLogout()
              }}
              className="w-full px-3 py-2 text-left text-sm text-error hover:bg-accent transition-colors duration-200 flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )



  return (
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        {/* Left side */}
        <div className="flex items-center min-w-0 flex-1">
          {/* Mobile menu button */}
          {isMobile && (
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200 mr-3"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Page title and description */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
              Load Balancer Dashboard
            </h1>
            <div className="flex items-center mt-1 space-x-4">
              <p className="text-sm text-muted-foreground hidden sm:block">
                Monitor and manage your infrastructure
              </p>
              <ConnectionStatus showInHeader={true} />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 sm:space-x-3 ml-4">
          {/* Theme toggle */}
          <ThemeToggle className="p-2" />

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors duration-200 disabled:opacity-50"
            aria-label="Refresh data"
          >
            <RefreshCw className={clsx('h-5 w-5', isRefreshing && 'animate-spin')} />
          </button>

          {/* Enhanced notifications */}
          <NotificationsDropdown />

          {/* Enhanced user menu */}
          <UserMenuDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header