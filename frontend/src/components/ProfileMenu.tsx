import React, { useState, useRef, useEffect } from 'react'
import { FeatureFlagPanel } from './FeatureFlagPanel'

export const ProfileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-nouveau-lavender-200 dark:hover:bg-deco-navy-400 transition-colors focus:outline-none focus:ring-2 focus:ring-nouveau-lavender-400 dark:focus:ring-deco-gold"
        aria-label="Profile menu"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6 text-gray-900 dark:text-nouveau-cream"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg shadow-xl bg-white dark:bg-deco-navy-600 border border-gray-200 dark:border-gray-700 z-50">
          <FeatureFlagPanel />

          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p>Metropolis v1.0.0</p>
              <p className="mt-1">Feature flags are saved locally</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

