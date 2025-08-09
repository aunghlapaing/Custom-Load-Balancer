import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ConnectionProvider } from './contexts/ConnectionContext'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { useErrorReporting } from './hooks/useErrorHandler'
import { skipNavigation } from './lib/accessibility'

// Lazy load route components for code splitting
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Servers = lazy(() => import('./pages/Servers'))
const LoadBalancing = lazy(() => import('./pages/LoadBalancing'))
const HealthChecks = lazy(() => import('./pages/HealthChecks'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Settings = lazy(() => import('./pages/Settings'))
const Profile = lazy(() => import('./pages/Profile'))

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
)

function App() {
  const { reportError } = useErrorReporting()

  const handleGlobalError = (errorReport) => {
    // Report to external service if configured
    reportError(errorReport, { level: 'application' })
  }

  const handleRetry = () => {
    // Force a full page reload on app-level errors
    window.location.reload()
  }

  // Add skip navigation links on component mount
  useEffect(() => {
    skipNavigation.addSkipLinks([
      { targetId: 'main-content', text: 'Skip to main content' },
      { targetId: 'navigation', text: 'Skip to navigation' },
      { targetId: 'footer', text: 'Skip to footer' }
    ])
  }, [])

  return (
    <ErrorBoundary 
      level="page" 
      onError={handleGlobalError}
      onRetry={handleRetry}
      resetOnPropsChange={true}
    >
      <ThemeProvider>
        <ConnectionProvider>
          <AuthProvider>
            <Router>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Redirect root to login */}
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  
                  {/* Public Routes */}
                  <Route path="/login" element={
                    <ErrorBoundary level="component" onError={handleGlobalError}>
                      <Login />
                    </ErrorBoundary>
                  } />
                  
                  {/* Protected Routes - Each route individually protected */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute requiredPermissions={['admin']}>
                      <ErrorBoundary level="layout" onError={handleGlobalError}>
                        <Layout>
                          <ErrorBoundary level="component" onError={handleGlobalError}>
                            <Dashboard />
                          </ErrorBoundary>
                        </Layout>
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/servers" element={
                    <ProtectedRoute requiredPermissions={['admin']}>
                      <ErrorBoundary level="layout" onError={handleGlobalError}>
                        <Layout>
                          <ErrorBoundary level="component" onError={handleGlobalError}>
                            <Servers />
                          </ErrorBoundary>
                        </Layout>
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/load-balancing" element={
                    <ProtectedRoute requiredPermissions={['admin']}>
                      <ErrorBoundary level="layout" onError={handleGlobalError}>
                        <Layout>
                          <ErrorBoundary level="component" onError={handleGlobalError}>
                            <LoadBalancing />
                          </ErrorBoundary>
                        </Layout>
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/health-checks" element={
                    <ProtectedRoute requiredPermissions={['admin']}>
                      <ErrorBoundary level="layout" onError={handleGlobalError}>
                        <Layout>
                          <ErrorBoundary level="component" onError={handleGlobalError}>
                            <HealthChecks />
                          </ErrorBoundary>
                        </Layout>
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/analytics" element={
                    <ProtectedRoute requiredPermissions={['admin']}>
                      <ErrorBoundary level="layout" onError={handleGlobalError}>
                        <Layout>
                          <ErrorBoundary level="component" onError={handleGlobalError}>
                            <Analytics />
                          </ErrorBoundary>
                        </Layout>
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute requiredPermissions={['admin']}>
                      <ErrorBoundary level="layout" onError={handleGlobalError}>
                        <Layout>
                          <ErrorBoundary level="component" onError={handleGlobalError}>
                            <Settings />
                          </ErrorBoundary>
                        </Layout>
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profile" element={
                    <ProtectedRoute requiredPermissions={['admin']}>
                      <ErrorBoundary level="layout" onError={handleGlobalError}>
                        <Layout>
                          <ErrorBoundary level="component" onError={handleGlobalError}>
                            <Profile />
                          </ErrorBoundary>
                        </Layout>
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                </Routes>
              </Suspense>
            </Router>
          </AuthProvider>
        </ConnectionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App