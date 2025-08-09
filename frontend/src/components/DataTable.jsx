import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { cn } from '../lib/design-system.js'
// useVirtualScrolling hook removed - using standard scrolling for simplicity
// Simple utility functions (performance library removed)
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

const throttle = (func, limit) => {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  Check,
  X,
  ArrowUpDown,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'

/**
 * Advanced DataTable Component
 * 
 * Features:
 * - Virtual scrolling for large datasets
 * - Column sorting and filtering
 * - Row selection and bulk actions
 * - Responsive column hiding
 * - Data export functionality
 * - Search functionality
 * - Loading states
 * - Pagination support
 * - Customizable cell renderers
 */

const DataTable = React.memo(({
  // Data
  data = [],
  columns = [],
  
  // Features
  sortable = true,
  filterable = true,
  searchable = true,
  selectable = false,
  pagination = true,
  virtualScrolling = false,
  
  // Pagination
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  
  // Selection
  selectedRows = [],
  onSelectionChange,
  
  // Actions
  actions = [],
  bulkActions = [],
  
  // Export
  exportable = false,
  exportFormats = ['csv', 'json'],
  
  // Styling
  size = 'md',
  variant = 'default',
  
  // Loading
  loading = false,
  
  // Responsive
  responsiveBreakpoint = 'md',
  
  // Callbacks
  onSort,
  onFilter,
  onSearch,
  onRefresh,
  
  // Additional props
  className,
  tableClassName,
  headerClassName,
  bodyClassName,
  
  ...rest
}) => {
  // State management
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [filters, setFilters] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [hiddenColumns, setHiddenColumns] = useState(new Set())
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  
  // Refs
  const tableRef = useRef(null)
  const virtualScrollRef = useRef(null)
  
  // Virtual scrolling state
  const [virtualStart, setVirtualStart] = useState(0)
  const [virtualEnd, setVirtualEnd] = useState(pageSize)
  const rowHeight = size === 'sm' ? 40 : size === 'lg' ? 60 : 50
  
  // Process data with sorting, filtering, and searching
  const processedData = useMemo(() => {
    let result = [...data]
    
    // Apply search
    if (searchQuery && searchable) {
      const query = searchQuery.toLowerCase()
      result = result.filter(row =>
        columns.some(column => {
          const value = row[column.key]
          return value && value.toString().toLowerCase().includes(query)
        })
      )
    }
    
    // Apply filters
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue) {
        result = result.filter(row => {
          const value = row[key]
          if (typeof filterValue === 'string') {
            return value && value.toString().toLowerCase().includes(filterValue.toLowerCase())
          }
          return value === filterValue
        })
      }
    })
    
    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    
    return result
  }, [data, searchQuery, filters, sortConfig, columns, searchable])
  
  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize)
  const paginatedData = pagination 
    ? processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : processedData
  
  // Virtual scrolling data
  const virtualData = virtualScrolling 
    ? processedData.slice(virtualStart, virtualEnd)
    : paginatedData
  
  // Visible columns
  const visibleColumns = columns.filter(column => !hiddenColumns.has(column.key))
  
  // Handle sorting
  const handleSort = useCallback((columnKey) => {
    if (!sortable) return
    
    const newDirection = 
      sortConfig.key === columnKey && sortConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc'
    
    const newSortConfig = { key: columnKey, direction: newDirection }
    setSortConfig(newSortConfig)
    onSort?.(newSortConfig)
  }, [sortConfig, sortable, onSort])
  
  // Handle filtering
  const handleFilter = useCallback((columnKey, value) => {
    const newFilters = { ...filters, [columnKey]: value }
    setFilters(newFilters)
    onFilter?.(newFilters)
  }, [filters, onFilter])
  
  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    onSearch?.(query)
  }, [onSearch])
  
  // Handle column visibility
  const toggleColumnVisibility = useCallback((columnKey) => {
    const newHiddenColumns = new Set(hiddenColumns)
    if (newHiddenColumns.has(columnKey)) {
      newHiddenColumns.delete(columnKey)
    } else {
      newHiddenColumns.add(columnKey)
    }
    setHiddenColumns(newHiddenColumns)
  }, [hiddenColumns])
  
  // Handle row selection
  const handleRowSelection = useCallback((rowId, selected) => {
    if (!selectable) return
    
    const newSelection = selected
      ? [...selectedRows, rowId]
      : selectedRows.filter(id => id !== rowId)
    
    onSelectionChange?.(newSelection)
  }, [selectedRows, selectable, onSelectionChange])
  
  // Handle select all
  const handleSelectAll = useCallback((selected) => {
    if (!selectable) return
    
    const newSelection = selected
      ? virtualData.map(row => row.id || row._id)
      : []
    
    onSelectionChange?.(newSelection)
  }, [virtualData, selectable, onSelectionChange])
  
  // Export functionality
  const exportData = useCallback((format) => {
    if (!exportable) return
    
    const exportableData = processedData.map(row => {
      const exportRow = {}
      visibleColumns.forEach(column => {
        exportRow[column.label || column.key] = row[column.key]
      })
      return exportRow
    })
    
    if (format === 'csv') {
      const csv = [
        visibleColumns.map(col => col.label || col.key).join(','),
        ...exportableData.map(row => 
          Object.values(row).map(value => 
            typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          ).join(',')
        )
      ].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'data.csv'
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'json') {
      const json = JSON.stringify(exportableData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'data.json'
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [exportable, processedData, visibleColumns])
  
  // Virtual scrolling effect
  useEffect(() => {
    if (!virtualScrolling) return
    
    const handleScroll = () => {
      const scrollTop = virtualScrollRef.current?.scrollTop || 0
      const containerHeight = virtualScrollRef.current?.clientHeight || 0
      
      const start = Math.floor(scrollTop / rowHeight)
      const visibleCount = Math.ceil(containerHeight / rowHeight)
      const end = Math.min(start + visibleCount + 5, processedData.length) // Buffer
      
      setVirtualStart(start)
      setVirtualEnd(end)
    }
    
    const scrollContainer = virtualScrollRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [virtualScrolling, rowHeight, processedData.length])
  
  // Size variants
  const sizeClasses = {
    sm: {
      table: 'text-sm',
      cell: 'px-3 py-2',
      header: 'px-3 py-3',
    },
    md: {
      table: 'text-base',
      cell: 'px-4 py-3',
      header: 'px-4 py-4',
    },
    lg: {
      table: 'text-lg',
      cell: 'px-6 py-4',
      header: 'px-6 py-5',
    },
  }
  
  return (
    <div className={cn('space-y-4', className)} {...rest}>
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Search */}
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          
          {/* Filter Toggle */}
          {filterable && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'p-2 border border-input rounded-md bg-background hover:bg-accent transition-colors',
                showFilters && 'bg-accent'
              )}
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
          
          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 border border-input rounded-md bg-background hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Column Selector */}
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="p-2 border border-input rounded-md bg-background hover:bg-accent transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>
            
            {showColumnSelector && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-md shadow-lg z-10">
                <div className="p-2 space-y-1">
                  {columns.map(column => (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.has(column.key)}
                        onChange={() => toggleColumnVisibility(column.key)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{column.label || column.key}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Export */}
          {exportable && (
            <div className="relative">
              <button
                onClick={() => exportData('csv')}
                className="p-2 border border-input rounded-md bg-background hover:bg-accent transition-colors"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && filterable && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted rounded-md">
          {visibleColumns.map(column => (
            <div key={column.key}>
              <label className="block text-sm font-medium mb-1">
                {column.label || column.key}
              </label>
              <input
                type="text"
                placeholder={`Filter ${column.label || column.key}...`}
                value={filters[column.key] || ''}
                onChange={(e) => handleFilter(column.key, e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Bulk Actions */}
      {selectable && selectedRows.length > 0 && bulkActions.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-accent rounded-md">
          <span className="text-sm font-medium">
            {selectedRows.length} selected
          </span>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, index) => (
              <button
                key={index}
                onClick={() => action.onClick(selectedRows)}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Table Container */}
      <div
        ref={virtualScrolling ? virtualScrollRef : tableRef}
        className={cn(
          'border border-border rounded-md overflow-auto',
          virtualScrolling && 'max-h-96'
        )}
      >
        {/* Virtual Scrolling Spacer */}
        {virtualScrolling && (
          <div style={{ height: virtualStart * rowHeight }} />
        )}
        
        <table className={cn('w-full', sizeClasses[size].table, tableClassName)}>
          {/* Table Header */}
          <thead className={cn('bg-muted/50 border-b border-border', headerClassName)}>
            <tr>
              {/* Selection Header */}
              {selectable && (
                <th className={cn('w-12', sizeClasses[size].header)}>
                  <input
                    type="checkbox"
                    checked={selectedRows.length === virtualData.length && virtualData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4"
                  />
                </th>
              )}
              
              {/* Column Headers */}
              {visibleColumns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    'text-left font-medium text-muted-foreground',
                    sizeClasses[size].header,
                    sortable && column.sortable !== false && 'cursor-pointer hover:text-foreground',
                    `hidden ${responsiveBreakpoint}:table-cell`
                  )}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label || column.key}</span>
                    {sortable && column.sortable !== false && (
                      <div className="flex flex-col">
                        {sortConfig.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
              
              {/* Actions Header */}
              {actions.length > 0 && (
                <th className={cn('w-20', sizeClasses[size].header)}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody className={cn('divide-y divide-border', bodyClassName)}>
            {loading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-8"
                >
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading...</p>
                </td>
              </tr>
            ) : virtualData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  No data available
                </td>
              </tr>
            ) : (
              virtualData.map((row, index) => {
                const rowId = row.id || row._id || index
                const isSelected = selectedRows.includes(rowId)
                
                return (
                  <tr
                    key={rowId}
                    className={cn(
                      'hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-accent'
                    )}
                  >
                    {/* Selection Cell */}
                    {selectable && (
                      <td className={sizeClasses[size].cell}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleRowSelection(rowId, e.target.checked)}
                          className="h-4 w-4"
                        />
                      </td>
                    )}
                    
                    {/* Data Cells */}
                    {visibleColumns.map(column => (
                      <td
                        key={column.key}
                        className={cn(
                          sizeClasses[size].cell,
                          `hidden ${responsiveBreakpoint}:table-cell`
                        )}
                      >
                        {column.render 
                          ? column.render(row[column.key], row, index)
                          : row[column.key]
                        }
                      </td>
                    ))}
                    
                    {/* Actions Cell */}
                    {actions.length > 0 && (
                      <td className={sizeClasses[size].cell}>
                        <div className="flex items-center gap-1">
                          {actions.map((action, actionIndex) => (
                            <button
                              key={actionIndex}
                              onClick={() => action.onClick(row, index)}
                              className="p-1 hover:bg-accent rounded transition-colors"
                              title={action.label}
                            >
                              {action.icon || <MoreHorizontal className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        
        {/* Virtual Scrolling Bottom Spacer */}
        {virtualScrolling && (
          <div style={{ height: (processedData.length - virtualEnd) * rowHeight }} />
        )}
      </div>
      
      {/* Pagination */}
      {pagination && !virtualScrolling && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} results
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-input rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange?.(page)}
                    className={cn(
                      'px-3 py-1 border border-input rounded hover:bg-accent',
                      currentPage === page && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-input rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

export default DataTable