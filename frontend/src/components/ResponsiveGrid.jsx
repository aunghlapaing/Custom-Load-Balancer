import React from 'react'
import clsx from 'clsx'

/**
 * ResponsiveGrid - A flexible grid system component for different content layouts
 * Supports responsive breakpoints and customizable gap spacing
 */
const ResponsiveGrid = ({ 
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 6,
  className = '',
  children,
  ...props
}) => {
  // Generate responsive grid classes based on breakpoints
  const gridClasses = clsx(
    'grid',
    // Mobile columns (default)
    `grid-cols-${cols.mobile || 1}`,
    // Tablet columns (md breakpoint - 768px)
    cols.tablet && `md:grid-cols-${cols.tablet}`,
    // Desktop columns (lg breakpoint - 1024px)
    cols.desktop && `lg:grid-cols-${cols.desktop}`,
    // Extra large columns (xl breakpoint - 1280px)
    cols.xl && `xl:grid-cols-${cols.xl}`,
    // Gap spacing
    `gap-${gap}`,
    className
  )

  return (
    <div className={gridClasses} {...props}>
      {children}
    </div>
  )
}

/**
 * AutoFitGrid - Grid that automatically fits columns based on minimum width
 */
const AutoFitGrid = ({ 
  minWidth = '280px',
  gap = 6,
  className = '',
  children,
  ...props
}) => {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`,
    gap: `${gap * 0.25}rem` // Convert gap to rem (gap-6 = 1.5rem)
  }

  return (
    <div 
      className={clsx('grid', className)} 
      style={gridStyle}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * AutoFillGrid - Grid that automatically fills columns based on minimum width
 */
const AutoFillGrid = ({ 
  minWidth = '280px',
  gap = 6,
  className = '',
  children,
  ...props
}) => {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
    gap: `${gap * 0.25}rem` // Convert gap to rem
  }

  return (
    <div 
      className={clsx('grid', className)} 
      style={gridStyle}
      {...props}
    >
      {children}
    </div>
  )
}

export { ResponsiveGrid, AutoFitGrid, AutoFillGrid }
export default ResponsiveGrid