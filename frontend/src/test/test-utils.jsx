import React from 'react'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '../contexts/ThemeContext'
import { ConnectionProvider } from '../contexts/ConnectionContext'

// Custom render function with providers
export function renderWithProviders(ui, options = {}) {
  const {
    initialTheme = 'light',
    initialConnection = { status: 'connected', quality: 'good' },
    ...renderOptions
  } = options

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <ThemeProvider initialTheme={initialTheme}>
          <ConnectionProvider initialConnection={initialConnection}>
            {children}
          </ConnectionProvider>
        </ThemeProvider>
      </BrowserRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock data generators
export const mockMetricData = {
  cpu: {
    value: 45.2,
    trend: 'up',
    sparklineData: [40, 42, 38, 45, 47, 45, 45.2],
    status: 'normal'
  },
  memory: {
    value: 67.8,
    trend: 'stable',
    sparklineData: [65, 66, 68, 67, 68, 67, 67.8],
    status: 'warning'
  },
  network: {
    value: 89.1,
    trend: 'down',
    sparklineData: [95, 92, 90, 89, 88, 89, 89.1],
    status: 'critical'
  }
}

export const mockServerData = [
  {
    id: 1,
    name: 'Server 1',
    ip: '192.168.1.10',
    port: 8080,
    status: 'healthy',
    responseTime: 45,
    uptime: '99.9%',
    load: 23.5
  },
  {
    id: 2,
    name: 'Server 2',
    ip: '192.168.1.11',
    port: 8080,
    status: 'warning',
    responseTime: 120,
    uptime: '98.5%',
    load: 78.2
  },
  {
    id: 3,
    name: 'Server 3',
    ip: '192.168.1.12',
    port: 8080,
    status: 'error',
    responseTime: 0,
    uptime: '0%',
    load: 0
  }
]

export const mockChartData = [
  { time: '00:00', requests: 120, errors: 2 },
  { time: '01:00', requests: 98, errors: 1 },
  { time: '02:00', requests: 86, errors: 0 },
  { time: '03:00', requests: 99, errors: 3 },
  { time: '04:00', requests: 145, errors: 1 },
  { time: '05:00', requests: 167, errors: 2 },
]

// Performance testing utilities
export const measureRenderTime = (renderFn) => {
  const start = performance.now()
  const result = renderFn()
  const end = performance.now()
  return {
    result,
    renderTime: end - start
  }
}

// Accessibility testing utilities
export const checkAccessibility = async (container) => {
  const { axe } = await import('@axe-core/react')
  const results = await axe(container)
  return results
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'