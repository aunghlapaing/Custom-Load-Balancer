import { useState, useCallback, useRef, useEffect } from 'react'
import { debounce } from '../lib/design-system.js'

/**
 * Enhanced Form Validation Hook
 * 
 * Features:
 * - Real-time validation with debouncing
 * - Multiple validation rules per field
 * - Async validation support
 * - Form submission handling
 * - Error state management
 * - Touch/dirty state tracking
 * - Custom validation functions
 */

// Built-in validation rules
const validationRules = {
  required: (value, message = 'This field is required') => {
    if (Array.isArray(value)) {
      return value.length > 0 ? null : message
    }
    return value && value.toString().trim() ? null : message
  },
  
  email: (value, message = 'Please enter a valid email address') => {
    if (!value) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value) ? null : message
  },
  
  minLength: (min, message) => (value) => {
    if (!value) return null
    const actualMessage = message || `Must be at least ${min} characters`
    return value.length >= min ? null : actualMessage
  },
  
  maxLength: (max, message) => (value) => {
    if (!value) return null
    const actualMessage = message || `Must be no more than ${max} characters`
    return value.length <= max ? null : actualMessage
  },
  
  pattern: (regex, message = 'Invalid format') => (value) => {
    if (!value) return null
    return regex.test(value) ? null : message
  },
  
  min: (min, message) => (value) => {
    if (!value) return null
    const actualMessage = message || `Must be at least ${min}`
    return Number(value) >= min ? null : actualMessage
  },
  
  max: (max, message) => (value) => {
    if (!value) return null
    const actualMessage = message || `Must be no more than ${max}`
    return Number(value) <= max ? null : actualMessage
  },
  
  url: (value, message = 'Please enter a valid URL') => {
    if (!value) return null
    try {
      new URL(value)
      return null
    } catch {
      return message
    }
  },
  
  phone: (value, message = 'Please enter a valid phone number') => {
    if (!value) return null
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(value.replace(/\s/g, '')) ? null : message
  },
  
  strongPassword: (value, message = 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character') => {
    if (!value) return null
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    return strongPasswordRegex.test(value) ? null : message
  },
  
  confirmPassword: (passwordField, message = 'Passwords do not match') => (value, formData) => {
    if (!value) return null
    return value === formData[passwordField] ? null : message
  },
}

/**
 * Main form validation hook
 */
