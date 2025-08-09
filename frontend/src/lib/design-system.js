/**
 * Design System Utilities
 * 
 * This file provides utility functions and constants for the design system,
 * including theme management, responsive utilities, and component helpers.
 */

// Design System Constants
export const BREAKPOINTS = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const SPACING_SCALE = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '2.5rem',  // 40px
  '3xl': '3rem',    // 48px
  '4xl': '4rem',    // 64px
};

export const FONT_SIZES = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
};

export const BORDER_RADIUS = {
  xs: '0.125rem',   // 2px
  sm: '0.25rem',    // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
};

// Theme Management
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

/**
 * Get the current theme mode from localStorage or system preference
 */
export function getThemeMode() {
  if (typeof window === 'undefined') return THEME_MODES.LIGHT;
  
  const stored = localStorage.getItem('theme-mode');
  if (stored && Object.values(THEME_MODES).includes(stored)) {
    return stored;
  }
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? THEME_MODES.DARK 
    : THEME_MODES.LIGHT;
}

/**
 * Set the theme mode and apply it to the document
 */
export function setThemeMode(mode) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('theme-mode', mode);
  
  const isDark = mode === THEME_MODES.DARK || 
    (mode === THEME_MODES.SYSTEM && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  document.documentElement.classList.toggle('dark', isDark);
}

/**
 * Initialize theme on app startup
 */
export function initializeTheme() {
  const mode = getThemeMode();
  setThemeMode(mode);
  
  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const currentMode = getThemeMode();
      if (currentMode === THEME_MODES.SYSTEM) {
        setThemeMode(THEME_MODES.SYSTEM);
      }
    });
  }
}

// Responsive Utilities
/**
 * Check if current viewport matches a breakpoint
 */
export function useBreakpoint(breakpoint) {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS[breakpoint];
}

/**
 * Get current breakpoint name
 */
export function getCurrentBreakpoint() {
  if (typeof window === 'undefined') return 'sm';
  
  const width = window.innerWidth;
  
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

// Component Size Variants
export const COMPONENT_SIZES = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
};

// Status Types
export const STATUS_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info',
  NEUTRAL: 'neutral',
};

// Animation Durations
export const ANIMATION_DURATION = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
};

// Easing Functions
export const EASING = {
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounceIn: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

// Utility Functions
/**
 * Combine class names conditionally
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Create responsive class names
 */
export function responsive(base, variants = {}) {
  const classes = [base];
  
  Object.entries(variants).forEach(([breakpoint, className]) => {
    if (className) {
      classes.push(`${breakpoint}:${className}`);
    }
  });
  
  return classes.join(' ');
}

/**
 * Generate status-based class names
 */
export function statusClasses(status, prefix = 'bg') {
  const statusMap = {
    [STATUS_TYPES.SUCCESS]: `${prefix}-success`,
    [STATUS_TYPES.WARNING]: `${prefix}-warning`,
    [STATUS_TYPES.ERROR]: `${prefix}-error`,
    [STATUS_TYPES.INFO]: `${prefix}-info`,
    [STATUS_TYPES.NEUTRAL]: `${prefix}-muted`,
  };
  
  return statusMap[status] || statusMap[STATUS_TYPES.NEUTRAL];
}

/**
 * Generate size-based class names
 */
export function sizeClasses(size, component = 'btn') {
  const sizeMap = {
    [COMPONENT_SIZES.xs]: `${component}-xs`,
    [COMPONENT_SIZES.sm]: `${component}-sm`,
    [COMPONENT_SIZES.md]: `${component}-md`,
    [COMPONENT_SIZES.lg]: `${component}-lg`,
    [COMPONENT_SIZES.xl]: `${component}-xl`,
  };
  
  return sizeMap[size] || sizeMap[COMPONENT_SIZES.md];
}

// Layout Utilities
/**
 * Generate grid column classes based on breakpoints
 */
export function gridCols(cols) {
  if (typeof cols === 'number') {
    return `grid-cols-${cols}`;
  }
  
  if (typeof cols === 'object') {
    return Object.entries(cols)
      .map(([breakpoint, count]) => 
        breakpoint === 'default' 
          ? `grid-cols-${count}` 
          : `${breakpoint}:grid-cols-${count}`
      )
      .join(' ');
  }
  
  return 'grid-cols-1';
}

/**
 * Generate gap classes
 */
export function gap(size) {
  if (typeof size === 'number') {
    return `gap-${size}`;
  }
  
  if (typeof size === 'object') {
    return Object.entries(size)
      .map(([breakpoint, gapSize]) => 
        breakpoint === 'default' 
          ? `gap-${gapSize}` 
          : `${breakpoint}:gap-${gapSize}`
      )
      .join(' ');
  }
  
  return 'gap-4';
}

// Focus Management
/**
 * Focus trap utility for modals and dropdowns
 */
export function createFocusTrap(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  function handleTabKey(e) {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }
  
  element.addEventListener('keydown', handleTabKey);
  
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

// Accessibility Utilities
/**
 * Generate ARIA attributes for components
 */
export function ariaProps(props = {}) {
  const ariaAttributes = {};
  
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith('aria') || key === 'role') {
      ariaAttributes[key] = value;
    }
  });
  
  return ariaAttributes;
}

/**
 * Generate accessible button props
 */
export function buttonProps({ disabled, loading, ...props } = {}) {
  return {
    ...ariaProps(props),
    disabled: disabled || loading,
    'aria-disabled': disabled || loading,
    'aria-busy': loading,
    tabIndex: disabled ? -1 : 0,
  };
}

// Performance Utilities
/**
 * Debounce function for performance optimization
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Export all utilities as default object
export default {
  BREAKPOINTS,
  SPACING_SCALE,
  FONT_SIZES,
  BORDER_RADIUS,
  Z_INDEX,
  THEME_MODES,
  COMPONENT_SIZES,
  STATUS_TYPES,
  ANIMATION_DURATION,
  EASING,
  getThemeMode,
  setThemeMode,
  initializeTheme,
  useBreakpoint,
  getCurrentBreakpoint,
  cn,
  responsive,
  statusClasses,
  sizeClasses,
  gridCols,
  gap,
  createFocusTrap,
  ariaProps,
  buttonProps,
  debounce,
  throttle,
};