import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from './use-auth'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (!user) return
    pb.collection('profiles')
      .getFirstListItem(`user_id = "${user.id}"`)
      .then((res) => setProfile(res))
      .catch(() => setProfile(null))
  }, [user])

  return { profile }
}
