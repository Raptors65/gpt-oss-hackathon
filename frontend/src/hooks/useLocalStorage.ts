import { useState, useEffect, useCallback } from 'react'

type SetValue<T> = (value: T | ((prev: T) => T)) => void

export const useLocalStorage = <T>(key: string, initialValue: T): [T, SetValue<T>] => {
  // Safely read from localStorage (or return initialValue on SSR)
  const getStoredValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue

    try {
      const item = window.localStorage.getItem(key)
      if (item === null) return initialValue
      return JSON.parse(item) as T
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  }, [key, initialValue])

  // Initialize lazily so SSR returns initialValue and client can hydrate
  const [storedValue, setStoredValue] = useState<T>(getStoredValue)

  // Stable setter: DOES NOT depend on storedValue so identity is stable
  const setValue: SetValue<T> = useCallback((value) => {
    try {
      // Use functional update for state so we don't need storedValue from closure
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? (value as (prev: T) => T)(prev) : value

        // write to localStorage (guard for SSR)
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
          } catch (err) {
            console.warn(`Error writing localStorage key "${key}":`, err)
          }
        }

        return valueToStore
      })
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }, [key])

  // Listen for storage events from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key) return
      try {
        const newValue = e.newValue ? JSON.parse(e.newValue) : initialValue
        setStoredValue(newValue)
      } catch (error) {
        console.warn(`Error parsing storage event for key "${key}":`, error)
        setStoredValue(initialValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, initialValue])

  // Sync with localStorage on mount (hydrate). Only replace state if actual difference.
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const valueOnDisk = getStoredValue()
      // Only set state if the stored value differs (avoid replacing with a new object ref)
      const prevSerialized = JSON.stringify(storedValue)
      const diskSerialized = JSON.stringify(valueOnDisk)
      if (prevSerialized !== diskSerialized) {
        setStoredValue(valueOnDisk)
      }
    } catch (err) {
      // If any serialization error, keep current state
      console.warn(`Error syncing localStorage key "${key}" on mount:`, err)
    }
    // NOTE: intentionally not adding `storedValue` as a dependency to avoid running repeatedly.
    // We only want this to run on mount / when getStoredValue changes.
  }, [getStoredValue])

  return [storedValue, setValue]
}
