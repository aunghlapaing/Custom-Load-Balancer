/**
 * Theme Context and Provider
 * 
 * Provides comprehensive theme management including light/dark mode support,
 * theme configuration interface, automatic theme detection, smooth transitions,
 * and theme persistence in localStorage.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { themeManager } from '../lib/theme.js';

// Create Theme Context
const ThemeContext = createContext(null);

/**
 * Theme Provider Component
 */
export function ThemeProvider({ children, defaultTheme = 'system' }) {
    const [themeState, setThemeState] = useState(() => ({
        config: themeManager.getConfig(),
        effectiveMode: themeManager.getEffectiveMode(),
        isDark: themeManager.isDark(),
        isLoading: true,
    }));

    // Initialize theme on mount
    useEffect(() => {
        // Initialize theme manager
        themeManager.initialize();

        // Set up theme change listener
        const unsubscribe = themeManager.addListener((newThemeState) => {
            setThemeState(prev => ({
                ...newThemeState,
                isLoading: false,
            }));
        });

        // Initial state update
        setThemeState(prev => ({
            ...prev,
            config: themeManager.getConfig(),
            effectiveMode: themeManager.getEffectiveMode(),
            isDark: themeManager.isDark(),
            isLoading: false,
        }));

        return unsubscribe;
    }, []);

    // Theme management functions
    const updateConfig = useCallback((updates) => {
        themeManager.updateConfig(updates);
    }, []);

    const setMode = useCallback((mode) => {
        themeManager.setMode(mode);
    }, []);

    const toggleMode = useCallback(() => {
        themeManager.toggleMode();
    }, []);

    const resetToDefaults = useCallback(() => {
        themeManager.updateConfig({
            mode: 'system',
            primaryColor: 'blue',
            borderRadius: 'md',
            density: 'comfortable',
        });
    }, []);

    // Get theme-aware values
    const getThemeValue = useCallback((lightValue, darkValue) => {
        return themeState.isDark ? darkValue : lightValue;
    }, [themeState.isDark]);

    const getThemeClass = useCallback((lightClass, darkClass) => {
        return themeState.isDark ? darkClass : lightClass;
    }, [themeState.isDark]);

    // Context value
    const contextValue = {
        // Theme state
        ...themeState,

        // Theme management functions
        updateConfig,
        setMode,
        toggleMode,
        resetToDefaults,

        // Utility functions
        getThemeValue,
        getThemeClass,

        // Theme options from config
        themeOptions: themeManager.constructor.THEME_CONFIG?.options || {},
    };

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Hook to use theme context
 */
export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
}

/**
 * Hook for theme-aware styling
 */
export function useThemeStyles() {
    const { isDark, getThemeValue, getThemeClass } = useTheme();

    return {
        isDark,
        getThemeValue,
        getThemeClass,
        // Common theme-aware styles
        cardBg: getThemeValue('bg-white', 'bg-gray-800'),
        textPrimary: getThemeValue('text-gray-900', 'text-gray-100'),
        textSecondary: getThemeValue('text-gray-600', 'text-gray-400'),
        borderColor: getThemeValue('border-gray-200', 'border-gray-700'),
        hoverBg: getThemeValue('hover:bg-gray-50', 'hover:bg-gray-700'),
    };
}

/**
 * Hook for system theme detection
 */
export function useSystemTheme() {
    const [systemTheme, setSystemTheme] = useState(() => {
        if (typeof window === 'undefined') return 'light';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return systemTheme;
}

/**
 * Hook for reduced motion preference
 */
export function useReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleChange = (e) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return prefersReducedMotion;
}

/**
 * Higher-order component for theme-aware components
 */
export function withTheme(Component) {
    const ThemedComponent = (props) => {
        const theme = useTheme();
        return <Component {...props} theme={theme} />;
    };

    ThemedComponent.displayName = `withTheme(${Component.displayName || Component.name})`;

    return ThemedComponent;
}

export default ThemeProvider;