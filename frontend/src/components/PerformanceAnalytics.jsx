import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Clock,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import ChartContainer from './ChartContainer'
import MetricCard from './SimpleMetricCard'
import ResponsiveGrid from './ResponsiveGrid'
import { metricsApi } from '../services/api'

const PerformanceAnalytics = ({ 
  timeRange = '24h',
  realTime = true,
  refreshInterval = 10000,
  showPredictions = true 
}) => {
  const [performanceData, setPerformanceData] = useState({
    responseTime: {
      current: 0,
      average: 0,
      p95: 0,
      p99: 0,
      trend: []
    },
    throughput: {
      current: 0,
      peak: 0,
      average: 0,
      trend: []
    },
    errorRate: {
      current: 0,
      total: 0,
      trend: []
    },
    availability: {
      current: 99.9,
      sla: 99.5,
      uptime: 0,
      incidents: []
    }
  })

  const [analyticsData, setAnalyticsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)
  const [selectedMetric, setSelectedMetric] = useState('all')

  // Fetch real-time performance analytics data from load balancer
  const fetchPerformanceData = useCallback(async () => {
    try {
      setError(null)
      const response = await metricsApi.get()
      const data = response.data.data
      
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })

      // Transform API data to component format
      const responseTime = Math.round(data.loadBalancer.averageResponseTime)
      const throughput = Math.round(data.loadBalancer.requestsPerSecond)
      const errorRate = data.performance.errorRate
      const availability = data.servers.total > 0 ? 
        Math.round((data.servers.healthy / data.servers.total) * 100 * 10) / 10 : 0

      const newMetrics = {
        responseTime: {
          current: responseTime,
          average: responseTime,
          p95: Math.round(data.performance.p95ResponseTime),
          p99: Math.round(data.performance.p99ResponseTime),
          trend: []
        },
        throughput: {
          current: throughput,
          peak: Math.round(throughput * 1.5),
          average: Math.round(throughput * 0.8),
          trend: []
        },
        errorRate: {
          current: Math.round(errorRate * 100) / 100,
          total: Math.round(errorRate * throughput / 100),
          trend: []
        },
        availability: {
          current: Math.round(availability * 100) / 100,
          sla: 99.5,
          uptime: Math.floor(Date.now() / 1000) - data.system.uptime,
          incidents: []
        }
      }

      setPerformanceData(newMetrics)

      // Update analytics data for charts
      setAnalyticsData(prev => {
        const newPoint = {
          time: timeStr,
          timestamp: now.getTime(),
          responseTime: responseTime,
          throughput: throughput,
          errorRate: errorRate,
          availability: availability,
          p95ResponseTime: Math.round(data.performance.p95ResponseTime),
          p99ResponseTime: Math.round(data.performance.p99ResponseTime),
          successRate: 100 - errorRate,
          activeUsers: data.loadBalancer.activeConnections,
          memoryUsage: data.system.memory.usage,
          cpuUsage: data.system.cpu.usage
        }

        const updated = [...prev, newPoint]
        // Keep data based on time range
        const maxPoints = selectedTimeRange === '1h' ? 60 : selectedTimeRange === '24h' ? 144 : 720
        return updated.slice(-maxPoints)
      })
      
    } catch (err) {
      console.error('Failed to fetch performance data:', err)
      setError(err.message || 'Failed to fetch performance data')
    }
  }, [selectedTimeRange])

  // Initial data fetch and real-time updates
  useEffect(() => {
    fetchPerformanceData()
    setLoading(false)

    if (!realTime) return

    const interval = setInterval(fetchPerformanceData, refreshInterval)
    return () => clearInterval(interval)
  }, [realTime, refreshInterval, fetchPerformanceData])

  // Memoized performance insights
  const performanceInsights = useMemo(() => {
    if (analyticsData.length < 2) return []

    const insights = []
    const latest = analyticsData[analyticsData.length - 1]
    const previous = analyticsData[analyticsData.length - 2]

    // Response time insights
    if (latest.responseTime > previous.responseTime * 1.2) {
      insights.push({
        type: 'warning',
        title: 'Response Time Spike',
        message: `Response time increased by ${Math.round((latest.responseTime - previous.responseTime) / previous.responseTime * 100)}%`,
        metric: 'responseTime',
        severity: latest.responseTime > 500 ? 'high' : 'medium'
      })
    }

    // Throughput insights
    if (latest.throughput < previous.throughput * 0.8) {
      insights.push({
        type: 'warning',
        title: 'Throughput Drop',
        message: `Throughput decreased by ${Math.round((previous.throughput - latest.throughput) / previous.throughput * 100)}%`,
        metric: 'throughput',
        severity: 'medium'
      })
    }

    // Error rate insights
    if (latest.errorRate > 2) {
      insights.push({
        type: 'critical',
        title: 'High Error Rate',
        message: `Error rate is ${latest.errorRate.toFixed(2)}%, above normal threshold`,
        metric: 'errorRate',
        severity: 'high'
      })
    }

    // Performance trend insights
    if (analyticsData.length >= 10) {
      const recentAvg = analyticsData.slice(-5).reduce((sum, d) => sum + d.responseTime, 0) / 5
      const olderAvg = analyticsData.slice(-10, -5).reduce((sum, d) => sum + d.responseTime, 0) / 5
      
      if (recentAvg > olderAvg * 1.15) {
        insights.push({
          type: 'info',
          title: 'Performance Degradation Trend',
          message: `Response times trending upward over recent period`,
          metric: 'trend',
          severity: 'low'
        })
      }
    }

    return insights
  }, [analyticsData])

  // Memoized SLA calculations
  const slaMetrics = useMemo(() => {
    if (analyticsData.length === 0) return null

    const totalRequests = analyticsData.reduce((sum, d) => sum + d.throughput, 0)
    const totalErrors = analyticsData.reduce((sum, d) => sum + (d.throughput * d.errorRate / 100), 0)
    const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests * 100) : 100

    const avgResponseTime = analyticsData.reduce((sum, d) => sum + d.responseTime, 0) / analyticsData.length
    const p95ResponseTime = analyticsData.reduce((sum, d) => sum + d.p95ResponseTime, 0) / analyticsData.length
    const p99ResponseTime = analyticsData.reduce((sum, d) => sum + d.p99ResponseTime, 0) / analyticsData.length

    return {
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      p99ResponseTime: Math.round(p99ResponseTime),
      totalRequests: Math.round(totalRequests),
      totalErrors: Math.round(totalErrors)
    }
  }, [analyticsData])

  const formatUptime = useCallback((seconds) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }, [])

  const timeRangeOptions = [
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' }
  ]

  const metricOptions = [
    { value: 'all', label: 'All Metrics' },
    { value: 'responseTime', label: 'Response Time' },
    { value: 'throughput', label: 'Throughput' },
    { value: 'errorRate', label: 'Error Rate' },
    { value: 'availability', label: 'Availability' }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Performance Analytics
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time performance monitoring and insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Metric Filter */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {metricOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {realTime && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Performance Insights */}
      {performanceInsights.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Performance Insights
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {performanceInsights.map((insight, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    insight.type === 'critical' ? 'bg-red-100 dark:bg-red-900/40' :
                    insight.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/40' :
                    'bg-blue-100 dark:bg-blue-900/40'
                  }`}>
                    {insight.type === 'critical' ? (
                      <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                    ) : insight.type === 'warning' ? (
                      <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                    ) : (
                      <CheckCircle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {insight.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {insight.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Performance Metrics */}
      <ResponsiveGrid
        cols={{ mobile: 1, tablet: 2, desktop: 4 }}
        gap={4}
        className="transition-all duration-300"
      >
        <MetricCard
          title="Avg Response Time"
          value={`${performanceData.responseTime.current}ms`}
          icon={<Clock className="h-5 w-5" />}
          trend={analyticsData.length > 1 ? 
            `${analyticsData[analyticsData.length - 1].responseTime > analyticsData[analyticsData.length - 2].responseTime ? '+' : ''}${(analyticsData[analyticsData.length - 1].responseTime - analyticsData[analyticsData.length - 2].responseTime).toFixed(0)}ms` 
            : null}
          trendUp={analyticsData.length > 1 ? analyticsData[analyticsData.length - 1].responseTime < analyticsData[analyticsData.length - 2].responseTime : true}
          status={performanceData.responseTime.current > 500 ? 'critical' : performanceData.responseTime.current > 200 ? 'warning' : 'normal'}
          loading={loading}
          sparklineData={analyticsData.map(d => ({ value: d.responseTime }))}
          interactive={true}
        />

        <MetricCard
          title="Throughput"
          value={`${performanceData.throughput.current.toLocaleString()}/s`}
          icon={<Zap className="h-5 w-5" />}
          trend={`Peak: ${performanceData.throughput.peak.toLocaleString()}/s`}
          trendUp={true}
          status="normal"
          loading={loading}
          sparklineData={analyticsData.map(d => ({ value: d.throughput }))}
          interactive={true}
        />

        <MetricCard
          title="Error Rate"
          value={`${performanceData.errorRate.current}%`}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={`${performanceData.errorRate.total} errors`}
          trendUp={false}
          status={performanceData.errorRate.current > 2 ? 'critical' : performanceData.errorRate.current > 1 ? 'warning' : 'normal'}
          loading={loading}
          sparklineData={analyticsData.map(d => ({ value: d.errorRate }))}
          interactive={true}
        />

        <MetricCard
          title="Availability"
          value={`${performanceData.availability.current}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          trend={`SLA: ${performanceData.availability.sla}%`}
          trendUp={performanceData.availability.current >= performanceData.availability.sla}
          status={performanceData.availability.current >= performanceData.availability.sla ? 'normal' : 'warning'}
          loading={loading}
          sparklineData={analyticsData.map(d => ({ value: d.availability }))}
          interactive={true}
        />
      </ResponsiveGrid>

      {/* Performance Charts */}
      {analyticsData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Time Analysis */}
          <ChartContainer
            type="composed"
            data={analyticsData}
            title="Response Time Analysis"
            description="Response time percentiles and trends"
            config={{
              xAxisKey: 'time',
              lines: [
                { dataKey: 'responseTime', name: 'Average' },
                { dataKey: 'p95ResponseTime', name: '95th Percentile' },
                { dataKey: 'p99ResponseTime', name: '99th Percentile' }
              ],
              colors: ['#3b82f6', '#f59e0b', '#ef4444']
            }}
            realTime={realTime}
            refreshInterval={refreshInterval}
            onDataUpdate={fetchPerformanceData}
            interactive={true}
            exportable={true}
            zoomable={true}
            responsive={true}
          />

          {/* Throughput & Error Rate */}
          <ChartContainer
            type="composed"
            data={analyticsData}
            title="Throughput & Error Rate"
            description="Request throughput and error rate correlation"
            config={{
              xAxisKey: 'time',
              bars: [
                { dataKey: 'throughput', name: 'Throughput (req/s)' }
              ],
              lines: [
                { dataKey: 'errorRate', name: 'Error Rate (%)' }
              ],
              colors: ['#10b981', '#ef4444']
            }}
            realTime={realTime}
            refreshInterval={refreshInterval}
            onDataUpdate={fetchPerformanceData}
            interactive={true}
            exportable={true}
            zoomable={true}
            responsive={true}
          />

          {/* System Resource Correlation */}
          <ChartContainer
            type="area"
            data={analyticsData}
            title="Resource Usage Impact"
            description="CPU and memory usage correlation with performance"
            config={{
              xAxisKey: 'time',
              areas: [
                { dataKey: 'cpuUsage', name: 'CPU Usage (%)', stackId: '1' },
                { dataKey: 'memoryUsage', name: 'Memory Usage (%)', stackId: '1' }
              ],
              colors: ['#8b5cf6', '#06b6d4'],
              fillOpacity: 0.4
            }}
            realTime={realTime}
            refreshInterval={refreshInterval}
            onDataUpdate={fetchPerformanceData}
            interactive={true}
            exportable={true}
            zoomable={true}
            responsive={true}
          />

          {/* SLA Dashboard */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  SLA Dashboard
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Service level agreement metrics and compliance
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${performanceData.availability.current >= performanceData.availability.sla ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>

            {slaMetrics && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {slaMetrics.successRate}%
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Target: 99.5%
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Response</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {slaMetrics.avgResponseTime}ms
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Target: &lt;200ms
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">95th Percentile</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {slaMetrics.p95ResponseTime}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">99th Percentile</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {slaMetrics.p99ResponseTime}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Requests</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {slaMetrics.totalRequests.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Errors</span>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {slaMetrics.totalErrors.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">System Uptime</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {formatUptime(Date.now() / 1000 - performanceData.availability.uptime)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceAnalytics