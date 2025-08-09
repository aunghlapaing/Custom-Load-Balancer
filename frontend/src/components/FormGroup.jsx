import React from 'react'
import { cn } from '../lib/design-system.js'

/**
 * FormGroup Component for organizing form fields
 * 
 * Features:
 * - Consistent spacing and layout
 * - Responsive grid support
 * - Fieldset grouping with legends
 * - Accessibility support
 * - Loading states
 */

const FormGroup = ({
  // Content
  children,
  title,
  description,
  
  // Layout
  columns = 1,
  gap = 'md',
  
  // Styling
  variant = 'default',
  size = 'md',
  
  // States
  disabled = false,
  loading = false,
  
  // Accessibility
  role,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  
  // Additional props
  className,
  titleClassName,
  descriptionClassName,
  contentClassName,
  
  ...rest
}) => {
  // Gap size mapping
  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  }
  
  // Column classes for responsive grid
  const getColumnClasses = (cols) => {
    if (typeof cols === 'number') {
      return `grid-cols-1 md:grid-cols-${Math.min(cols, 3)} lg:grid-cols-${cols}`
    }
    
    if (typeof cols === 'object') {
      const classes = []
      if (cols.default) classes.push(`grid-cols-${cols.default}`)
      if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`)
      if (cols.md) classes.push(`md:grid-cols-${cols.md}`)
      if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`)
      if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`)
      return classes.join(' ')
    }
    
    return 'grid-cols-1'
  }
  
  // Variant styles
  const variantClasses = {
    default: 'space-y-4',
    card: 'p-6 bg-card border border-border rounded-lg space-y-4',
    section: 'py-6 border-b border-border last:border-b-0 space-y-4',
    inline: 'space-y-2',
  }
  
  // Size variants
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }
  
  const Component = title ? 'fieldset' : 'div'
  
  return (
    <Component
      className={cn(
        // Base styles
        'relative',
        
        // Variant
        variantClasses[variant],
        
        // Size
        sizeClasses[size],
        
        // Disabled state
        disabled && 'opacity-50 pointer-events-none',
        
        // Loading state
        loading && 'animate-pulse',
        
        className
      )}
      role={role}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      {...rest}
    >
      {/* Title (Legend for fieldset) */}
      {title && (
        <legend
          className={cn(
            'text-lg font-semibold text-foreground mb-2',
            size === 'sm' && 'text-base',
            size === 'lg' && 'text-xl',
            titleClassName
          )}
        >
          {title}
        </legend>
      )}
      
      {/* Description */}
      {description && (
        <p
          className={cn(
            'text-sm text-muted-foreground mb-4',
            size === 'sm' && 'text-xs',
            size === 'lg' && 'text-base',
            descriptionClassName
          )}
        >
          {description}
        </p>
      )}
      
      {/* Content */}
      <div
        className={cn(
          // Grid layout
          columns > 1 && 'grid',
          columns > 1 && getColumnClasses(columns),
          columns > 1 && gapClasses[gap],
          
          // Flex layout for single column
          columns === 1 && 'flex flex-col',
          columns === 1 && gapClasses[gap],
          
          contentClassName
        )}
      >
        {children}
      </div>
    </Component>
  )
}

/**
 * FormSection Component for major form sections
 */
export const FormSection = ({
  children,
  title,
  description,
  collapsible = false,
  defaultExpanded = true,
  className,
  ...rest
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  
  return (
    <div className={cn('border-b border-border last:border-b-0', className)}>
      {/* Section Header */}
      {title && (
        <div className="py-4">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-left"
              aria-expanded={isExpanded}
            >
              <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            </button>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Section Content */}
      {(!collapsible || isExpanded) && (
        <div className="pb-6">
          <FormGroup {...rest}>
            {children}
          </FormGroup>
        </div>
      )}
    </div>
  )
}

/**
 * FormRow Component for inline form fields
 */
export const FormRow = ({
  children,
  gap = 'md',
  align = 'end',
  className,
  ...rest
}) => {
  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  }
  
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  }
  
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row',
        gapClasses[gap],
        alignClasses[align],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

/**
 * FormActions Component for form buttons
 */
export const FormActions = ({
  children,
  align = 'end',
  gap = 'sm',
  className,
  ...rest
}) => {
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }
  
  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  }
  
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center',
        alignClasses[align],
        gapClasses[gap],
        'pt-6 mt-6 border-t border-border',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export default FormGroup