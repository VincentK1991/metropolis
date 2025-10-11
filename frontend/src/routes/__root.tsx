import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AgentChatProvider } from '../contexts/AgentChatContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import { ThemeToggle } from '../components/ThemeToggle'

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <AgentChatProvider>
        <div className="flex flex-col h-screen bg-gradient-to-br from-nouveau-lavender/40 via-nouveau-rose/30 to-nouveau-mint/40 dark:from-deco-navy dark:via-deco-burgundy/50 dark:to-gray-900 pattern-nouveau dark:pattern-deco transition-all duration-300">
          <nav className="bg-white/95 dark:bg-deco-navy/95 backdrop-blur-sm shadow-lg flex-shrink-0 border-b-3 border-nouveau-lavender/50 dark:border-deco-gold/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex space-x-8">
                  <Link
                    to="/"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-nouveau-cream hover:text-nouveau-lavender-500 dark:hover:text-deco-gold transition-colors"
                    activeProps={{
                      className: 'border-b-2 border-nouveau-lavender-400 dark:border-deco-gold',
                    }}
                  >
                    Home
                  </Link>
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
                <div className="flex items-center">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </nav>
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
        <TanStackRouterDevtools />
      </AgentChatProvider>
    </ThemeProvider>
  ),
})
