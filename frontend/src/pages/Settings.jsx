import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Settings as SettingsIcon, User, Bell, Moon, Sun, Monitor, Save,
  RefreshCw, Download, Upload, Trash2, Eye, EyeOff, Lock, Key,
  Globe, Palette, Volume2, VolumeX, Smartphone, Mail, Shield,
  Database, Network, Clock, AlertTriangle, CheckCircle
} from 'lucide-react'
import ResponsiveGrid from '../components/ResponsiveGrid'
import FormField from '../components/FormField'
import FormGroup from '../components/FormGroup'
import ErrorBoundary from '../components/ErrorBoundary'
import { useErrorHandler } from '../hooks/useErrorHandler'
import userStorage from '../services/userStorage'

const Settings = () => {
  const [settings, setSettings] = useState({
    // General Settings
    systemName: 'LoadMaster Pro',
    timezone: 'UTC',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '24h',

    // Theme Settings
    theme: 'system', // light, dark, system
    primaryColor: '#3b82f6',
    compactMode: false,
    animations: true,

    // Notification Settings
    emailNotifications: true,
    pushNotifications: false,
    soundEnabled: true,
    notificationFrequency: 'immediate',
    alertThreshold: 'medium',

    // Security Settings
    sessionTimeout: 30,
    requireMFA: false,
    passwordExpiry: 90,
    loginAttempts: 5,
    auditLogging: true,

    // Performance Settings
    autoRefresh: true,
    refreshInterval: 30,
    dataRetention: 30,
    logLevel: 'info',
    enableMetrics: true,

    // API Settings
    apiTimeout: 10000,
    rateLimitEnabled: true,
    corsEnabled: false,
    apiLogging: true
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { handleError, clearError } = useErrorHandler()

  // Settings tabs configuration
  const settingsTabs = useMemo(() => [
    { id: 'general', label: 'General', icon: <SettingsIcon className="h-4 w-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
    { id: 'performance', label: 'Performance', icon: <Database className="h-4 w-4" /> },
    { id: 'api', label: 'API', icon: <Network className="h-4 w-4" /> }
  ], [])

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        // In real app, this would load from settings API
        // const response = await settingsApi.get()
        // setSettings(response.data)

        // Load from localStorage for now
        const savedSettings = localStorage.getItem('app-settings')
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }))
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
        const errorMessage = handleError(err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [handleError])

  // Save settings
  const handleSaveSettings = useCallback(async () => {
    try {
      setSaving(true)
      clearError()
      setSuccess(false)

      // In real app, this would save to settings API
      // await settingsApi.update(settings)

      // Save to localStorage for now
      localStorage.setItem('app-settings', JSON.stringify(settings))

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      const errorMessage = handleError(err)
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }, [settings, handleError, clearError])

  // Update setting value
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))

    // Apply theme changes immediately
    if (key === 'theme') {
      applyThemeChange(value)
    }
  }, [])

  // Apply theme changes immediately
  const applyThemeChange = useCallback((theme) => {
    const root = document.documentElement

    if (theme === 'light') {
      root.classList.remove('dark')
    } else if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'system') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [])

  // Export settings
  const handleExportSettings = useCallback(() => {
    const exportData = {
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loadmaster-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [settings])

  // Import settings
  const handleImportSettings = useCallback((event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result)
        if (importData.settings) {
          setSettings(importData.settings)
          alert('Settings imported successfully!')
        } else {
          alert('Invalid settings file format')
        }
      } catch (err) {
        alert('Failed to import settings: Invalid file format')
      }
    }
    reader.readAsText(file)
  }, [])

  // Reset settings
  const handleResetSettings = useCallback(() => {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) return

    setSettings({
      systemName: 'LoadMaster Pro',
      timezone: 'UTC',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '24h',
      theme: 'system',
      primaryColor: '#3b82f6',
      compactMode: false,
      animations: true,
      emailNotifications: true,
      pushNotifications: false,
      soundEnabled: true,
      notificationFrequency: 'immediate',
      alertThreshold: 'medium',
      sessionTimeout: 30,
      requireMFA: false,
      passwordExpiry: 90,
      loginAttempts: 5,
      auditLogging: true,
      autoRefresh: true,
      refreshInterval: 30,
      dataRetention: 30,
      logLevel: 'info',
      enableMetrics: true,
      apiTimeout: 10000,
      rateLimitEnabled: true,
      corsEnabled: false,
      apiLogging: true
    })
  }, [])

  // Render settings content based on active tab
  const renderSettingsContent = useCallback(() => {
    switch (activeTab) {
      case 'general':
        return (
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap={6}>
            <FormGroup title="System Information">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    System Name
                  </label>
                  <input
                    type="text"
                    value={settings.systemName}
                    onChange={(e) => updateSetting('systemName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Display name for your load balancer system"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => updateSetting('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => updateSetting('language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>
              </div>
            </FormGroup>

            <FormGroup title="Date & Time Format">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date Format
                  </label>
                  <select
                    value={settings.dateFormat}
                    onChange={(e) => updateSetting('dateFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time Format
                  </label>
                  <select
                    value={settings.timeFormat}
                    onChange={(e) => updateSetting('timeFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="12h">12 Hour</option>
                    <option value="24h">24 Hour</option>
                  </select>
                </div>
              </div>
            </FormGroup>
          </ResponsiveGrid>
        )

      case 'appearance':
        return (
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap={6}>
            <FormGroup title="Theme Settings">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Theme Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
                      { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
                      { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> }
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => updateSetting('theme', theme.value)}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${settings.theme === theme.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                      >
                        {theme.icon}
                        <span className="text-sm font-medium mt-1">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="compact-mode"
                      checked={settings.compactMode}
                      onChange={(e) => updateSetting('compactMode', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="compact-mode" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Compact Mode
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="animations"
                      checked={settings.animations}
                      onChange={(e) => updateSetting('animations', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="animations" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Enable Animations
                    </label>
                  </div>
                </div>
              </div>
            </FormGroup>

            <FormGroup title="Display Preferences">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Preview</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Current Theme</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {settings.theme}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Compact Mode</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {settings.compactMode ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Animations</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {settings.animations ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </FormGroup>
          </ResponsiveGrid>
        )

      case 'notifications':
        return (
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap={6}>
            <FormGroup title="Notification Channels">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="email-notifications"
                    checked={settings.emailNotifications}
                    onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="email-notifications" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Email Notifications
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="push-notifications"
                    checked={settings.pushNotifications}
                    onChange={(e) => updateSetting('pushNotifications', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="push-notifications" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Push Notifications
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sound-enabled"
                    checked={settings.soundEnabled}
                    onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sound-enabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Sound Notifications
                  </label>
                </div>
              </div>
            </FormGroup>

            <FormGroup title="Alert Settings">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notification Frequency
                  </label>
                  <select
                    value={settings.notificationFrequency}
                    onChange={(e) => updateSetting('notificationFrequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="hourly">Hourly Digest</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Digest</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Alert Threshold
                  </label>
                  <select
                    value={settings.alertThreshold}
                    onChange={(e) => updateSetting('alertThreshold', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="low">Low (All Events)</option>
                    <option value="medium">Medium (Warnings & Errors)</option>
                    <option value="high">High (Errors Only)</option>
                    <option value="critical">Critical (Critical Only)</option>
                  </select>
                </div>
              </div>
            </FormGroup>
          </ResponsiveGrid>
        )

      case 'security':
        return (
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap={6}>
            <FormGroup title="Authentication">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                    min={5}
                    max={480}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Automatic logout after inactivity</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require-mfa"
                    checked={settings.requireMFA}
                    onChange={(e) => updateSetting('requireMFA', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="require-mfa" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Require Multi-Factor Authentication
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password Expiry (days)
                  </label>
                  <input
                    type="number"
                    value={settings.passwordExpiry}
                    onChange={(e) => updateSetting('passwordExpiry', parseInt(e.target.value))}
                    min={30}
                    max={365}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Force password change after this period</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={settings.loginAttempts}
                    onChange={(e) => updateSetting('loginAttempts', parseInt(e.target.value))}
                    min={3}
                    max={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Lock account after failed attempts</p>
                </div>
              </div>
            </FormGroup>

            <FormGroup title="Audit & Logging">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="audit-logging"
                    checked={settings.auditLogging}
                    onChange={(e) => updateSetting('auditLogging', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="audit-logging" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable Audit Logging
                  </label>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Security settings changes require administrator privileges and may require system restart.
                    </p>
                  </div>
                </div>
              </div>
            </FormGroup>
          </ResponsiveGrid>
        )

      case 'performance':
        return (
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap={6}>
            <FormGroup title="Data Refresh">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto-refresh"
                    checked={settings.autoRefresh}
                    onChange={(e) => updateSetting('autoRefresh', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto-refresh" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable Auto Refresh
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Refresh Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={settings.refreshInterval}
                    onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
                    min={5}
                    max={300}
                    disabled={!settings.autoRefresh}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">How often to refresh dashboard data</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enable-metrics"
                    checked={settings.enableMetrics}
                    onChange={(e) => updateSetting('enableMetrics', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable-metrics" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable Performance Metrics
                  </label>
                </div>
              </div>
            </FormGroup>

            <FormGroup title="Data Management">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data Retention (days)
                  </label>
                  <input
                    type="number"
                    value={settings.dataRetention}
                    onChange={(e) => updateSetting('dataRetention', parseInt(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">How long to keep historical data</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Log Level
                  </label>
                  <select
                    value={settings.logLevel}
                    onChange={(e) => updateSetting('logLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>
            </FormGroup>
          </ResponsiveGrid>
        )

      case 'api':
        return (
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap={6}>
            <FormGroup title="API Configuration">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Timeout (milliseconds)
                  </label>
                  <input
                    type="number"
                    value={settings.apiTimeout}
                    onChange={(e) => updateSetting('apiTimeout', parseInt(e.target.value))}
                    min={1000}
                    max={60000}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Request timeout for API calls</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rate-limit-enabled"
                    checked={settings.rateLimitEnabled}
                    onChange={(e) => updateSetting('rateLimitEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rate-limit-enabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable Rate Limiting
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="cors-enabled"
                    checked={settings.corsEnabled}
                    onChange={(e) => updateSetting('corsEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="cors-enabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable CORS
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="api-logging"
                    checked={settings.apiLogging}
                    onChange={(e) => updateSetting('apiLogging', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="api-logging" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable API Logging
                  </label>
                </div>
              </div>
            </FormGroup>

            <FormGroup title="Advanced Settings">
              <div className="space-y-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Settings</span>
                </button>

                {showAdvanced && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">API Version</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">v1.0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Rate Limit</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {settings.rateLimitEnabled ? '100 req/min' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">CORS</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {settings.corsEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </FormGroup>
          </ResponsiveGrid>
        )

      default:
        return <div>Settings content not found</div>
    }
  }, [activeTab, settings, updateSetting, showAdvanced])

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">System Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Configure system-wide settings and preferences</p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="inline-flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="hidden"
              />
            </label>
            <button
              onClick={handleExportSettings}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={handleResetSettings}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="space-y-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            renderSettingsContent()
          )}
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div className="text-green-700 dark:text-green-400 text-sm">Settings saved successfully!</div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default Settings