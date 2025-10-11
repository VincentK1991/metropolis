import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AgentChatProvider } from '../contexts/AgentChatContext'

export const Route = createRootRoute({
  component: () => (
    <AgentChatProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <nav className="bg-white shadow-lg flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-8">
                <Link
                  to="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-indigo-600"
                  activeProps={{
                    className: 'border-b-2 border-indigo-500',
                  }}
                >
                  Home
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-indigo-600"
                  activeProps={{
                    className: 'border-b-2 border-indigo-500',
                  }}
                >
                  About
                </Link>
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
  ),
})
