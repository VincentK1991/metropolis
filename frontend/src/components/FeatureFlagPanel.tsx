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
    {
      flag: 'enableAgentV2' as const,
      label: 'Enable Agent V2',
      description: 'Shows the Agent V2 chat panel (containerized agent)',
    },
    {
      flag: 'enableLegacyHome' as const,
      label: 'Enable Legacy Home',
      description: 'Shows the legacy workspace page (Agent V1)',
    },
  ]

  return (
    <div className="w-80 max-h-96 overflow-y-auto">
      <div className="px-4 py-3 border-b border-white/20 dark:border-white/10">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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

