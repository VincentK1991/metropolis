import React from 'react'
import { FeatureFlags } from '../contexts/FeatureFlagContext'

interface FeatureFlagToggleProps {
  flag: keyof FeatureFlags
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}

export const FeatureFlagToggle: React.FC<FeatureFlagToggleProps> = ({
  flag,
  label,
  description,
  enabled,
  onToggle,
}) => {
  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-white/10 dark:hover:bg-white/5 rounded-lg transition-colors">
      <div className="flex-1 mr-4">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {description}
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 ${
          enabled
            ? 'bg-blue-500 dark:bg-blue-400'
            : 'bg-gray-300 dark:bg-gray-600'
        }`}
        role="switch"
        aria-checked={enabled}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

