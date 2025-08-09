import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const API_KEY = import.meta.env.VITE_API_KEY || 'dev_api_key_123'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
  timeout: 10000
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Only log in development if needed
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API) {
      console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Only log API errors in development mode
    if (import.meta.env.DEV) {
      console.error('API Error:', error.response?.data || error.message)
    }

    // Better error handling for proxy setup
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      error.message = 'Cannot connect to backend API. Please ensure the backend service is running.'
    } else if (error.response?.status === 401) {
      error.message = 'Authentication failed. Please check your API key configuration.'
    } else if (error.response?.status === 404) {
      error.message = 'API endpoint not found. Please check the backend routes are properly registered.'
    } else if (error.response?.status >= 500) {
      error.message = 'Backend server error. Please check the server logs for details.'
    } else if (!error.response) {
      error.message = 'Network error. Cannot reach the backend API service.'
    }

    return Promise.reject(error)
  }
)

// Server Management APIs
export const serverApi = {
  getAll: () => apiClient.get('/servers'),
  getById: (id) => apiClient.get(`/servers/${id}`),
  create: (data) => apiClient.post('/servers', data),
  update: (id, data) => apiClient.put(`/servers/${id}`, data),
  delete: (id) => apiClient.delete(`/servers/${id}`)
}

// Configuration APIs
export const configApi = {
  get: () => apiClient.get('/config'),
  update: (data) => apiClient.put('/config', data),
  setAlgorithm: (algorithm) => apiClient.put('/config/algorithm', { algorithm })
}

// Metrics APIs
export const metricsApi = {
  get: () => apiClient.get('/metrics'),
  getServerMetrics: (serverId) => apiClient.get(`/servers/${serverId}/health`)
}

// Health Check APIs
export const healthApi = {
  getStatus: () => apiClient.get('/health'),
  getServerHealth: (serverId) => apiClient.get(`/servers/${serverId}/health`)
}

// System APIs
export const systemApi = {
  ping: () => {
    // Create a simple ping request without auth for connection testing
    return axios.get(`${API_BASE_URL}/ping`, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    })
  },
  health: () => {
    // Health check without auth
    return axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    })
  },
  getVersion: () => apiClient.get('/version'),
  // Test connection with detailed diagnostics
  testConnection: async () => {
    const results = {
      ping: false,
      auth: false,
      servers: false,
      error: null,
      details: {
        baseUrl: API_BASE_URL,
        apiKey: API_KEY ? 'Set' : 'Not Set',
        timestamp: new Date().toISOString()
      }
    }

    try {
      // Test 1: Basic ping (no auth required)
      const pingResponse = await axios.get(`${API_BASE_URL}/ping`, {
        timeout: 3000,
        headers: { 'Content-Type': 'application/json' }
      })

      if (pingResponse.status === 200) {
        results.ping = true

        // Test 2: Authenticated endpoint
        try {
          const serversResponse = await apiClient.get('/servers')
          if (serversResponse.status === 200) {
            results.auth = true
            results.servers = true
          }
        } catch (authError) {
          // If ping works but auth fails, still mark connection as working
          results.ping = true
          if (authError.response?.status === 401) {
            results.error = 'Authentication failed - check API key configuration'
          } else {
            results.error = `Auth test failed: ${authError.message}`
          }
        }
      }

    } catch (error) {
      results.error = error.message

      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        results.error = 'Backend service is not running. Please start the load balancer.'
      } else if (error.response?.status === 404) {
        results.error = 'API endpoints not found - check backend routes'
      } else if (error.response?.status === 500) {
        results.error = 'Backend server error - check server logs'
      } else if (!error.response) {
        results.error = 'Network error - unable to reach backend service'
      }
    }

    return results
  },

  // Quick connection check
  isBackendRunning: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ping`, {
        timeout: 2000,
        headers: { 'Content-Type': 'application/json' }
      })
      return response.status === 200 && response.data?.message === 'pong'
    } catch (error) {
      console.log('Backend connection test failed:', error.message)
      return false
    }
  }
}

import userStorage from './userStorage'

// Authentication APIs
export const authApi = {
  // Login user
  login: (credentials) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const { email, password } = credentials
          
          // Use user storage for authentication
          const user = userStorage.authenticateUser(email, password)
          
          resolve({
            data: {
              user: user,
              token: `mock_token_${user.id}_${Date.now()}`,
              expiresIn: 3600, // 1 hour
              message: 'Login successful'
            }
          })
        } catch (error) {
          reject({
            response: {
              data: {
                message: error.message
              }
            }
          })
        }
      }, 1000) // Simulate network delay
    })
  },

  // Logout user
  logout: (token) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            message: 'Logout successful'
          }
        })
      }, 500)
    })
  },

  // Verify token
  verifyToken: (token) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (token && token.startsWith('mock_token_')) {
          resolve({
            data: {
              valid: true,
              message: 'Token is valid'
            }
          })
        } else {
          reject({
            response: {
              data: {
                message: 'Invalid token'
              }
            }
          })
        }
      }, 500)
    })
  },

  // Refresh token
  refreshToken: (token) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (token && token.startsWith('mock_token_')) {
          const userId = token.split('_')[2]
          resolve({
            data: {
              token: `mock_token_${userId}_${Date.now()}`,
              expiresIn: 3600,
              message: 'Token refreshed'
            }
          })
        } else {
          reject({
            response: {
              data: {
                message: 'Invalid token'
              }
            }
          })
        }
      }, 500)
    })
  },

  // Update user profile
  updateProfile: (userData, token) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (!token || !token.startsWith('mock_token_')) {
            throw new Error('Unauthorized')
          }

          // Use user storage to update profile
          const updatedUser = userStorage.updateProfile(userData)
          
          resolve({
            data: {
              user: updatedUser,
              message: 'Profile updated successfully'
            }
          })
        } catch (error) {
          reject({
            response: {
              data: {
                message: error.message
              }
            }
          })
        }
      }, 1000)
    })
  },

  // Change password
  changePassword: (passwordData, token) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (!token || !token.startsWith('mock_token_')) {
            throw new Error('Unauthorized')
          }

          // Use user storage to change password
          userStorage.changePassword(passwordData.currentPassword, passwordData.newPassword)
          
          resolve({
            data: {
              message: 'Password changed successfully'
            }
          })
        } catch (error) {
          reject({
            response: {
              data: {
                message: error.message
              }
            }
          })
        }
      }, 1000)
    })
  },

  // Get user profile
  getProfile: (token) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (!token || !token.startsWith('mock_token_')) {
            throw new Error('Unauthorized')
          }

          // Use user storage to get profile
          const user = userStorage.getUserProfile()
          
          resolve({
            data: {
              user: user
            }
          })
        } catch (error) {
          reject({
            response: {
              data: {
                message: error.message
              }
            }
          })
        }
      }, 500)
    })
  }
}

export default apiClient