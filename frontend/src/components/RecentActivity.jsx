import React from 'react'
import { CheckCircle, AlertTriangle, Info, XCircle, Clock } from 'lucide-react'
import clsx from 'clsx'

const activities = [
  {
    id: 1,
    type: 'success',
    message: 'Server web-01 health check passed',
    timestamp: '2 minutes ago',
    icon: CheckCircle
  },
  {
    id: 2,
    type: 'warning',
    message: 'High response time detected on api-03 (45ms)',
    timestamp: '5 minutes ago',
    icon: AlertTriangle
  },
  {
    id: 3,
    type: 'info',
    message: 'Load balancing algorithm switched to least connections',
    timestamp: '12 minutes ago',
    icon: Info
  },
  {
    id: 4,
    type: 'error',
    message: 'Server db-02 failed health check - marked unhealthy',
    timestamp: '18 minutes ago',
    icon: XCircle
  },
  {
    id: 5,
    type: 'success',
    message: 'SSL certificate renewed for *.example.com',
    timestamp: '1 hour ago',
    icon: CheckCircle
  },
  {
    id: 6,
    type: 'info',
    message: 'New server api-04 added to backend pool',
    timestamp: '2 hours ago',
    icon: Info
  }
]

const getActivityStyles = (type) => {
  const styles = {
    success: {
      bg: 'bg-success-50',
      text: 'text-success-700',
      icon: 'text-success-500'
    },
    warning: {
      bg: 'bg-warning-50',
      text: 'text-warning-700',
      icon: 'text-warning-500'
    },
    error: {
      bg: 'bg-danger-50',
      text: 'text-danger-700',
      icon: 'text-danger-500'
    },
    info: {
      bg: 'bg-primary-50',
      text: 'text-primary-700',
      icon: 'text-primary-500'
    }
  }
  return styles[type] || styles.info
}

const RecentActivity = () => {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-500">Latest system events and notifications</p>
        </div>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View all
        </button>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity) => {
          const styles = getActivityStyles(activity.type)
          const IconComponent = activity.icon
          
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={clsx('p-2 rounded-full', styles.bg)}>
                <IconComponent className={clsx('h-4 w-4', styles.icon)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-medium', styles.text)}>
                  {activity.message}
                </p>
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {activity.timestamp}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RecentActivity