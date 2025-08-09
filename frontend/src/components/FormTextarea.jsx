import React, { useState, useRef, useId, forwardRef, useEffect } from 'react'
import { cn } from '../lib/design-system.js'
import { AlertCircle, Check } from 'lucide-react'

/**
 * Enhanced FormTextarea Component with floating labels and auto-resize
 * 
 * Features:
 * - Floating labels with smooth animations
 * - Auto-resize functionality
 * - Real-time validation feedback
 * - Character count display
 * - WCAG 2.1 AA accessibility compliance
 */

const FormTextarea = forwardRef(({
  // Core props
  label,
  placeholder,
  value = '',
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  
  // Validation props
  error,
  success,
  warning,
  required = false,
  disabled = false,
  readOnly = false,
  
  // UI props
  size = 'md',
  variant = 'default',
  loading = false,
  autoResize = true,
  
  // Textarea-specific props
  rows = 3,
  minRows = 2,
  maxRows = 10,
  maxLength,
  
  // Helper text
  helpText,
  
  // Accessibility props
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  
  // Additional props
  className,
  containerClassName,
  labelClassName,
  textareaClassName,
  
  ...rest
}, ref) => {
  const [isFocused, setIsFocused] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue || '')
  
  const textareaRef = useRef(null)
  const fieldId = useId()
  const errorId = useId()
  const helpId = useId()
  
  // Use controlled or uncontrolled value
  const currentValue = value !== undefined ? value : internalValue
  const isControlled = value !== undefined
  
  // Determine if label should float
  const shouldFloat = isFocused || currentValue || placeholder
  
  // Determine validation state
  const validationState = error ? 'error' : success ? 'success' : warning ? 'warning' : 'default'
  
  // Size variants
  const sizeClasses = {
    sm: {
      container: 'min-h-[2.5rem]',
      textarea: 'text-sm px-3 pt-4 pb-2',
      label: 'text-xs px-3',
    },
    md: {
      container: 'min-h-[3rem]',
      textarea: 'text-base px-4 pt-5 pb-2',
      label: 'text-sm px-4',
    },
    lg: {
      container: 'min-h-[3.5rem]',
      textarea: 'text-lg px-5 pt-6 pb-2',
      label: 'text-base px-5',
    },
  }
  
  // Variant styles
  const variantClasses = {
    default: {
      container: 'border border-input bg-background',
      textarea: 'text-foreground placeholder:text-muted-foreground',
      label: 'text-muted-foreground',
      focus: 'ring-2 ring-ring ring-offset-2 border-ring',
    },
    filled: {
      container: 'border-0 bg-muted',
      textarea: 'text-foreground placeholder:text-muted-foreground bg-transparent',
      label: 'text-muted-foreground',
      focus: 'ring-2 ring-ring ring-offset-2',
    },
    outlined: {
      container: 'border-2 border-border bg-transparent',
      textarea: 'text-foreground placeholder:text-muted-foreground bg-transparent',
      label: 'text-muted-foreground bg-background px-2 -ml-2',
      focus: 'border-ring',
    },
  }
  
  // Validation state styles
  const validationClasses = {
    default: '',
    error: 'border-error ring-error/20',
    success: 'border-success ring-success/20',
    warning: 'border-warning ring-warning/20',
  }
  
  // Auto-resize functionality
  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (!textarea || !autoResize) return
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    
    // Calculate the number of rows based on content
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight)
    const padding = parseInt(getComputedStyle(textarea).paddingTop) + 
                   parseInt(getComputedStyle(textarea).paddingBottom)
    
    const contentHeight = textarea.scrollHeight - padding
    const calculatedRows = Math.ceil(contentHeight / lineHeight)
    
    // Constrain between minRows and maxRows
    const constrainedRows = Math.max(minRows, Math.min(maxRows, calculatedRows))
    
    // Set the height
    textarea.style.height = `${constrainedRows * lineHeight + padding}px`
  }
  
  useEffect(() => {
    adjustHeight()
  }, [currentValue, autoResize, minRows, maxRows])
  
  const handleTextareaChange = (e) => {
    const newValue = e.target.value
    
    if (!isControlled) {
      setInternalValue(newValue)
    }
    
    onChange?.(e)
    
    // Adjust height after state update
    setTimeout(adjustHeight, 0)
  }
  
  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus?.(e)
  }
  
  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur?.(e)
  }
  
  // Build ARIA attributes
  const ariaAttributes = {
    'aria-label': ariaLabel || label,
    'aria-describedby': cn(
      error && errorId,
      helpText && helpId,
      ariaDescribedBy
    ).trim() || undefined,
    'aria-invalid': !!error,
    'aria-required': required,
  }
  
  return (
    <div className={cn('relative', containerClassName)}>
      {/* Textarea Container */}
      <div
        className={cn(
          // Base styles
          'relative rounded-md transition-all duration-200 ease-in-out',
          
          // Size
          sizeClasses[size].container,
          
          // Variant
          variantClasses[variant].container,
          
          // Validation state
          validationClasses[validationState],
          
          // Focus state
          isFocused && variantClasses[variant].focus,
          
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed',
          
          // Loading state
          loading && 'animate-pulse',
          
          className
        )}
      >
        {/* Textarea Element */}
        <textarea
          ref={ref || textareaRef}
          id={fieldId}
          value={currentValue}
          onChange={handleTextareaChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || loading}
          readOnly={readOnly}
          required={required}
          rows={autoResize ? minRows : rows}
          maxLength={maxLength}
          placeholder={shouldFloat ? '' : placeholder}
          className={cn(
            // Base styles
            'w-full bg-transparent border-0 outline-none resize-none',
            'focus:ring-0 focus:outline-none',
            'scrollbar-thin',
            
            // Size
            sizeClasses[size].textarea,
            
            // Variant
            variantClasses[variant].textarea,
            
            // Disabled state
            disabled && 'cursor-not-allowed',
            
            // Auto-resize
            autoResize && 'overflow-hidden',
            
            textareaClassName
          )}
          {...ariaAttributes}
          {...rest}
        />
        
        {/* Floating Label */}
        {label && (
          <label
            htmlFor={fieldId}
            className={cn(
              // Base styles
              'absolute left-0 transition-all duration-200 ease-in-out pointer-events-none',
              'transform origin-left',
              
              // Size and positioning
              sizeClasses[size].label,
              
              // Variant
              variantClasses[variant].label,
              
              // Float state
              shouldFloat
                ? 'top-1 scale-75 -translate-y-0'
                : 'top-4 -translate-y-1/2 scale-100',
              
              // Focus state
              isFocused && 'text-ring',
              
              // Validation state
              error && 'text-error',
              success && 'text-success',
              warning && 'text-warning',
              
              // Required indicator
              required && "after:content-['*'] after:text-error after:ml-1",
              
              labelClassName
            )}
          >
            {label}
          </label>
        )}
        
        {/* Bottom Right Icons/Info */}
        <div className="absolute bottom-2 right-3 flex items-center gap-2">
          {/* Loading Spinner */}
          {loading && (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-muted border-t-ring" />
          )}
          
          {/* Validation Icons */}
          {!loading && validationState !== 'default' && (
            <div className="w-4 h-4 flex-shrink-0">
              {validationState === 'error' && (
                <AlertCircle className="w-full h-full text-error" />
              )}
              {validationState === 'success' && (
                <Check className="w-full h-full text-success" />
              )}
              {validationState === 'warning' && (
                <AlertCircle className="w-full h-full text-warning" />
              )}
            </div>
          )}
          
          {/* Character Count */}
          {maxLength && (
            <span className={cn(
              'text-xs text-muted-foreground tabular-nums',
              currentValue.length > maxLength * 0.8 && 'text-warning',
              currentValue.length >= maxLength && 'text-error'
            )}>
              {currentValue.length}/{maxLength}
            </span>
          )}
        </div>
      </div>
      
      {/* Helper Text */}
      {helpText && !error && !success && !warning && (
        <p
          id={helpId}
          className="mt-1.5 text-xs text-muted-foreground"
        >
          {helpText}
        </p>
      )}
      
      {/* Error Message */}
      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-xs text-error flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
      
      {/* Success Message */}
      {success && (
        <p className="mt-1.5 text-xs text-success flex items-center gap-1">
          <Check className="h-3 w-3 flex-shrink-0" />
          {success}
        </p>
      )}
      
      {/* Warning Message */}
      {warning && (
        <p className="mt-1.5 text-xs text-warning flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {warning}
        </p>
      )}
    </div>
  )
})

FormTextarea.displayName = 'FormTextarea'

export default FormTextarea