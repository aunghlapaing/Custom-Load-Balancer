import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for managing layout preferences and responsive behavior
 * Handles sidebar state, responsive breakpoints, and persistent user preferences
 */
const useLayoutPreferences = () => {
  // Sidebar states: 'expanded', 'collapsed', 'hidden'
  const [sidebarState, setSidebarState] = useState('expanded')
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)

  // Breakpoint constants
  const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
    desktop: 1280
  }

  // Load preferences from localStorage
  const loadPreferences = useCallback(() => {
    try {
      const saved = localStorage.getItem('layout-preferences')
      if (saved) {
        const preferences = JSON.parse(saved)
        return preferences
      }
    } catch (error) {
      console.warn('Failed to load layout preferences:', error)
    }
    return {
      sidebarState: 'expanded',
      autoCollapse: true
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = useCallback((preferences) => {
    try {
      localStorage.setItem('layout-preferences', JSON.stringify(preferences))
    } catch (error) {
      console.warn('Failed to save layout preferences:', error)
    }
  }, [])

  // Handle responsive breakpoint changes
  const handleResize = useCallback(() => {
    const width = window.innerWidth
    const newIsMobile = width < BREAKPOINTS.mobile
    const newIsTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet
    const newIsDesktop = width >= BREAKPOINTS.tablet

    setIsMobile(newIsMobile)
    setIsTablet(newIsTablet)
    setIsDesktop(newIsDesktop)

    // Auto-adjust sidebar state based on screen size
    const preferences = loadPreferences()
    if (preferences.autoCollapse) {
      if (newIsMobile) {
        setSidebarState('hidden')
      } else if (newIsTablet) {
        setSidebarState('collapsed')
      } else if (newIsDesktop && sidebarState === 'hidden') {
        setSidebarState('expanded')
      }
    }
  }, [loadPreferences, sidebarState])

  // Initialize responsive behavior
  useEffect(() => {
    // Load saved preferences
    const preferences = loadPreferences()
    setSidebarState(preferences.sidebarState || 'expanded')

    // Set initial responsive state
    handleResize()

    // Add resize listener
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize, loadPreferences])

  // Update sidebar state with persistence
  const updateSidebarState = useCallback((newState) => {
    setSidebarState(newState)

    // Save to localStorage
    const currentPreferences = loadPreferences()
    savePreferences({
      ...currentPreferences,
      sidebarState: newState
    })
  }, [loadPreferences, savePreferences])

  // Toggle sidebar state
  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      // On mobile, toggle between hidden and expanded (overlay)
      setSidebarState(prev => prev === 'hidden' ? 'expanded' : 'hidden')
    } else if (isTablet) {
      // On tablet, toggle between collapsed and expanded
      updateSidebarState(sidebarState === 'collapsed' ? 'expanded' : 'collapsed')
    } else {
      // On desktop, toggle between expanded and collapsed
      updateSidebarState(sidebarState === 'expanded' ? 'collapsed' : 'expanded')
    }
  }, [isMobile, isTablet, sidebarState, updateSidebarState])

  // Close sidebar (mainly for mobile overlay)
  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarState('hidden')
    }
  }, [isMobile])

  // Get responsive classes for layout
  const getLayoutClasses = useCallback(() => {
    const classes = {
      container: 'flex h-screen bg-gray-50 dark:bg-gray-900',
      main: 'flex-1 flex flex-col overflow-hidden',
      content: 'flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900'
    }

    // Adjust main content margin based on sidebar state and screen size
    // Updated to match our modern sidebar widths: w-64 (expanded) and w-16 (collapsed)
    if (!isMobile) {
      if (sidebarState === 'expanded') {
        classes.main += ' ml-64'
      } else if (sidebarState === 'collapsed') {
        classes.main += ' ml-16'
      }
    }

    return classes
  }, [isMobile, sidebarState])

  // Get sidebar classes
  const getSidebarClasses = useCallback(() => {
    const baseClasses = 'fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out shadow-sm'

    if (isMobile) {
      return {
        container: `${baseClasses} ${sidebarState === 'expanded' ? 'translate-x-0' : '-translate-x-full'} w-72`,
        overlay: sidebarState === 'expanded' ? 'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden' : 'hidden'
      }
    } else {
      return {
        container: `${baseClasses} translate-x-0 ${sidebarState === 'collapsed' ? 'w-16' : 'w-64'}`,
        overlay: 'hidden'
      }
    }
  }, [isMobile, sidebarState])

  return {
    // State
    sidebarState,
    isMobile,
    isTablet,
    isDesktop,

    // Actions
    toggleSidebar,
    closeSidebar,
    updateSidebarState,

    // Utilities
    getLayoutClasses,
    getSidebarClasses,

    // Preferences
    loadPreferences,
    savePreferences
  }
}

export default useLayoutPreferences