import React, { createContext, useContext, useState, useEffect } from 'react'

export interface FeatureFlags {
  enableChatPage: boolean
  enableWorkflow: boolean
  enableSkills: boolean
}

interface FeatureFlagContextType {
  flags: FeatureFlags
  toggleFlag: (flag: keyof FeatureFlags) => void
  setFlag: (flag: keyof FeatureFlags, value: boolean) => void
}

const defaultFlags: FeatureFlags = {
  enableChatPage: false, // Hidden by default (WebSocket not production ready)
  enableWorkflow: true, // Visible by default
  enableSkills: true, // Visible by default
}

const STORAGE_KEY = 'metropolis-feature-flags'

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(
  undefined
)

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [flags, setFlags] = useState<FeatureFlags>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to handle new flags
        return { ...defaultFlags, ...parsed }
      }
    } catch (error) {
      console.error('Failed to load feature flags from localStorage:', error)
    }
    return defaultFlags
  })

  // Persist to localStorage whenever flags change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
    } catch (error) {
      console.error('Failed to save feature flags to localStorage:', error)
    }
  }, [flags])

  const toggleFlag = (flag: keyof FeatureFlags) => {
    setFlags((prev) => ({
      ...prev,
      [flag]: !prev[flag],
    }))
  }

  const setFlag = (flag: keyof FeatureFlags, value: boolean) => {
    setFlags((prev) => ({
      ...prev,
      [flag]: value,
    }))
  }

  return (
    <FeatureFlagContext.Provider value={{ flags, toggleFlag, setFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext)
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider')
  }
  return context
}

export const useFeatureFlag = (flag: keyof FeatureFlags) => {
  const { flags } = useFeatureFlags()
  return flags[flag]
}

