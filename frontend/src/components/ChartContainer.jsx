import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  ComposedChart
} from 'recharts'
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Settings,
  Info,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import clsx from 'clsx'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

const ChartContainer = ({
  type = 'line', // line, area, bar, pie, gauge, composed
  data = [],
  config = {},
  title,
  description,
  responsive = true,
  interactive = true,
  exportable = true,
  realTime = false,
  refreshInterval = 5000,
  onDataUpdate,
  zoomable = true,
  pannable = true,
  fullscreenEnabled = true,
  loading = false,
  error = null,
  className,
  ariaLabel,
  ariaDescription,
  ...props
}) => {
  const [chartData, setChartData] = useState(data)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(realTime)
  const [zoomDomain, setZoomDomain] = useState(null)
  const [selectedRange, setSelectedRange] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [visibleSeries, setVisibleSeries] = useState({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const chartRef = useRef(null)
  const containerRef = useRef(null)
  const refreshTimeoutRef = useRef(null)

  // Default configuration for different chart types
  const defaultConfigs = {
    line: {
      strokeWidth: 2,
      dot: false,
      activeDot: { r: 4 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      ...config
    },
    area: {
      strokeWidth: 2,
      fillOpacity: 0.3,
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      ...config
    },
    bar: {
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      ...config
    },
    pie: {
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#8b5cf6'],
      innerRadius: 0,
      outerRadius: 80,
      ...config
    },
    composed: {
      strokeWidth: 2,
      dot: false,
      activeDot: { r: 4 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      ...config
    }
  }

  const currentConfig = defaultConfigs[type] || defaultConfigs.line

  // Initialize visible series state
  useEffect(() => {
    if (config.lines || config.areas || config.bars) {
      const series = config.lines || config.areas || config.bars || []
      const initialVisibility = {}
      series.forEach(item => {
        initialVisibility[item.dataKey] = true
      })
      setVisibleSeries(initialVisibility)
    }
  }, [config])

  // Real-time data updates
  useEffect(() => {
    if (!realTime || !isPlaying) return

    const interval = setInterval(() => {
      onDataUpdate?.()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [realTime, isPlaying, refreshInterval, onDataUpdate])

  // Update chart data when prop changes
  useEffect(() => {
    setChartData(data)
  }, [data])

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!fullscreenEnabled) return

    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }, [isFullscreen, fullscreenEnabled])

  // Export functionality
  const exportChart = useCallback((format = 'png') => {
    if (!exportable) return

    const chartElement = chartRef.current
    if (!chartElement) return

    switch (format) {
      case 'png':
        exportToPNG()
        break
      case 'csv':
        exportToCSV()
        break
      case 'pdf':
        exportToPDF()
        break
      default:
        console.warn('Unsupported export format:', format)
    }
  }, [exportable, chartData])

  const exportToPNG = async () => {
    if (!chartRef.current) return

    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        quality: 1.0,
        pixelRatio: 2
      })
      
      const link = document.createElement('a')
      link.download = `chart-${title || 'export'}-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to export PNG:', error)
    }
  }

  const exportToCSV = () => {
    if (!chartData.length) return

    const headers = Object.keys(chartData[0]).join(',')
    const rows = chartData.map(row => Object.values(row).join(','))
    const csv = [headers, ...rows].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chart-data-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportToPDF = async () => {
    if (!chartRef.current) return

    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        quality: 1.0,
        pixelRatio: 2
      })

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm'
      })

      const imgProps = pdf.getImageProperties(dataUrl)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

      if (title) {
        pdf.setFontSize(16)
        pdf.text(title, 14, 15)
        pdf.setFontSize(10)
        pdf.text(new Date().toLocaleString(), 14, 22)
        pdf.addImage(dataUrl, 'PNG', 14, 25, pdfWidth - 28, pdfHeight - 28)
      } else {
        pdf.addImage(dataUrl, 'PNG', 14, 14, pdfWidth - 28, pdfHeight - 28)
      }

      pdf.save(`chart-${title || 'export'}-${Date.now()}.pdf`)
    } catch (error) {
      console.error('Failed to export PDF:', error)
    }
  }

  // Enhanced zoom and pan handlers
  const handleZoomIn = useCallback(() => {
    if (!zoomable) return
    const newZoomLevel = Math.min(zoomLevel * 1.5, 10)
    setZoomLevel(newZoomLevel)
    
    // For line/area/bar charts, implement actual zoom by adjusting domain
    if (type !== 'pie' && chartData.length > 0) {
      const dataLength = chartData.length
      const visiblePoints = Math.max(Math.floor(dataLength / newZoomLevel), 5)
      const startIndex = Math.max(0, dataLength - visiblePoints)
      
      setZoomDomain({
        startIndex,
        endIndex: dataLength - 1
      })
    }
  }, [zoomable, zoomLevel, type, chartData])

  const handleZoomOut = useCallback(() => {
    if (!zoomable) return
    const newZoomLevel = Math.max(zoomLevel / 1.5, 1)
    setZoomLevel(newZoomLevel)
    
    if (newZoomLevel === 1) {
      setZoomDomain(null)
    } else if (type !== 'pie' && chartData.length > 0) {
      const dataLength = chartData.length
      const visiblePoints = Math.max(Math.floor(dataLength / newZoomLevel), 5)
      const startIndex = Math.max(0, dataLength - visiblePoints)
      
      setZoomDomain({
        startIndex,
        endIndex: dataLength - 1
      })
    }
  }, [zoomable, zoomLevel, type, chartData])

  const handleResetZoom = useCallback(() => {
    setZoomDomain(null)
    setSelectedRange(null)
    setZoomLevel(1)
  }, [])

  const togglePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    try {
      await onDataUpdate?.()
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }, [isRefreshing, onDataUpdate])

  // Series visibility toggle
  const toggleSeriesVisibility = useCallback((dataKey) => {
    setVisibleSeries(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }))
  }, [])

  // Enhanced brush change handler for zoom
  const handleBrushChange = useCallback((brushData) => {
    if (!brushData || !zoomable) return
    
    const { startIndex, endIndex } = brushData
    setSelectedRange({ startIndex, endIndex })
    setZoomDomain({ startIndex, endIndex })
  }, [zoomable])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Render different chart types
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey={config.xAxisKey || 'name'} 
              className="text-xs text-gray-600 dark:text-gray-400"
            />
            <YAxis className="text-xs text-gray-600 dark:text-gray-400" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {config.lines?.map((line, index) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={currentConfig.colors[index % currentConfig.colors.length]}
                strokeWidth={currentConfig.strokeWidth}
                dot={currentConfig.dot}
                activeDot={currentConfig.activeDot}
                name={line.name || line.dataKey}
              />
            )) || (
              <Line
                type="monotone"
                dataKey={config.dataKey || 'value'}
                stroke={currentConfig.colors[0]}
                strokeWidth={currentConfig.strokeWidth}
                dot={currentConfig.dot}
                activeDot={currentConfig.activeDot}
              />
            )}
            {zoomable && <Brush dataKey={config.xAxisKey || 'name'} height={30} />}
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey={config.xAxisKey || 'name'} 
              className="text-xs text-gray-600 dark:text-gray-400"
            />
            <YAxis className="text-xs text-gray-600 dark:text-gray-400" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {config.areas?.map((area, index) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                stackId={area.stackId || '1'}
                stroke={currentConfig.colors[index % currentConfig.colors.length]}
                fill={currentConfig.colors[index % currentConfig.colors.length]}
                fillOpacity={currentConfig.fillOpacity}
                name={area.name || area.dataKey}
              />
            )) || (
              <Area
                type="monotone"
                dataKey={config.dataKey || 'value'}
                stroke={currentConfig.colors[0]}
                fill={currentConfig.colors[0]}
                fillOpacity={currentConfig.fillOpacity}
              />
            )}
            {zoomable && <Brush dataKey={config.xAxisKey || 'name'} height={30} />}
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey={config.xAxisKey || 'name'} 
              className="text-xs text-gray-600 dark:text-gray-400"
            />
            <YAxis className="text-xs text-gray-600 dark:text-gray-400" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {config.bars?.map((bar, index) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                fill={currentConfig.colors[index % currentConfig.colors.length]}
                name={bar.name || bar.dataKey}
              />
            )) || (
              <Bar
                dataKey={config.dataKey || 'value'}
                fill={currentConfig.colors[0]}
              />
            )}
          </BarChart>
        )

      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={currentConfig.innerRadius}
              outerRadius={currentConfig.outerRadius}
              paddingAngle={5}
              dataKey={config.dataKey || 'value'}
              nameKey={config.nameKey || 'name'}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={currentConfig.colors[index % currentConfig.colors.length]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        )

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey={config.xAxisKey || 'name'} 
              className="text-xs text-gray-600 dark:text-gray-400"
            />
            <YAxis className="text-xs text-gray-600 dark:text-gray-400" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {config.lines?.map((line, index) => (
              visibleSeries[line.dataKey] !== false && (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={currentConfig.colors[index % currentConfig.colors.length]}
                  strokeWidth={currentConfig.strokeWidth}
                  dot={currentConfig.dot}
                  activeDot={currentConfig.activeDot}
                  name={line.name || line.dataKey}
                />
              )
            ))}
            {config.bars?.map((bar, index) => (
              visibleSeries[bar.dataKey] !== false && (
                <Bar
                  key={bar.dataKey}
                  dataKey={bar.dataKey}
                  fill={currentConfig.colors[(config.lines?.length || 0) + index % currentConfig.colors.length]}
                  name={bar.name || bar.dataKey}
                />
              )
            ))}
            {config.areas?.map((area, index) => (
              visibleSeries[area.dataKey] !== false && (
                <Area
                  key={area.dataKey}
                  type="monotone"
                  dataKey={area.dataKey}
                  stackId={area.stackId || '1'}
                  stroke={currentConfig.colors[(config.lines?.length || 0) + (config.bars?.length || 0) + index % currentConfig.colors.length]}
                  fill={currentConfig.colors[(config.lines?.length || 0) + (config.bars?.length || 0) + index % currentConfig.colors.length]}
                  fillOpacity={currentConfig.fillOpacity || 0.3}
                  name={area.name || area.dataKey}
                />
              )
            ))}
            {zoomable && <Brush dataKey={config.xAxisKey || 'name'} height={30} onChange={handleBrushChange} />}
          </ComposedChart>
        )

      default:
        return <div>Unsupported chart type: {type}</div>
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className={clsx('card p-6', className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={clsx('card p-6 border-red-200 dark:border-red-700', className)}>
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-2">
            <Info className="h-8 w-8 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Chart Error
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={clsx(
        'card transition-all duration-300',
        isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : '',
        className
      )}
      role="img"
      aria-label={ariaLabel || `${type} chart${title ? ` showing ${title}` : ''}`}
      aria-description={ariaDescription || description}
      {...props}
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>

        {/* Chart Controls */}
        <div className="flex items-center space-x-2">
          {onDataUpdate && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={clsx('h-4 w-4', isRefreshing && 'animate-spin')} />
            </button>
          )}

          {realTime && (
            <button
              onClick={togglePlayPause}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={isPlaying ? 'Pause updates' : 'Resume updates'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          )}

          {zoomable && (
            <>
              <button
                onClick={handleZoomIn}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Reset zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </>
          )}

          {exportable && (
            <div className="relative group">
              <button
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Export chart"
              >
                <Download className="h-4 w-4" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <button
                  onClick={() => exportChart('csv')}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => exportChart('png')}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export PNG
                </button>
                <button
                  onClick={() => exportChart('pdf')}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg"
                >
                  Export PDF
                </button>
              </div>
            </div>
          )}

          {fullscreenEnabled && (
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Series Visibility Controls */}
      {(config.lines || config.areas || config.bars) && Object.keys(visibleSeries).length > 1 && (
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {[...(config.lines || []), ...(config.areas || []), ...(config.bars || [])].map((series, index) => (
              <button
                key={series.dataKey}
                onClick={() => toggleSeriesVisibility(series.dataKey)}
                className={clsx(
                  'flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  visibleSeries[series.dataKey] !== false
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                )}
                title={`${visibleSeries[series.dataKey] !== false ? 'Hide' : 'Show'} ${series.name || series.dataKey}`}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: visibleSeries[series.dataKey] !== false 
                      ? currentConfig.colors[index % currentConfig.colors.length]
                      : '#9ca3af'
                  }}
                />
                <span>{series.name || series.dataKey}</span>
                {visibleSeries[series.dataKey] !== false ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart Content */}
      <div className="p-6">
        <div 
          ref={chartRef}
          className={clsx(
            'w-full',
            isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-64 md:h-80 lg:h-96'
          )}
        >
          {responsive ? (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          ) : (
            renderChart()
          )}
        </div>
      </div>

      {/* Chart Footer */}
      {(realTime || chartData.length > 0) && (
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>
              {chartData.length > 0 && (
                <span>{chartData.length} data points</span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {realTime && (
                <div className="flex items-center space-x-2">
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  )} />
                  <span>{isPlaying ? 'Live' : 'Paused'}</span>
                </div>
              )}
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChartContainer