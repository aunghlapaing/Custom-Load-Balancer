import React, { useState, useEffect, useCallback } from 'react'
import ChartContainer from './ChartContainer'
import { metricsApi } from '../services/api'

const TrafficChart = ({ realTime = true, refreshInterval = 5000 }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch real-time traffic data from load balancer
  const fetchTrafficData = useCallback(async () => {
    try {
      setError(null)
      const response = await metricsApi.get()
      const metricsData = response.data.data

      const currentTime = new Date()
      const timeStr = currentTime.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })

      // Calculate traffic metrics from load balancer data
      const totalRequests = metricsData.loadBalancer.totalRequests || 0
      const requestsPerSecond = metricsData.loadBalancer.requestsPerSecond || 0
      const errorRate = metricsData.performance.errorRate || 0
      const activeConnections = metricsData.loadBalancer.activeConnections || 0

      // Calculate current period metrics
      const currentRequests = Math.max(0, Math.round(requestsPerSecond * 60)) // requests per minute
      const currentResponses = Math.round(currentRequests * (1 - errorRate / 100))
      const currentErrors = currentRequests - currentResponses

      setData(prevData => {
        const newPoint = {
          time: timeStr,
          requests: currentRequests,
          responses: currentResponses,
          errors: Math.max(0, currentErrors),
          activeConnections: activeConnections,
          totalRequests: totalRequests
        }

        const updated = [...prevData, newPoint]
        // Keep only last 24 data points (for 24 hours if updated hourly, or last 24 minutes if updated per minute)
        return updated.slice(-24)
      })

      setLoading(false)

    } catch (err) {
      console.error('Failed to fetch traffic data:', err)
      setError(err.message || 'Failed to fetch traffic data')
      setLoading(false)
    }
  }, [])

  // Start real-time updates
  useEffect(() => {
    fetchTrafficData()

    if (!realTime) return

    const interval = setInterval(fetchTrafficData, refreshInterval)
    return () => clearInterval(interval)
  }, [realTime, refreshInterval, fetchTrafficData])

  return (
    <ChartContainer
      type="line"
      data={data}
      title="Traffic Overview"
      description="Real-time request traffic monitoring"
      config={{
        xAxisKey: 'time',
        lines: [
          { dataKey: 'requests', name: 'Requests' }
        ],
        colors: ['#3b82f6'],
        strokeWidth: 2,
        dot: false,
        activeDot: { r: 4 }
      }}
      realTime={realTime}
      refreshInterval={refreshInterval}
      onDataUpdate={fetchTrafficData}
      interactive={true}
      exportable={true}
      zoomable={true}
      pannable={true}
      fullscreenEnabled={true}
      responsive={true}
      ariaLabel="Traffic overview chart showing request traffic over time"
      ariaDescription="Interactive line chart displaying request patterns with real-time updates and historical data"
    />
  )
}

export default TrafficChart