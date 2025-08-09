import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

const SimpleMetricCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  status = 'normal',
  loading = false,
  className = '',
  ...props 
}) => {
  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  const statusColors = {
    normal: 'border-gray-200 dark:border-gray-700',
    warning: 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
    critical: 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
  }

  return (
    <div 
      className={`bg-white dark:bg-gray-800 border rounded-lg p-6 transition-all duration-200 hover:shadow-md ${statusColors[status]} ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {value}
          </p>
          {trend && (
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              trendUp 
                ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
                : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
            }`}>
              {trendUp ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trend}
            </div>
          )}
        </div>
        
        {icon && (
          <div className="rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 p-3 ml-4">
            {React.cloneElement(icon, { className: 'h-5 w-5' })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SimpleMetricCard