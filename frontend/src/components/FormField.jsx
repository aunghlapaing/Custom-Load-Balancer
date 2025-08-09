import React, { useState, useRef, useId, forwardRef } from 'react'
import { cn } from '../lib/design-system.js'
import { AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react'

/**
 * Enhanced FormField Component with floating labels, validation, and accessibility
 * 
 * Features:
 * - Floating labels with smooth animations
 * - Real-time validation feedback
 * - Comprehensive error state handling
 * - Loading states for async operations
 * - WCAG 2.1 AA accessibility compliance
 * - Multiple input types support
 * - Custom styling variants
 */

const FormField = forwardRef(({
  // Core props
  type = 'text',
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

  // Helper text
  helpText,
  maxLength,

  // Accessibility props
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,

  // Additional props
  className,
  containerClassName,
  labelClassName,
  inputClassName,

  // Input-specific props
  min,
  max,
  step,
  pattern,
  autoComplete,
  autoFocus,

  ...rest
}, ref) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue || '')

  const inputRef = useRef(null)
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
      container: 'h-10',
      input: 'text-sm px-3 pt-4 pb-1',
      label: 'text-xs px-3',
      icon: 'h-4 w-4',
    },
    md: {
      container: 'h-12',
      input: 'text-base px-4 pt-5 pb-2',
      label: 'text-sm px-4',
      icon: 'h-5 w-5',
    },
    lg: {
      container: 'h-14',
      input: 'text-lg px-5 pt-6 pb-2',
      label: 'text-base px-5',
      icon: 'h-6 w-6',
    },
  }

  // Variant styles
  const variantClasses = {
    default: {
      container: 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
      input: 'text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400',
      label: 'text-gray-600 dark:text-gray-400',
      focus: 'ring-2 ring-blue-500/20 ring-offset-2 border-blue-500',
    },
    filled: {
      container: 'border-0 bg-gray-100 dark:bg-gray-700',
      input: 'text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 bg-transparent',
      label: 'text-gray-600 dark:text-gray-400',
      focus: 'ring-2 ring-blue-500/20 ring-offset-2',
    },
    outlined: {
      container: 'border-2 border-gray-300 dark:border-gray-600 bg-transparent',
      input: 'text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 bg-transparent',
      label: 'text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 -ml-2',
      focus: 'border-blue-500',
    },
  }

  // Validation state styles
  const validationClasses = {
    default: '',
    error: 'border-red-500 ring-red-500/20',
    success: 'border-green-500 ring-green-500/20',
    warning: 'border-yellow-500 ring-yellow-500/20',
  }

  const handleInputChange = (e) => {
    const newValue = e.target.value

    if (!isControlled) {
      setInternalValue(newValue)
    }

    onChange?.(e)
  }

  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Determine input type for password fields
  const inputType = type === 'password' && showPassword ? 'text' : type

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
      {/* Input Container */}
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
        {/* Input Element */}
        <input
          ref={ref || inputRef}
          id={fieldId}
          type={inputType}
          value={currentValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || loading}
          readOnly={readOnly}
          required={required}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          placeholder={shouldFloat ? '' : placeholder}
          className={cn(
            // Base styles
            'w-full bg-transparent border-0 outline-none resize-none',
            'focus:ring-0 focus:outline-none',

            // Size
            sizeClasses[size].input,

            // Variant
            variantClasses[variant].input,

            // Disabled state
            disabled && 'cursor-not-allowed',

            inputClassName
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
                : 'top-1/2 -translate-y-1/2 scale-100',

              // Focus state
              isFocused && 'text-blue-500',

              // Validation state
              error && 'text-red-500',
              success && 'text-green-500',
              warning && 'text-yellow-500',

              // Required indicator
              required && "after:content-['*'] after:text-red-500 after:ml-1",

              labelClassName
            )}
          >
            {label}
          </label>
        )}

        {/* Right Side Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Loading Spinner */}
          {loading && (
            <div className={cn(
              'animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-500',
              sizeClasses[size].icon
            )} />
          )}

          {/* Validation Icons */}
          {!loading && validationState !== 'default' && (
            <div className={cn('flex-shrink-0', sizeClasses[size].icon)}>
              {validationState === 'error' && (
                <AlertCircle className="w-full h-full text-red-500" />
              )}
              {validationState === 'success' && (
                <Check className="w-full h-full text-green-500" />
              )}
              {validationState === 'warning' && (
                <AlertCircle className="w-full h-full text-yellow-500" />
              )}
            </div>
          )}

          {/* Password Toggle */}
          {type === 'password' && !loading && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className={cn(
                'flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                'focus:outline-none focus:text-blue-500 transition-colors',
                sizeClasses[size].icon
              )}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-full h-full" />
              ) : (
                <Eye className="w-full h-full" />
              )}
            </button>
          )}

          {/* Character Count */}
          {maxLength && currentValue && (
            <span className={cn(
              'text-xs text-gray-500 dark:text-gray-400 tabular-nums',
              currentValue.length > maxLength * 0.8 && 'text-yellow-500',
              currentValue.length >= maxLength && 'text-red-500'
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
          className="mt-1.5 text-xs text-gray-500 dark:text-gray-400"
        >
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Success Message */}
      {success && (
        <p className="mt-1.5 text-xs text-green-500 flex items-center gap-1">
          <Check className="h-3 w-3 flex-shrink-0" />
          {success}
        </p>
      )}

      {/* Warning Message */}
      {warning && (
        <p className="mt-1.5 text-xs text-yellow-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {warning}
        </p>
      )}
    </div>
  )
})

FormField.displayName = 'FormField'

export default FormField