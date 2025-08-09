import { useState, useEffect } from 'react'

const useServerCount = () => {
  const [serverCount, setServerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchServerCount = async () => {
    try {
      const response = await fetch('/api/v1/servers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer dev_api_key_123`
        }
      })

      if (response.ok) {
        const servers = await response.json()
        setServerCount(Array.isArray(servers) ? servers.length : 0)
      } else {
        setServerCount(0)
      }
    } catch (error) {
      console.error('Failed to fetch server count:', error)
      setServerCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServerCount()
    
    // Refresh server count every 30 seconds
    const interval = setInterval(fetchServerCount, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return { serverCount, loading, refetch: fetchServerCount }
}

export default useServerCount