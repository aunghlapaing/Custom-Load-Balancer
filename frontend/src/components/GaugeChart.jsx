import React, { useMemo } from 'react'
import clsx from 'clsx'

const GaugeChart = ({
  value = 0,
  max = 100,
  min = 0,
  title,
  unit = '%',
  size = 'default', // small, default, large
  color = 'blue',
  showValue = true,
  showLabels = true,
  thresholds = null, // { warning: 70, critical: 90 }
  className,
  ...props
}) => {
  // Calculate the percentage and angle
  const percentage = useMemo(() => {
    const clampedValue = Math.max(min, Math.min(max, value))
    return ((clampedValue - min) / (max - min)) * 100
  }, [value, min, max])

  const angle = useMemo(() => {
    return (percentage / 100) * 180 // Half circle (180 degrees)
  }, [percentage])

  // Size configurations
  const sizeConfig = useMemo(() => ({
    small: {
      container: 'w-24 h-12',
      svg: 'w-24 h-12',
      strokeWidth: 4,
      radius: 40,
      fontSize: 'text-xs',
      titleSize: 'text-xs'
    },
    default: {
      container: 'w-32 h-16',
      svg: 'w-32 h-16',
      strokeWidth: 6,
      radius: 50,
      fontSize: 'text-sm',
      titleSize: 'text-sm'
    },
    large: {
      container: 'w-40 h-20',
      svg: 'w-40 h-20',
      strokeWidth: 8,
      radius: 60,
      fontSize: 'text-base',
      titleSize: 'text-base'
    }
  }), [])

  const currentSize = sizeConfig[size] || sizeConfig.default

  // Color configurations
  const colorConfig = useMemo(() => ({
    blue: {
      background: '#e5f3ff',
      foreground: '#3b82f6',
      text: 'text-blue-600'
    },
    green: {
      background: '#f0fdf4',
      foreground: '#22c55e',
      text: 'text-green-600'
    },
    yellow: {
      background: '#fefce8',
      foreground: '#eab308',
      text: 'text-yellow-600'
    },
    red: {
      background: '#fef2f2',
      foreground: '#ef4444',
      text: 'text-red-600'
    },
    purple: {
      background: '#faf5ff',
      foreground: '#a855f7',
      text: 'text-purple-600'
    }
  }), [])

  // Determine color based on thresholds
  const currentColor = useMemo(() => {
    if (thresholds) {
      if (value >= thresholds.critical) return colorConfig.red
      if (value >= thresholds.warning) return colorConfig.yellow
      return colorConfig.green
    }
    return colorConfig[color] || colorConfig.blue
  }, [value, thresholds, color, colorConfig])

  // SVG path calculations
  const centerX = currentSize.radius + currentSize.strokeWidth
  const centerY = currentSize.radius + currentSize.strokeWidth
  const radius = currentSize.radius

  // Background arc (half circle)
  const backgroundPath = useMemo(() => {
    const startAngle = 180 // Start from left (180 degrees)
    const endAngle = 0 // End at right (0 degrees)
    
    const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180)
    const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180)
    const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
    const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180)
    
    return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`
  }, [centerX, centerY, radius])

  // Foreground arc (progress)
  const foregroundPath = useMemo(() => {
    const startAngle = 180 // Start from left
    const endAngle = 180 - angle // Progress angle
    
    const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180)
    const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180)
    const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
    const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180)
    
    const largeArcFlag = angle > 90 ? 1 : 0
    
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
  }, [centerX, centerY, radius, angle])

  return (
    <div 
      className={clsx('flex flex-col items-center', className)}
      {...props}
    >
      {title && (
        <h4 className={clsx('font-medium text-gray-900 dark:text-gray-100 mb-2', currentSize.titleSize)}>
          {title}
        </h4>
      )}
      
      <div className={clsx('relative', currentSize.container)}>
        <svg
          className={currentSize.svg}
          viewBox={`0 0 ${(currentSize.radius + currentSize.strokeWidth) * 2} ${currentSize.radius + currentSize.strokeWidth + 10}`}
        >
          {/* Background arc */}
          <path
            d={backgroundPath}
            fill="none"
            stroke={currentColor.background}
            strokeWidth={currentSize.strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Foreground arc (progress) */}
          <path
            d={foregroundPath}
            fill="none"
            stroke={currentColor.foreground}
            strokeWidth={currentSize.strokeWidth}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 0.5s ease-in-out'
            }}
          />
          
          {/* Threshold markers */}
          {thresholds && showLabels && (
            <>
              {/* Warning threshold */}
              <line
                x1={centerX + (radius - 5) * Math.cos((180 - (thresholds.warning / max * 180)) * Math.PI / 180)}
                y1={centerY + (radius - 5) * Math.sin((180 - (thresholds.warning / max * 180)) * Math.PI / 180)}
                x2={centerX + (radius + 5) * Math.cos((180 - (thresholds.warning / max * 180)) * Math.PI / 180)}
                y2={centerY + (radius + 5) * Math.sin((180 - (thresholds.warning / max * 180)) * Math.PI / 180)}
                stroke={colorConfig.yellow.foreground}
                strokeWidth={2}
              />
              
              {/* Critical threshold */}
              <line
                x1={centerX + (radius - 5) * Math.cos((180 - (thresholds.critical / max * 180)) * Math.PI / 180)}
                y1={centerY + (radius - 5) * Math.sin((180 - (thresholds.critical / max * 180)) * Math.PI / 180)}
                x2={centerX + (radius + 5) * Math.cos((180 - (thresholds.critical / max * 180)) * Math.PI / 180)}
                y2={centerY + (radius + 5) * Math.sin((180 - (thresholds.critical / max * 180)) * Math.PI / 180)}
                stroke={colorConfig.red.foreground}
                strokeWidth={2}
              />
            </>
          )}
        </svg>
        
        {/* Value display */}
        {showValue && (
          <div className="absolute inset-0 flex items-end justify-center pb-1">
            <div className="text-center">
              <div className={clsx('font-bold', currentColor.text, currentSize.fontSize)}>
                {Math.round(value)}{unit}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between w-full mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      )}
    </div>
  )
}

export default GaugeChart