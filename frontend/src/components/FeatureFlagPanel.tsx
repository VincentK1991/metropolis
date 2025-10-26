import React from 'react'
import { useFeatureFlags } from '../contexts/FeatureFlagContext'
import { FeatureFlagToggle } from './FeatureFlagToggle'

export const FeatureFlagPanel: React.FC = () => {
  const { flags, toggleFlag } = useFeatureFlags()

  const featureFlagDefinitions = [
    {
      flag: 'enableChatPage' as const,
      label: 'Enable Chat Page',
      description: 'Shows the WebSocket-based chat tab in navigation',
    },
    {
      flag: 'enableSkills' as const,
      label: 'Enable Skills',
      description: 'Shows the Skills tab in navigation',
    },
    {
      flag: 'enableWorkflow' as const,
      label: 'Enable Workflow',
      description: 'Shows the Workflow tab in navigation',
    },
  ]

  return (
    <div className="w-80 max-h-96 overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-nouveau-cream">
          Feature Flags
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Toggle experimental and advanced features
        </p>
      </div>
      <div className="py-2">
        {featureFlagDefinitions.map((def) => (
          <FeatureFlagToggle
            key={def.flag}
            flag={def.flag}
            label={def.label}
            description={def.description}
            enabled={flags[def.flag]}
            onToggle={() => toggleFlag(def.flag)}
          />
        ))}
      </div>
    </div>
  )
}

