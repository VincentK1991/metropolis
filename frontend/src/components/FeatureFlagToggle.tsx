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
    <div className="flex items-center justify-between py-3 px-4 hover:bg-nouveau-lavender-100 dark:hover:bg-deco-navy-400 rounded-lg transition-colors">
      <div className="flex-1 mr-4">
        <div className="text-sm font-medium text-gray-900 dark:text-nouveau-cream">
          {label}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {description}
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-nouveau-lavender-400 dark:focus:ring-deco-gold focus:ring-offset-2 ${
          enabled
            ? 'bg-nouveau-lavender-400 dark:bg-deco-gold'
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

