import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">About Ulam</h1>

        <div className="space-y-4 text-gray-700">
          <p className="text-lg">
            This is a modern web application built with cutting-edge technologies.
          </p>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mt-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Tech Stack</h2>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-indigo-600 mr-2">✓</span>
                <span><strong>React 19</strong> - UI library</span>
              </li>
              <li className="flex items-center">
                <span className="text-indigo-600 mr-2">✓</span>
                <span><strong>TypeScript</strong> - Type safety</span>
              </li>
              <li className="flex items-center">
                <span className="text-indigo-600 mr-2">✓</span>
                <span><strong>Vite</strong> - Build tool and dev server</span>
              </li>
              <li className="flex items-center">
                <span className="text-indigo-600 mr-2">✓</span>
                <span><strong>Tailwind CSS</strong> - Utility-first CSS framework</span>
              </li>
              <li className="flex items-center">
                <span className="text-indigo-600 mr-2">✓</span>
                <span><strong>TanStack Router</strong> - Type-safe routing</span>
              </li>
              <li className="flex items-center">
                <span className="text-indigo-600 mr-2">✓</span>
                <span><strong>TanStack Query</strong> - Data fetching & caching</span>
              </li>
              <li className="flex items-center">
                <span className="text-indigo-600 mr-2">✓</span>
                <span><strong>Axios</strong> - HTTP client</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
