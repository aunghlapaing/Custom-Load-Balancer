import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, XCircle } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'
// import { useAnimations, hoverEffects } from '../lib/animations'
import { SkeletonMetricCard } from './Skeleton'

const MetricCard = React.memo(({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  sparklineData = [],
  status = 'normal', // normal, warning, critical
  size = 'default', // compact, default, large
  interactive = false,
  loading = false,
  error = null,
  onClick,
  className,
  ...props 
}) => {
  const [animatedValue, setAnimatedValue] = useState(value)
  const [isVisible, setIsVisible] = useState(false)
  // const { getAnimationClass } = useAnimations()

  // Animate value changes
  useEffect(() => {
    if (loading) return
    
    const numericValue = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
    const currentNumeric = parseFloat(String(animatedValue).replace(/[^0-9.-]/g, ''))
    
    if (!isNaN(numericValue) && !isNaN(currentNumeric) && numericValue !== currentNumeric) {
      const duration = 1000 // 1 second animation
      const steps = 30
      const stepValue = (numericValue - currentNumeric) / steps
      let currentStep = 0
      
      const interval = setInterval(() => {
        currentStep++
        const newValue = currentNumeric + (stepValue * currentStep)
        
        if (currentStep >= steps) {
          setAnimatedValue(value)
          clearInterval(interval)
        } else {
          // Preserve original formatting
          const originalStr = String(value)
          const hasCommas = originalStr.includes(',')
          const hasPercent = originalStr.includes('%')
          const hasUnit = originalStr.match(/[a-zA-Z]+$/)
          
          let formattedValue = Math.round(newValue).toString()
          if (hasCommas && newValue >= 1000) {
            formattedValue = newValue.toLocaleString()
          }
          if (hasPercent) formattedValue += '%'
          if (hasUnit) formattedValue += hasUnit[0]
          
          setAnimatedValue(formattedValue)
        }
      }, duration / steps)
      
      return () => clearInterval(interval)
    } else {
      setAnimatedValue(value)
    }
  }, [value, loading])

  // Intersection observer for entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    const element = document.getElementById(`metric-card-${title?.replace(/\s+/g, '-').toLowerCase()}`)
    if (element) {
      observer.observe(element)
    }

    return () => observer.disconnect()
  }, [title])

  // Memoized status configuration to prevent recreation on every render
  const statusConfig = useMemo(() => ({
    normal: {
      border: 'border-gray-200 dark:border-gray-700',
      background: 'bg-white dark:bg-gray-800',
      icon: null,
      iconColor: ''
    },
    warning: {
      border: 'border-yellow-200 dark:border-yellow-700',
      background: 'bg-yellow-50 dark:bg-yellow-900/20',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    critical: {
      border: 'border-red-200 dark:border-red-700',
      background: 'bg-red-50 dark:bg-red-900/20',
      icon: XCircle,
      iconColor: 'text-red-600 dark:text-red-400'
    }
  }), [])

  // Memoized size configuration to prevent recreation on every render
  const sizeConfig = useMemo(() => ({
    compact: {
      container: 'p-4',
      title: 'text-xs',
      value: 'text-lg',
      icon: 'p-2',
      iconSize: 'h-4 w-4',
      sparkline: 'h-8'
    },
    default: {
      container: 'p-6',
      title: 'text-sm',
      value: 'text-3xl',
      icon: 'p-3',
      iconSize: 'h-5 w-5',
      sparkline: 'h-12'
    },
    large: {
      container: 'p-8',
      title: 'text-base',
      value: 'text-4xl',
      icon: 'p-4',
      iconSize: 'h-6 w-6',
      sparkline: 'h-16'
    }
  }), [])

  // Memoized computed values
  const currentStatus = useMemo(() => statusConfig[status] || statusConfig.normal, [statusConfig, status])
  const currentSize = useMemo(() => sizeConfig[size] || sizeConfig.default, [sizeConfig, size])
  const StatusIcon = currentStatus.icon

  // Memoized color classes for icon background
  const colorClasses = useMemo(() => ({
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
  }), [])

  // Memoized trend styling
  const trendColorClasses = useMemo(() => ({
    up: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
    down: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
  }), [])

  // Memoized keyboard event handler
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(e)
    }
  }, [onClick])

  // Loading skeleton
  if (loading) {
    return (
      <SkeletonMetricCard 
        className={clsx(
          'card border rounded-lg',
          currentStatus.border,
          currentStatus.background,
          currentSize.container,
          className
        )}
        {...props}
      />
    )
  }

  // Error state
  if (error) {
    return (
      <div 
        id={`metric-card-${title?.replace(/\s+/g, '-').toLowerCase()}`}
        className={clsx(
          'card border rounded-lg transition-all duration-300',
          'border-red-200 dark:border-red-700',
          'bg-red-50 dark:bg-red-900/20',
          currentSize.container,
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={clsx('font-medium text-gray-600 dark:text-gray-300 mb-1', currentSize.title)}>
              {title}
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">
              {error}
            </p>
            <button 
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
          <div className={clsx('rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400', currentSize.icon)}>
            <XCircle className={currentSize.iconSize} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      id={`metric-card-${title?.replace(/\s+/g, '-').toLowerCase()}`}
      className={clsx(
        'card border rounded-lg transition-all duration-300',
        currentStatus.border,
        currentStatus.background,
        currentSize.container,
        interactive && 'cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-transform duration-200 active:scale-95',
        !interactive && 'hover:shadow-md transition-shadow duration-200',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={clsx('font-medium text-gray-600 dark:text-gray-300 truncate', currentSize.title)}>
              {title}
            </p>
            {StatusIcon && (
              <StatusIcon className={clsx('flex-shrink-0', currentStatus.iconColor, 'h-4 w-4')} />
            )}
          </div>
          
          <p className={clsx(
            'font-bold text-gray-900 dark:text-gray-100 mb-2 transition-all duration-300',
            currentSize.value
          )}>
            {animatedValue}
          </p>
          
          <div className="flex items-center justify-between">
            {trend && (
              <div className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                trendUp ? trendColorClasses.up : trendColorClasses.down
              )}>
                {trendUp ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {trend}
              </div>
            )}
            
            {sparklineData.length > 0 && (
              <div className={clsx('ml-auto', currentSize.sparkline, 'w-20')}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={trendUp ? '#22c55e' : '#ef4444'} 
                      strokeWidth={2}
                      dot={false}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
        
        <div className={clsx(
          'rounded-full flex-shrink-0 ml-4',
          status === 'normal' ? colorClasses.blue : colorClasses[status] || colorClasses.blue,
          currentSize.icon
        )}>
          {React.cloneElement(icon, { 
            className: currentSize.iconSize 
          })}
        </div>
      </div>
    </div>
  )
})

export default MetricCard