export function useFormValidation(initialValues = {}, validationSchema = {}, options = {}) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
    revalidateOnSubmit = true,
  } = options
  
  // Form state
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)
  
  // Refs for async operations
  const validationTimeouts = useRef({})
  const asyncValidations = useRef({})
  
  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce((fieldName, value, formData) => {
      validateField(fieldName, value, formData)
    }, debounceMs),
    [debounceMs]
  )
  
  // Validate a single field
  const validateField = useCallback(async (fieldName, value, formData = values) => {
    const fieldSchema = validationSchema[fieldName]
    if (!fieldSchema) return null
    
    // Cancel any pending async validation for this field
    if (asyncValidations.current[fieldName]) {
      asyncValidations.current[fieldName].cancel = true
    }
    
    const validationPromise = { cancel: false }
    asyncValidations.current[fieldName] = validationPromise
    
    let fieldError = null
    
    // Run synchronous validations
    for (const rule of fieldSchema) {
      if (typeof rule === 'function') {
        // Custom validation function
        const result = rule(value, formData)
        if (result) {
          fieldError = result
          break
        }
      } else if (typeof rule === 'object' && rule.validator) {
        // Async validation
        try {
          const result = await rule.validator(value, formData)
          
          // Check if this validation was cancelled
          if (validationPromise.cancel) return null
          
          if (result) {
            fieldError = result
            break
          }
        } catch (error) {
          if (!validationPromise.cancel) {
            fieldError = rule.message || 'Validation error'
          }
        }
      } else if (typeof rule === 'string' && validationRules[rule]) {
        // Built-in validation rule
        const result = validationRules[rule](value)
        if (result) {
          fieldError = result
          break
        }
      } else if (Array.isArray(rule) && rule.length >= 2) {
        // Built-in rule with parameters [ruleName, ...params, message]
        const [ruleName, ...params] = rule
        const message = typeof params[params.length - 1] === 'string' ? params.pop() : undefined
        
        if (validationRules[ruleName]) {
          const validator = validationRules[ruleName](...params, message)
          const result = validator(value, formData)
          if (result) {
            fieldError = result
            break
          }
        }
      }
    }
    
    // Update errors state
    setErrors(prev => ({
      ...prev,
      [fieldName]: fieldError
    }))
    
    return fieldError
  }, [validationSchema, values])
  
  // Validate all fields
  const validateForm = useCallback(async (formData = values) => {
    const fieldNames = Object.keys(validationSchema)
    const validationPromises = fieldNames.map(fieldName =>
      validateField(fieldName, formData[fieldName], formData)
    )
    
    const results = await Promise.all(validationPromises)
    const formErrors = {}
    
    fieldNames.forEach((fieldName, index) => {
      if (results[index]) {
        formErrors[fieldName] = results[index]
      }
    })
    
    setErrors(formErrors)
    return Object.keys(formErrors).length === 0
  }, [validationSchema, values, validateField])
  
  // Handle field value change
  const handleChange = useCallback((fieldName, value) => {
    setValues(prev => ({
      ...prev,
      [fieldName]: value
    }))
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }))
    
    // Validate on change if enabled
    if (validateOnChange) {
      debouncedValidate(fieldName, value, { ...values, [fieldName]: value })
    }
  }, [values, validateOnChange, debouncedValidate])
  
  // Handle field blur
  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }))
    
    // Validate on blur if enabled
    if (validateOnBlur) {
      validateField(fieldName, values[fieldName], values)
    }
  }, [values, validateOnBlur, validateField])
  
  // Handle form submission
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true)
    setSubmitCount(prev => prev + 1)
    
    try {
      // Mark all fields as touched
      const allFieldNames = Object.keys(validationSchema)
      setTouched(allFieldNames.reduce((acc, fieldName) => {
        acc[fieldName] = true
        return acc
      }, {}))
      
      // Validate form
      const isValid = await validateForm(values)
      
      if (isValid) {
        await onSubmit(values)
      } else {
        // Focus first error field
        const firstErrorField = Object.keys(errors)[0]
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField)
          element?.focus()
        }
      }
      
      return isValid
    } catch (error) {
      console.error('Form submission error:', error)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [validationSchema, validateForm, values, errors])
  
  // Reset form
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
    setSubmitCount(0)
    
    // Cancel any pending validations
    Object.values(asyncValidations.current).forEach(validation => {
      validation.cancel = true
    })
    asyncValidations.current = {}
  }, [initialValues])
  
  // Set field value
  const setValue = useCallback((fieldName, value) => {
    setValues(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }, [])
  
  // Set field error
  const setError = useCallback((fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }))
  }, [])
  
  // Clear field error
  const clearError = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])
  
  // Get field props for form components
  const getFieldProps = useCallback((fieldName) => ({
    value: values[fieldName] || '',
    error: touched[fieldName] ? errors[fieldName] : null,
    onChange: (e) => {
      const value = e.target ? e.target.value : e
      handleChange(fieldName, value)
    },
    onBlur: () => handleBlur(fieldName),
  }), [values, errors, touched, handleChange, handleBlur])
  
  // Computed properties
  const isValid = Object.keys(errors).length === 0
  const isDirty = Object.keys(touched).length > 0
  const hasErrors = Object.keys(errors).length > 0
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending validations
      Object.values(asyncValidations.current).forEach(validation => {
        validation.cancel = true
      })
      
      // Clear timeouts
      Object.values(validationTimeouts.current).forEach(timeout => {
        clearTimeout(timeout)
      })
    }
  }, [])
  
  return {
    // Form state
    values,
    errors,
    touched,
    isSubmitting,
    submitCount,
    
    // Computed state
    isValid,
    isDirty,
    hasErrors,
    
    // Actions
    handleChange,
    handleBlur,
    handleSubmit,
    validateField,
    validateForm,
    reset,
    setValue,
    setError,
    clearError,
    getFieldProps,
  }
}

// Export validation rules for custom use
export { validationRules }

export default useFormValidation