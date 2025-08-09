import { test, expect } from '@playwright/test'

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads dashboard successfully', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Load Balancer Dashboard')
    await expect(page.locator('[data-testid="metrics-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="charts-section"]')).toBeVisible()
  })

  test('displays metric cards with data', async ({ page }) => {
    await expect(page.locator('[data-testid="cpu-metric-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="memory-metric-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="network-metric-card"]')).toBeVisible()
    
    // Check that metric values are displayed
    await expect(page.locator('[data-testid="cpu-metric-card"] .metric-value')).not.toBeEmpty()
  })

  test('navigates between pages', async ({ page }) => {
    // Navigate to servers page
    await page.click('nav a[href="/servers"]')
    await expect(page.locator('h1')).toContainText('Server Management')
    
    // Navigate to analytics page
    await page.click('nav a[href="/analytics"]')
    await expect(page.locator('h1')).toContainText('Analytics')
    
    // Navigate back to dashboard
    await page.click('nav a[href="/"]')
    await expect(page.locator('h1')).toContainText('Load Balancer Dashboard')
  })

  test('responsive design works correctly', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 })
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    await expect(page.locator('[data-testid="metrics-grid"]')).toHaveClass(/grid-cols-3/)
    
    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('[data-testid="sidebar"]')).toHaveClass(/collapsed/)
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="metrics-grid"]')).toHaveClass(/grid-cols-1/)
  })

  test('theme toggle works', async ({ page }) => {
    // Check initial theme (should be light)
    await expect(page.locator('html')).not.toHaveClass('dark')
    
    // Toggle to dark theme
    await page.click('[data-testid="theme-toggle"]')
    await expect(page.locator('html')).toHaveClass('dark')
    
    // Toggle back to light theme
    await page.click('[data-testid="theme-toggle"]')
    await expect(page.locator('html')).not.toHaveClass('dark')
  })

  test('search functionality works', async ({ page }) => {
    await page.goto('/servers')
    
    // Type in search box
    await page.fill('[data-testid="search-input"]', 'Server 1')
    
    // Check that only matching results are shown
    await expect(page.locator('[data-testid="server-row"]')).toHaveCount(1)
    await expect(page.locator('text=Server 1')).toBeVisible()
    await expect(page.locator('text=Server 2')).not.toBeVisible()
    
    // Clear search
    await page.fill('[data-testid="search-input"]', '')
    await expect(page.locator('[data-testid="server-row"]')).toHaveCount(3)
  })

  test('data table interactions work', async ({ page }) => {
    await page.goto('/servers')
    
    // Test sorting
    await page.click('th:has-text("Server Name")')
    await expect(page.locator('[data-testid="sort-indicator"]')).toBeVisible()
    
    // Test row selection
    await page.check('[data-testid="row-checkbox-1"]')
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible()
    
    // Test select all
    await page.check('[data-testid="select-all-checkbox"]')
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('3 selected')
  })

  test('error handling displays correctly', async ({ page }) => {
    // Mock API error
    await page.route('**/api/metrics', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    })
    
    await page.reload()
    
    // Check error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=Error loading metrics')).toBeVisible()
    
    // Check retry button works
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })

  test('loading states are shown', async ({ page }) => {
    // Slow down API responses to see loading states
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 1000)
    })
    
    await page.reload()
    
    // Check loading skeletons are shown
    await expect(page.locator('[data-testid="skeleton-loader"]')).toBeVisible()
    
    // Wait for content to load
    await expect(page.locator('[data-testid="skeleton-loader"]')).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="metrics-section"]')).toBeVisible()
  })
})

test.describe('Accessibility E2E Tests', () => {
  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/')
    
    // Tab through navigation
    await page.keyboard.press('Tab')
    await expect(page.locator('nav a:first-child')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('nav a:nth-child(2)')).toBeFocused()
    
    // Enter should activate links
    await page.keyboard.press('Enter')
    await expect(page.url()).toContain('/servers')
  })

  test('screen reader announcements work', async ({ page }) => {
    await page.goto('/')
    
    // Check ARIA labels and live regions
    await expect(page.locator('[aria-live="polite"]')).toBeAttached()
    await expect(page.locator('[role="main"]')).toBeAttached()
    await expect(page.locator('[role="navigation"]')).toBeAttached()
  })

  test('focus management works correctly', async ({ page }) => {
    await page.goto('/')
    
    // Open modal
    await page.click('[data-testid="cpu-metric-card"]')
    await expect(page.locator('[data-testid="metric-detail-modal"]')).toBeVisible()
    
    // Focus should be trapped in modal
    await page.keyboard.press('Tab')
    const focusedElement = await page.locator(':focus')
    const modalElement = await page.locator('[data-testid="metric-detail-modal"]')
    
    // Focused element should be within modal
    expect(await modalElement.locator(':focus').count()).toBeGreaterThan(0)
    
    // Close modal with Escape
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="metric-detail-modal"]')).not.toBeVisible()
  })
})

test.describe('Performance E2E Tests', () => {
  test('page loads within performance budget', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // Should load in under 3 seconds
  })

  test('handles large datasets efficiently', async ({ page }) => {
    // Mock large dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      name: `Server ${i + 1}`,
      ip: `192.168.1.${i % 255}`,
      status: 'healthy'
    }))
    
    await page.route('**/api/servers', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset)
      })
    })
    
    await page.goto('/servers')
    
    // Should still be responsive with large dataset
    const startTime = Date.now()
    await page.fill('[data-testid="search-input"]', 'Server 1')
    const searchTime = Date.now() - startTime
    
    expect(searchTime).toBeLessThan(500) // Search should be fast even with large dataset
  })
})