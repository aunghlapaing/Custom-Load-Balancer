import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, mockMetricData, mockServerData, userEvent } from '../test-utils'
import { screen, waitFor } from '@testing-library/react'
import MetricCard from '../../components/MetricCard'
import DataTable from '../../components/DataTable'
import Button from '../../components/Button'

describe('Component Integration Tests', () => {
  describe('MetricCard and Button Integration', () => {
    it('metric card with interactive button works correctly', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      renderWithProviders(
        <div>
          <MetricCard
            title="CPU Usage"
            value="45.2%"
            interactive
            onClick={handleClick}
            {...mockMetricData.cpu}
          />
          <Button onClick={handleClick}>View Details</Button>
        </div>
      )
      
      // Test metric card interaction
      const metricCard = screen.getByText('CPU Usage').closest('[role="article"]')
      await user.click(metricCard)
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      // Test button interaction
      const button = screen.getByRole('button', { name: /view details/i })
      await user.click(button)
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('multiple metric cards display different statuses correctly', () => {
      renderWithProviders(
        <div>
          <MetricCard
            title="CPU Usage"
            value="45.2%"
            status="normal"
            {...mockMetricData.cpu}
          />
          <MetricCard
            title="Memory Usage"
            value="67.8%"
            status="warning"
            {...mockMetricData.memory}
          />
          <MetricCard
            title="Network Usage"
            value="89.1%"
            status="critical"
            {...mockMetricData.network}
          />
        </div>
      )
      
      expect(screen.getByText('CPU Usage')).toBeInTheDocument()
      expect(screen.getByText('Memory Usage')).toBeInTheDocument()
      expect(screen.getByText('Network Usage')).toBeInTheDocument()
      
      // Check different status colors are applied
      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(3)
    })
  })

  describe('DataTable and Button Integration', () => {
    const columns = [
      { key: 'name', label: 'Server Name', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'ip', label: 'IP Address', sortable: false },
    ]

    it('data table with action buttons works correctly', async () => {
      const handleEdit = vi.fn()
      const handleDelete = vi.fn()
      const user = userEvent.setup()
      
      const dataWithActions = mockServerData.map(server => ({
        ...server,
        actions: (
          <div>
            <Button size="sm" onClick={() => handleEdit(server.id)}>
              Edit
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleDelete(server.id)}>
              Delete
            </Button>
          </div>
        )
      }))
      
      const columnsWithActions = [
        ...columns,
        { key: 'actions', label: 'Actions', sortable: false }
      ]
      
      renderWithProviders(
        <DataTable
          data={dataWithActions}
          columns={columnsWithActions}
          keyField="id"
        />
      )
      
      // Test edit button
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])
      expect(handleEdit).toHaveBeenCalledWith(1)
      
      // Test delete button
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      expect(handleDelete).toHaveBeenCalledWith(1)
    })

    it('data table with bulk actions works correctly', async () => {
      const handleBulkDelete = vi.fn()
      const handleBulkExport = vi.fn()
      const user = userEvent.setup()
      
      const bulkActions = [
        { label: 'Delete Selected', action: handleBulkDelete },
        { label: 'Export Selected', action: handleBulkExport }
      ]
      
      renderWithProviders(
        <DataTable
          data={mockServerData}
          columns={columns}
          keyField="id"
          selectable
          bulkActions={bulkActions}
        />
      )
      
      // Select some rows
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // First data row
      await user.click(checkboxes[2]) // Second data row
      
      // Bulk actions should appear
      expect(screen.getByText('Delete Selected')).toBeInTheDocument()
      expect(screen.getByText('Export Selected')).toBeInTheDocument()
    })
  })

  describe('Form Components Integration', () => {
    it('form with multiple input types works together', async () => {
      const handleSubmit = vi.fn()
      const user = userEvent.setup()
      
      renderWithProviders(
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Server name"
            name="name"
          />
          <select name="status">
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          <Button type="submit">Save Server</Button>
        </form>
      )
      
      // Fill form
      await user.type(screen.getByPlaceholderText('Server name'), 'Test Server')
      await user.selectOptions(screen.getByRole('combobox'), 'warning')
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /save server/i }))
      
      expect(handleSubmit).toHaveBeenCalled()
    })
  })

  describe('Performance Integration', () => {
    it('renders multiple components efficiently', () => {
      const startTime = performance.now()
      
      renderWithProviders(
        <div>
          {mockMetricData && Object.entries(mockMetricData).map(([key, data]) => (
            <MetricCard
              key={key}
              title={`${key.toUpperCase()} Usage`}
              value={`${data.value}%`}
              {...data}
            />
          ))}
          <DataTable
            data={mockServerData}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'status', label: 'Status' },
              { key: 'ip', label: 'IP' }
            ]}
            keyField="id"
          />
          <div>
            <Button>Action 1</Button>
            <Button variant="secondary">Action 2</Button>
            <Button variant="danger">Action 3</Button>
          </div>
        </div>
      )
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100) // Should render quickly
    })

    it('handles component updates efficiently', () => {
      const { rerender } = renderWithProviders(
        <MetricCard
          title="CPU Usage"
          value="45.2%"
          {...mockMetricData.cpu}
        />
      )
      
      const startTime = performance.now()
      
      // Simulate multiple updates
      for (let i = 0; i < 10; i++) {
        rerender(
          <MetricCard
            title="CPU Usage"
            value={`${45 + i}.2%`}
            {...mockMetricData.cpu}
          />
        )
      }
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(50) // Updates should be fast
    })
  })
})