import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AgentChatProvider } from '../contexts/AgentChatContext'
import { WorkspaceThreadProvider } from '../contexts/WorkspaceThreadContext'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'
import { FeatureFlagProvider, useFeatureFlags } from '../contexts/FeatureFlagContext'
import { ThemeToggle } from '../components/ThemeToggle'
import { ProfileMenu } from '../components/ProfileMenu'

function RootLayout() {
  const { flags } = useFeatureFlags()
  const { theme } = useTheme()

  return (
    <div className="flex flex-col h-screen relative overflow-hidden transition-all duration-300">
      {/* Algorithmic art background */}
      <iframe
        src={theme === 'dark' ? '/assets/dark_mode_bg.html' : '/assets/light_mode_bg.html'}
        className="fixed inset-0 w-full h-full border-0 pointer-events-none z-0"
        style={{ zIndex: 0 }}
        title="Background"
      />
      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-screen">
      <nav className="glass-light dark:glass-dark backdrop-saturate-180 shadow-lg flex-shrink-0 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              {flags.enableLegacyHome && (
                <Link
                  to="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  activeProps={{
                    className: 'border-b-2 border-blue-500 dark:border-blue-400',
                  }}
                >
                  Home
                </Link>
              )}
              {flags.enableChatPage && (
                <Link
                  to="/chat"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  activeProps={{
                    className: 'border-b-2 border-blue-500 dark:border-blue-400',
                  }}
                >
                  Chat
                </Link>
              )}
              {flags.enableSkills && (
                <Link
                  to="/skills"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  activeProps={{
                    className: 'border-b-2 border-blue-500 dark:border-blue-400',
                  }}
                >
                  Skills
                </Link>
              )}
              {flags.enableWorkflow && (
                <Link
                  to="/workflow"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  activeProps={{
                    className: 'border-b-2 border-blue-500 dark:border-blue-400',
                  }}
                >
                  Workflow
                </Link>
              )}
              {flags.enableAgentV2 && (
                <Link
                  to="/agentV2"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  activeProps={{
                    className: 'border-b-2 border-blue-500 dark:border-blue-400',
                  }}
                >
                  Agent V2
                </Link>
              )}
              {flags.enableLocalTesting && (
                <Link
                  to="/localAgentV2"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  activeProps={{
                    className: 'border-b-2 border-blue-500 dark:border-blue-400',
                  }}
                >
                  Local Testing
                </Link>
              )}
              <Link
                to="/about"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-nouveau-cream hover:text-nouveau-lavender-500 dark:hover:text-deco-gold transition-colors"
                activeProps={{
                  className: 'border-b-2 border-nouveau-lavender-400 dark:border-deco-gold',
                }}
              >
                About
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <ProfileMenu />
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <FeatureFlagProvider>
        <AgentChatProvider>
          <WorkspaceThreadProvider>
            <RootLayout />
            <TanStackRouterDevtools />
          </WorkspaceThreadProvider>
        </AgentChatProvider>
      </FeatureFlagProvider>
    </ThemeProvider>
  ),
})
