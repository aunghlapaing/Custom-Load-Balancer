import React, { useState, useEffect } from 'react'
import ChartContainer from './ChartContainer'

const ServerHealthChart = ({ servers = [], loading = false, realTime = true }) => {
  const [chartData, setChartData] = useState([])

  // Calculate health distribution from real server data
  useEffect(() => {
    const healthCounts = servers.reduce((acc, server) => {
      const status = server.healthStatus || 'UNKNOWN'
      switch (status) {
        case 'HEALTHY':
          acc.healthy += 1
          break
        case 'DEGRADED':
          acc.degraded += 1
          break
        case 'UNHEALTHY':
          acc.unhealthy += 1
          break
        default:
          acc.unknown += 1
      }
      return acc
    }, { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 })

    const data = [
      { name: 'Healthy', value: healthCounts.healthy },
      { name: 'Degraded', value: healthCounts.degraded },
      { name: 'Unhealthy', value: healthCounts.unhealthy },
      { name: 'Unknown', value: healthCounts.unknown },
    ].filter(item => item.value > 0) // Only show categories with servers

    setChartData(data)
  }, [servers])

  // Simulate real-time updates for demo purposes
  const updateData = () => {
    if (servers.length === 0) return
    
    // In a real app, this would fetch fresh server data
    // For demo, we'll just trigger a re-calculation
    const healthCounts = servers.reduce((acc, server) => {
      const status = server.healthStatus || 'UNKNOWN'
      switch (status) {
        case 'HEALTHY':
          acc.healthy += 1
          break
        case 'DEGRADED':
          acc.degraded += 1
          break
        case 'UNHEALTHY':
          acc.unhealthy += 1
          break
        default:
          acc.unknown += 1
      }
      return acc
    }, { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 })

    const data = [
      { name: 'Healthy', value: healthCounts.healthy },
      { name: 'Degraded', value: healthCounts.degraded },
      { name: 'Unhealthy', value: healthCounts.unhealthy },
      { name: 'Unknown', value: healthCounts.unknown },
    ].filter(item => item.value > 0)

    setChartData(data)
  }

  if (loading) {
    return (
      <ChartContainer
        type="pie"
        data={[]}
        title="Server Health Status"
        description="Current status of all backend servers"
        loading={true}
      />
    )
  }

  if (chartData.length === 0) {
    return (
      <ChartContainer
        type="pie"
        data={[]}
        title="Server Health Status"
        description="Current status of all backend servers"
        error="No servers available. Add backend servers to see health status."
      />
    )
  }

  return (
    <ChartContainer
      type="pie"
      data={chartData}
      title="Server Health Status"
      description="Current status of all backend servers"
      config={{
        dataKey: 'value',
        nameKey: 'name',
        colors: ['#22c55e', '#f59e0b', '#ef4444', '#6b7280'],
        innerRadius: 0,
        outerRadius: 80
      }}
      realTime={realTime}
      refreshInterval={10000}
      onDataUpdate={updateData}
      interactive={true}
      exportable={true}
      zoomable={false}
      pannable={false}
      fullscreenEnabled={true}
      responsive={true}
      ariaLabel="Server health status pie chart"
      ariaDescription="Pie chart showing the distribution of server health statuses: healthy, degraded, unhealthy, and unknown servers"
    />
  )
}

export default ServerHealthChart