import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = localStorage.getItem('auth_token')
        const savedUser = localStorage.getItem('auth_user')
        
        if (savedToken && savedUser) {
          setToken(savedToken)
          setUser(JSON.parse(savedUser))
          setIsAuthenticated(true)
          
          // Verify token is still valid
          try {
            await authApi.verifyToken(savedToken)
          } catch (error) {
            // Token is invalid, clear auth state
            console.warn('Token verification failed:', error)
            await logout()
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        await logout()
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Login function
  const login = async (email, password, rememberMe = false) => {
    try {
      setLoading(true)
      
      // Call login API
      const response = await authApi.login({ email, password, rememberMe })
      
      const { user: userData, token: authToken, expiresIn } = response.data
      
      // Update state
      setUser(userData)
      setToken(authToken)
      setIsAuthenticated(true)
      
      // Store in localStorage
      localStorage.setItem('auth_token', authToken)
      localStorage.setItem('auth_user', JSON.stringify(userData))
      
      if (rememberMe) {
        localStorage.setItem('auth_remember', 'true')
        // Set longer expiration for remember me
        const expirationTime = Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
        localStorage.setItem('auth_expires', expirationTime.toString())
      } else {
        // Session-based expiration
        const expirationTime = Date.now() + (expiresIn * 1000)
        localStorage.setItem('auth_expires', expirationTime.toString())
      }
      
      return { user: userData, token: authToken }
    } catch (error) {
      console.error('Login error:', error)
      throw new Error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      // Call logout API if token exists
      if (token) {
        try {
          await authApi.logout(token)
        } catch (error) {
          console.warn('Logout API call failed:', error)
        }
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear state regardless of API call success
      setUser(null)
      setToken(null)
      setIsAuthenticated(false)
      
      // Clear localStorage
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_remember')
      localStorage.removeItem('auth_expires')
    }
  }

  // Update user profile
  const updateUser = async (userData) => {
    try {
      const response = await authApi.updateProfile(userData, token)
      const updatedUser = response.data.user
      
      setUser(updatedUser)
      localStorage.setItem('auth_user', JSON.stringify(updatedUser))
      
      return updatedUser
    } catch (error) {
      console.error('Update user error:', error)
      throw new Error(error.response?.data?.message || 'Failed to update profile')
    }
  }

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword
      }, token)
      
      return true
    } catch (error) {
      console.error('Change password error:', error)
      throw new Error(error.response?.data?.message || 'Failed to change password')
    }
  }

  // Check if token is expired
  const isTokenExpired = () => {
    const expirationTime = localStorage.getItem('auth_expires')
    if (!expirationTime) return true
    
    return Date.now() > parseInt(expirationTime)
  }

  // Refresh token
  const refreshToken = async () => {
    try {
      if (!token) throw new Error('No token available')
      
      const response = await authApi.refreshToken(token)
      const { token: newToken, expiresIn } = response.data
      
      setToken(newToken)
      localStorage.setItem('auth_token', newToken)
      
      // Update expiration
      const expirationTime = Date.now() + (expiresIn * 1000)
      localStorage.setItem('auth_expires', expirationTime.toString())
      
      return newToken
    } catch (error) {
      console.error('Token refresh error:', error)
      await logout()
      throw error
    }
  }

  // Auto-logout on token expiration
  useEffect(() => {
    if (!isAuthenticated || !token) return

    const checkTokenExpiration = () => {
      if (isTokenExpired()) {
        console.warn('Token expired, logging out')
        logout()
      }
    }

    // Check immediately
    checkTokenExpiration()

    // Check every minute
    const interval = setInterval(checkTokenExpiration, 60000)

    return () => clearInterval(interval)
  }, [isAuthenticated, token])

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    changePassword,
    refreshToken,
    isTokenExpired
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}