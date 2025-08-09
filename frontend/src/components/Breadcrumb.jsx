import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import clsx from 'clsx'

// Route mapping for breadcrumb generation
const routeMap = {
  '/': { name: 'Dashboard', icon: Home },
  '/load-balancing': { name: 'Load Balancing', parent: '/' },
  '/servers': { name: 'Backend Servers', parent: '/' },
  '/health-checks': { name: 'Health Checks', parent: '/' },
  '/security': { name: 'Security & Firewall', parent: '/' },
  '/ssl': { name: 'SSL/TLS Management', parent: '/' },
  '/analytics': { name: 'Analytics & Metrics', parent: '/' },
  '/settings': { name: 'System Settings', parent: '/' },
  // Add nested routes as needed
  '/servers/add': { name: 'Add Server', parent: '/servers' },
  '/servers/edit': { name: 'Edit Server', parent: '/servers' },
  '/load-balancing/algorithms': { name: 'Algorithms', parent: '/load-balancing' },
  '/security/firewall': { name: 'Firewall Rules', parent: '/security' },
  '/ssl/certificates': { name: 'Certificates', parent: '/ssl' },
  '/analytics/reports': { name: 'Reports', parent: '/analytics' },
  '/settings/users': { name: 'User Management', parent: '/settings' },
}

const Breadcrumb = ({ className, showHome = true, maxItems = 4 }) => {
  const location = useLocation()
  const currentPath = location.pathname

  // Generate breadcrumb trail
  const generateBreadcrumbs = () => {
    const breadcrumbs = []
    let path = currentPath

    // Build breadcrumb chain by following parent relationships
    while (path && routeMap[path]) {
      const route = routeMap[path]
      breadcrumbs.unshift({
        path,
        name: route.name,
        icon: route.icon,
        isHome: path === '/'
      })
      path = route.parent
    }

    // If we don't have a complete chain, ensure we start with home
    if (breadcrumbs.length > 0 && breadcrumbs[0].path !== '/' && showHome) {
      breadcrumbs.unshift({
        path: '/',
        name: routeMap['/'].name,
        icon: routeMap['/'].icon,
        isHome: true
      })
    }

    // Truncate if too many items
    if (breadcrumbs.length > maxItems) {
      const start = breadcrumbs.slice(0, 1) // Keep home
      const end = breadcrumbs.slice(-(maxItems - 2)) // Keep last items
      return [
        ...start,
        { name: '...', isEllipsis: true },
        ...end
      ]
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // Don't render if only home or no breadcrumbs
  if (breadcrumbs.length <= 1 && currentPath === '/') {
    return null
  }

  return (
    <nav
      className={clsx(
        'flex items-center space-x-1 text-sm text-muted-foreground',
        className
      )}
      aria-label="Breadcrumb navigation"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1
          const isCurrent = crumb.path === currentPath

          return (
            <li key={crumb.path || `ellipsis-${index}`} className="flex items-center">
              {index > 0 && (
                <ChevronRight
                  className="h-4 w-4 mx-1 text-muted-foreground/50"
                  aria-hidden="true"
                />
              )}

              {crumb.isEllipsis ? (
                <span className="px-1 py-0.5 text-muted-foreground/70">
                  {crumb.name}
                </span>
              ) : isLast || isCurrent ? (
                <span
                  className={clsx(
                    'flex items-center px-1 py-0.5 rounded-md font-medium',
                    isCurrent
                      ? 'text-foreground bg-accent/50'
                      : 'text-muted-foreground'
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {crumb.icon && (
                    <crumb.icon
                      className="h-4 w-4 mr-1.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate max-w-[150px]">
                    {crumb.name}
                  </span>
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className={clsx(
                    'flex items-center px-1 py-0.5 rounded-md transition-colors duration-200',
                    'hover:text-foreground hover:bg-accent/50',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    'text-muted-foreground'
                  )}
                >
                  {crumb.icon && (
                    <crumb.icon
                      className="h-4 w-4 mr-1.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate max-w-[150px]">
                    {crumb.name}
                  </span>
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumb