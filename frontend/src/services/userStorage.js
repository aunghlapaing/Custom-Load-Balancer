/**
 * User Storage Service
 * 
 * Manages user profile data in localStorage with file-like persistence
 * This simulates a database for storing user authentication and profile data
 */

const USER_STORAGE_KEY = 'loadmaster_user_data'
const DEFAULT_USER_DATA = {
  id: 1,
  email: 'admin@loadmaster.com',
  password: 'admin123', // In production, this would be hashed
  name: 'Admin User',
  role: 'System Administrator',
  avatar: null,
  permissions: ['read', 'write', 'admin'],
  lastLogin: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: null
}

class UserStorageService {
  constructor() {
    this.initializeUserData()
  }

  /**
   * Initialize user data if it doesn't exist
   */
  initializeUserData() {
    const existingData = this.getUserData()
    if (!existingData) {
      this.saveUserData(DEFAULT_USER_DATA)
      console.log('✅ User data initialized with default admin account')
    }
  }

  /**
   * Get user data from storage
   */
  getUserData() {
    try {
      const data = localStorage.getItem(USER_STORAGE_KEY)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error reading user data:', error)
      return null
    }
  }

  /**
   * Save user data to storage
   */
  saveUserData(userData) {
    try {
      const dataToSave = {
        ...userData,
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(dataToSave))
      console.log('✅ User data saved successfully')
      return true
    } catch (error) {
      console.error('Error saving user data:', error)
      return false
    }
  }

  /**
   * Authenticate user with email and password
   */
  authenticateUser(email, password) {
    const userData = this.getUserData()
    
    if (!userData) {
      throw new Error('User data not found')
    }

    if (userData.email === email && userData.password === password) {
      // Update last login
      const updatedUser = {
        ...userData,
        lastLogin: new Date().toISOString()
      }
      this.saveUserData(updatedUser)
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = updatedUser
      return userWithoutPassword
    } else {
      throw new Error('Invalid email or password')
    }
  }

  /**
   * Update user profile (name, email, avatar)
   */
  updateProfile(profileData) {
    const currentUser = this.getUserData()
    
    if (!currentUser) {
      throw new Error('User not found')
    }

    // Validate email format
    if (profileData.email && !this.isValidEmail(profileData.email)) {
      throw new Error('Invalid email format')
    }

    // Update profile data
    const updatedUser = {
      ...currentUser,
      name: profileData.name || currentUser.name,
      email: profileData.email || currentUser.email,
      avatar: profileData.avatar !== undefined ? profileData.avatar : currentUser.avatar,
      updatedAt: new Date().toISOString()
    }

    const success = this.saveUserData(updatedUser)
    if (!success) {
      throw new Error('Failed to save profile changes')
    }

    // Return updated user without password
    const { password: _, ...userWithoutPassword } = updatedUser
    return userWithoutPassword
  }

  /**
   * Change user password
   */
  changePassword(currentPassword, newPassword) {
    const userData = this.getUserData()
    
    if (!userData) {
      throw new Error('User not found')
    }

    // Verify current password
    if (userData.password !== currentPassword) {
      throw new Error('Current password is incorrect')
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long')
    }

    if (currentPassword === newPassword) {
      throw new Error('New password must be different from current password')
    }

    // Update password
    const updatedUser = {
      ...userData,
      password: newPassword, // In production, this would be hashed
      updatedAt: new Date().toISOString()
    }

    const success = this.saveUserData(updatedUser)
    if (!success) {
      throw new Error('Failed to save password changes')
    }

    return true
  }

  /**
   * Get user profile (without password)
   */
  getUserProfile() {
    const userData = this.getUserData()
    
    if (!userData) {
      throw new Error('User not found')
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = userData
    return userWithoutPassword
  }

  /**
   * Reset user data to defaults (for testing/demo purposes)
   */
  resetUserData() {
    this.saveUserData(DEFAULT_USER_DATA)
    console.log('🔄 User data reset to defaults')
    return this.getUserProfile()
  }

  /**
   * Export user data (for backup purposes)
   */
  exportUserData() {
    const userData = this.getUserData()
    if (!userData) {
      throw new Error('No user data to export')
    }

    // Remove password from export for security
    const { password: _, ...exportData } = userData
    
    const exportObject = {
      userData: exportData,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }

    return exportObject
  }

  /**
   * Import user data (for restore purposes)
   */
  importUserData(importData) {
    if (!importData || !importData.userData) {
      throw new Error('Invalid import data format')
    }

    // Merge with current password (don't import passwords for security)
    const currentUser = this.getUserData()
    const mergedUser = {
      ...importData.userData,
      password: currentUser?.password || DEFAULT_USER_DATA.password,
      updatedAt: new Date().toISOString()
    }

    const success = this.saveUserData(mergedUser)
    if (!success) {
      throw new Error('Failed to import user data')
    }

    return this.getUserProfile()
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    const userData = this.getUserData()
    return {
      hasData: !!userData,
      lastUpdated: userData?.updatedAt || null,
      createdAt: userData?.createdAt || null,
      storageSize: localStorage.getItem(USER_STORAGE_KEY)?.length || 0
    }
  }
}

// Create singleton instance
const userStorage = new UserStorageService()

export default userStorage

// Export individual methods for convenience
export const {
  getUserData,
  saveUserData,
  authenticateUser,
  updateProfile,
  changePassword,
  getUserProfile,
  resetUserData,
  exportUserData,
  importUserData,
  getStorageStats
} = userStorage