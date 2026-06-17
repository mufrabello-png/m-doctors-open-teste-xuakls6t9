import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'

export function useSystemConfigs() {
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const fetchConfigs = async () => {
    try {
      const res = await pb.send('/backend/v1/settings', { method: 'GET' })
      setConfigs(res || {})
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const saveConfigs = async (newConfigs: Record<string, string>) => {
    try {
      await pb.send('/backend/v1/settings', {
        method: 'POST',
        body: JSON.stringify(newConfigs),
      })
      await fetchConfigs()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  return { configs, saveConfigs, loading }
}
