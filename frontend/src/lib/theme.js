/**
 * Theme Configuration and Management
 * 
 * This file provides comprehensive theme management including
 * theme switching, persistence, and theme-aware utilities.
 */

import { THEME_MODES } from './design-system.js';

// Theme Configuration
export const THEME_CONFIG = {
  // Default theme settings
  default: {
    mode: THEME_MODES.SYSTEM,
    primaryColor: 'blue',
    borderRadius: 'md',
    density: 'comfortable',
  },
  
  // Available theme options
  options: {
    modes: [
      { value: THEME_MODES.LIGHT, label: 'Light', icon: 'sun' },
      { value: THEME_MODES.DARK, label: 'Dark', icon: 'moon' },
      { value: THEME_MODES.SYSTEM, label: 'System', icon: 'monitor' },
    ],
    primaryColors: [
      { value: 'blue', label: 'Blue', color: '#3b82f6' },
      { value: 'green', label: 'Green', color: '#22c55e' },
      { value: 'purple', label: 'Purple', color: '#a855f7' },
      { value: 'orange', label: 'Orange', color: '#f97316' },
      { value: 'red', label: 'Red', color: '#ef4444' },
      { value: 'pink', label: 'Pink', color: '#ec4899' },
    ],
    borderRadius: [
      { value: 'none', label: 'None', preview: '0px' },
      { value: 'sm', label: 'Small', preview: '4px' },
      { value: 'md', label: 'Medium', preview: '6px' },
      { value: 'lg', label: 'Large', preview: '8px' },
      { value: 'xl', label: 'Extra Large', preview: '12px' },
    ],
    density: [
      { value: 'compact', label: 'Compact', description: 'More content, less spacing' },
      { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing' },
      { value: 'spacious', label: 'Spacious', description: 'More spacing, less content' },
    ],
  },
};

// Theme Storage Keys
const STORAGE_KEYS = {
  THEME_CONFIG: 'lb-dashboard-theme-config',
  THEME_MODE: 'lb-dashboard-theme-mode',
};

/**
 * Theme Manager Class
 */
export class ThemeManager {
  constructor() {
    this.config = this.loadConfig();
    this.listeners = new Set();
    this.mediaQuery = null;
    
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
    }
  }
  
  /**
   * Load theme configuration from localStorage
   */
  loadConfig() {
    if (typeof window === 'undefined') {
      return { ...THEME_CONFIG.default };
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.THEME_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...THEME_CONFIG.default, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load theme config:', error);
    }
    
    return { ...THEME_CONFIG.default };
  }
  
  /**
   * Save theme configuration to localStorage
   */
  saveConfig() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.THEME_CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save theme config:', error);
    }
  }
  
  /**
   * Get current theme configuration
   */
  getConfig() {
    return { ...this.config };
  }
  
  /**
   * Update theme configuration
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.applyTheme();
    this.notifyListeners();
  }
  
  /**
   * Get current effective theme mode (resolves 'system' to actual mode)
   */
  getEffectiveMode() {
    if (this.config.mode === THEME_MODES.SYSTEM) {
      if (typeof window === 'undefined') return THEME_MODES.LIGHT;
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? THEME_MODES.DARK 
        : THEME_MODES.LIGHT;
    }
    return this.config.mode;
  }
  
  /**
   * Check if current theme is dark
   */
  isDark() {
    return this.getEffectiveMode() === THEME_MODES.DARK;
  }
  
  /**
   * Apply theme to document
   */
  applyTheme() {
    if (typeof window === 'undefined') return;
    
    const isDark = this.isDark();
    const root = document.documentElement;
    
    // Apply dark mode class
    root.classList.toggle('dark', isDark);
    
    // Apply density classes
    root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    root.classList.add(`density-${this.config.density}`);
    
    // Apply border radius
    root.style.setProperty('--default-radius', this.getBorderRadiusValue());
    
    // Apply primary color (if we implement color theming)
    root.setAttribute('data-primary-color', this.config.primaryColor);
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(isDark);
  }
  
  /**
   * Get border radius CSS value
   */
  getBorderRadiusValue() {
    const radiusMap = {
      none: '0px',
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
    };
    return radiusMap[this.config.borderRadius] || radiusMap.md;
  }
  
  /**
   * Update meta theme-color for mobile browsers
   */
  updateMetaThemeColor(isDark) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    
    // Set appropriate theme color based on mode
    metaThemeColor.content = isDark ? '#1f2937' : '#ffffff';
  }
  
  /**
   * Handle system theme changes
   */
  handleSystemThemeChange() {
    if (this.config.mode === THEME_MODES.SYSTEM) {
      this.applyTheme();
      this.notifyListeners();
    }
  }
  
  /**
   * Toggle between light and dark modes
   */
  toggleMode() {
    const currentMode = this.getEffectiveMode();
    const newMode = currentMode === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK;
    this.updateConfig({ mode: newMode });
  }
  
  /**
   * Set specific theme mode
   */
  setMode(mode) {
    if (Object.values(THEME_MODES).includes(mode)) {
      this.updateConfig({ mode });
    }
  }
  
  /**
   * Add theme change listener
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Notify all listeners of theme changes
   */
  notifyListeners() {
    const themeState = {
      config: this.getConfig(),
      effectiveMode: this.getEffectiveMode(),
      isDark: this.isDark(),
    };
    
    this.listeners.forEach(callback => {
      try {
        callback(themeState);
      } catch (error) {
        console.warn('Theme listener error:', error);
      }
    });
  }
  
  /**
   * Initialize theme on app startup
   */
  initialize() {
    this.applyTheme();
    
    // Add CSS for density variants
    this.addDensityStyles();
    
    return this;
  }
  
  /**
   * Add CSS for density variants
   */
  addDensityStyles() {
    if (typeof window === 'undefined') return;
    
    const styleId = 'theme-density-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .density-compact {
        --spacing-unit: 0.75;
        --component-height-sm: 2rem;
        --component-height-md: 2.25rem;
        --component-height-lg: 2.5rem;
      }
      
      .density-comfortable {
        --spacing-unit: 1;
        --component-height-sm: 2.25rem;
        --component-height-md: 2.5rem;
        --component-height-lg: 2.75rem;
      }
      
      .density-spacious {
        --spacing-unit: 1.25;
        --component-height-sm: 2.5rem;
        --component-height-md: 2.75rem;
        --component-height-lg: 3rem;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.handleSystemThemeChange.bind(this));
    }
    this.listeners.clear();
  }
}

// Create singleton instance
export const themeManager = new ThemeManager();

// Note: React hook is now provided by ThemeContext.jsx
// This maintains backward compatibility for non-React usage

// Utility functions for theme-aware styling
export function getThemeValue(lightValue, darkValue) {
  return themeManager.isDark() ? darkValue : lightValue;
}

export function getThemeClass(lightClass, darkClass) {
  return themeManager.isDark() ? darkClass : lightClass;
}

// Initialize theme when module loads
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      themeManager.initialize();
    });
  } else {
    themeManager.initialize();
  }
}

export default themeManager;