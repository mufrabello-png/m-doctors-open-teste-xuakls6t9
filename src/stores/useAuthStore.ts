import { useState, useEffect } from 'react'

let globalIsAuthenticated = false
let listeners: (() => void)[] = []

const notify = () => {
  listeners.forEach((listener) => listener())
}

export default function useAuthStore() {
  const [isAuthenticated, setIsAuthenticated] = useState(globalIsAuthenticated)

  useEffect(() => {
    const handleStoreChange = () => setIsAuthenticated(globalIsAuthenticated)
    listeners.push(handleStoreChange)
    return () => {
      listeners = listeners.filter((l) => l !== handleStoreChange)
    }
  }, [])

  const login = () => {
    globalIsAuthenticated = true
    notify()
  }

  const logout = () => {
    globalIsAuthenticated = false
    notify()
  }

  return { isAuthenticated, login, logout }
}
