/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

/**
 * Focus management utilities
 */
export const focusManagement = {
  // Trap focus within a container (for modals, dropdowns)
  trapFocus: (container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  },

  // Restore focus to previous element
  restoreFocus: (previousElement) => {
    if (previousElement && typeof previousElement.focus === 'function') {
      previousElement.focus()
    }
  },

  // Get next focusable element
  getNextFocusableElement: (currentElement, container = document) => {
    const focusableElements = Array.from(container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ))
    
    const currentIndex = focusableElements.indexOf(currentElement)
    return focusableElements[currentIndex + 1] || focusableElements[0]
  },

  // Get previous focusable element
  getPreviousFocusableElement: (currentElement, container = document) => {
    const focusableElements = Array.from(container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ))
    
    const currentIndex = focusableElements.indexOf(currentElement)
    return focusableElements[currentIndex - 1] || focusableElements[focusableElements.length - 1]
  }
}

/**
 * ARIA utilities
 */
export const ariaUtils = {
  // Generate unique IDs for ARIA relationships
  generateId: (prefix = 'aria') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  },

  // Set ARIA attributes safely
  setAriaAttributes: (element, attributes) => {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        element.setAttribute(`aria-${key}`, value)
      }
    })
  },

  // Announce to screen readers
  announce: (message, priority = 'polite') => {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message
    
    document.body.appendChild(announcer)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  },

  // Create accessible description
  createDescription: (text, id) => {
    const description = document.createElement('div')
    description.id = id || ariaUtils.generateId('desc')
    description.className = 'sr-only'
    description.textContent = text
    return description
  }
}

/**
 * Keyboard navigation utilities
 */
export const keyboardNavigation = {
  // Handle arrow key navigation
  handleArrowKeys: (event, items, currentIndex, onNavigate) => {
    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowDown':
        newIndex = Math.min(currentIndex + 1, items.length - 1)
        break
      case 'ArrowUp':
        newIndex = Math.max(currentIndex - 1, 0)
        break
      case 'Home':
        newIndex = 0
        break
      case 'End':
        newIndex = items.length - 1
        break
      default:
        return false
    }

    if (newIndex !== currentIndex) {
      event.preventDefault()
      onNavigate(newIndex)
      return true
    }
    return false
  },

  // Handle escape key
  handleEscape: (event, onEscape) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
      return true
    }
    return false
  },

  // Handle enter/space activation
  handleActivation: (event, onActivate) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onActivate()
      return true
    }
    return false
  }
}

/**
 * Color contrast utilities
 */
export const colorContrast = {
  // Calculate relative luminance
  getRelativeLuminance: (color) => {
    const rgb = colorContrast.hexToRgb(color)
    if (!rgb) return 0

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  },

  // Convert hex to RGB
  hexToRgb: (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  },

  // Calculate contrast ratio
  getContrastRatio: (color1, color2) => {
    const l1 = colorContrast.getRelativeLuminance(color1)
    const l2 = colorContrast.getRelativeLuminance(color2)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  },

  // Check if contrast meets WCAG standards
  meetsWCAG: (color1, color2, level = 'AA', size = 'normal') => {
    const ratio = colorContrast.getContrastRatio(color1, color2)
    
    if (level === 'AAA') {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7
    } else {
      return size === 'large' ? ratio >= 3 : ratio >= 4.5
    }
  }
}

/**
 * Screen reader utilities
 */
export const screenReader = {
  // Hide content from screen readers
  hideFromScreenReader: (element) => {
    element.setAttribute('aria-hidden', 'true')
  },

  // Show content to screen readers only
  showToScreenReaderOnly: (element) => {
    element.className += ' sr-only'
  },

  // Create screen reader only text
  createScreenReaderText: (text) => {
    const span = document.createElement('span')
    span.className = 'sr-only'
    span.textContent = text
    return span
  }
}

/**
 * Motion preferences utilities
 */
export const motionPreferences = {
  // Check if user prefers reduced motion
  prefersReducedMotion: () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },

  // Apply motion-safe animations
  applyMotionSafeAnimation: (element, animation) => {
    if (!motionPreferences.prefersReducedMotion()) {
      element.style.animation = animation
    }
  },

  // Create motion-safe CSS class
  getMotionSafeClass: (animationClass) => {
    return motionPreferences.prefersReducedMotion() ? '' : animationClass
  }
}

/**
 * Skip navigation utilities
 */
export const skipNavigation = {
  // Create skip link
  createSkipLink: (targetId, text = 'Skip to main content') => {
    const skipLink = document.createElement('a')
    skipLink.href = `#${targetId}`
    skipLink.textContent = text
    skipLink.className = 'skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded'
    
    // Handle click
    skipLink.addEventListener('click', (e) => {
      e.preventDefault()
      const target = document.getElementById(targetId)
      if (target) {
        target.focus()
        target.scrollIntoView()
      }
    })
    
    return skipLink
  },

  // Add skip links to page
  addSkipLinks: (links) => {
    const skipContainer = document.createElement('div')
    skipContainer.className = 'skip-links'
    
    links.forEach(({ targetId, text }) => {
      const skipLink = skipNavigation.createSkipLink(targetId, text)
      skipContainer.appendChild(skipLink)
    })
    
    document.body.insertBefore(skipContainer, document.body.firstChild)
  }
}

/**
 * Form accessibility utilities
 */
export const formAccessibility = {
  // Associate label with input
  associateLabel: (input, label) => {
    const id = input.id || ariaUtils.generateId('input')
    input.id = id
    label.setAttribute('for', id)
  },

  // Add error message to input
  addErrorMessage: (input, errorMessage) => {
    const errorId = ariaUtils.generateId('error')
    const errorElement = document.createElement('div')
    errorElement.id = errorId
    errorElement.className = 'error-message text-sm text-red-600 mt-1'
    errorElement.textContent = errorMessage
    
    input.setAttribute('aria-describedby', errorId)
    input.setAttribute('aria-invalid', 'true')
    input.parentNode.appendChild(errorElement)
    
    return errorElement
  },

  // Remove error message
  removeErrorMessage: (input) => {
    const errorId = input.getAttribute('aria-describedby')
    if (errorId) {
      const errorElement = document.getElementById(errorId)
      if (errorElement) {
        errorElement.remove()
      }
      input.removeAttribute('aria-describedby')
      input.removeAttribute('aria-invalid')
    }
  }
}

export default {
  focusManagement,
  ariaUtils,
  keyboardNavigation,
  colorContrast,
  screenReader,
  motionPreferences,
  skipNavigation,
  formAccessibility
}