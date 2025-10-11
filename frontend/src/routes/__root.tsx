import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <nav className="bg-white shadow-lg">
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
        <main>
          <Outlet />
        </main>
      </div>
      <TanStackRouterDevtools />
    </>
  ),
})
