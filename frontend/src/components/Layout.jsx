import React from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import Breadcrumb from './Breadcrumb'
import OfflineMode from './OfflineMode'
import useLayoutPreferences from '../hooks/useLayoutPreferences'

const Layout = ({ children }) => {
  const location = useLocation()
  const {
    sidebarState,
    isMobile,
    isTablet,
    isDesktop,
    toggleSidebar,
    closeSidebar,
    getLayoutClasses,
    getSidebarClasses
  } = useLayoutPreferences()

  const layoutClasses = getLayoutClasses()
  const sidebarClasses = getSidebarClasses()

  return (
    <OfflineMode>
      <div className={layoutClasses.container} role="application">
        {/* Enhanced Sidebar with three states - Navigation landmark */}
        <nav
          id="navigation"
          role="navigation"
          aria-label="Main navigation"
          className={sidebarClasses.container}
        >
          <Sidebar
            state={sidebarState}
            isMobile={isMobile}
            isTablet={isTablet}
            isDesktop={isDesktop}
            onClose={closeSidebar}
            onToggle={toggleSidebar}
            currentPath={location.pathname}
          />
        </nav>

        {/* Main content area */}
        <div className={layoutClasses.main}>
          {/* Enhanced Header - Banner landmark */}
          <header role="banner" aria-label="Site header">
            <Header
              onMenuToggle={toggleSidebar}
              sidebarState={sidebarState}
              isMobile={isMobile}
            />
          </header>

          {/* Breadcrumb Navigation - Compact */}
          <nav
            role="navigation"
            aria-label="Breadcrumb navigation"
            className="px-4 sm:px-6 lg:px-8 py-2 border-b border-gray-100 dark:border-gray-800"
          >
            <div className="max-w-7xl mx-auto w-full">
              <Breadcrumb />
            </div>
          </nav>

          {/* Page content with minimal padding - Main landmark */}
          <main
            id="main-content"
            role="main"
            aria-label="Main content"
            className={`${layoutClasses.content} px-4 sm:px-6 lg:px-8 py-4`}
            tabIndex="-1"
          >
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile sidebar overlay */}
        <div
          className={sidebarClasses.overlay}
          onClick={closeSidebar}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              closeSidebar()
            }
          }}
          aria-hidden="true"
          role="presentation"
        />
      </div>
    </OfflineMode>
  )
}

export default Layout