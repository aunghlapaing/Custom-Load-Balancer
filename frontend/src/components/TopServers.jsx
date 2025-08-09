import React from 'react'
import { Server, Activity, Clock, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

const getStatusStyles = (status) => {
  const styles = {
    healthy: 'bg-success-100 text-success-800',
    degraded: 'bg-warning-100 text-warning-800',
    unhealthy: 'bg-danger-100 text-danger-800'
  }
  return styles[status] || styles.healthy
}

const getLoadColor = (load) => {
  if (load >= 80) return 'bg-danger-500'
  if (load >= 60) return 'bg-warning-500'
  return 'bg-success-500'
}

const TopServers = ({ servers = [], loading = false }) => {
  // Transform backend server data to component format
  const transformedServers = servers.map(server => ({
    id: server.id,
    name: server.id || 'Unknown Server',
    status: server.healthStatus?.toLowerCase() || 'unknown',
    connections: server.activeConnections || 0,
    responseTime: Math.floor(Math.random() * 50) + 10, // Mock for now
    uptime: '99.9%', // Mock for now
    load: Math.min(100, Math.max(0, (server.activeConnections || 0) * 2)) // Calculate load from connections
  }))

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Backend Servers</h3>
          <p className="text-sm text-gray-500">Performance overview of your servers</p>
        </div>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Manage
        </button>
      </div>

      {transformedServers.length === 0 ? (
        <div className="text-center py-8">
          <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No servers configured</p>
          <p className="text-sm text-gray-400">Add backend servers to see them here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transformedServers.map((server) => (
            <div key={server.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Server className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{server.name}</h4>
                    <span className={clsx(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      getStatusStyles(server.status)
                    )}>
                      {server.status}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Activity className="h-3 w-3" />
                    <span>{server.connections} conn</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="flex items-center space-x-1 text-gray-500 mb-1">
                    <Clock className="h-3 w-3" />
                    <span>Response</span>
                  </div>
                  <span className="font-medium text-gray-900">{server.responseTime}ms</span>
                </div>

                <div>
                  <div className="flex items-center space-x-1 text-gray-500 mb-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>Uptime</span>
                  </div>
                  <span className="font-medium text-gray-900">{server.uptime}</span>
                </div>

                <div>
                  <div className="text-gray-500 mb-1">Load</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={clsx('h-2 rounded-full transition-all duration-300', getLoadColor(server.load))}
                        style={{ width: `${server.load}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">{server.load}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TopServers