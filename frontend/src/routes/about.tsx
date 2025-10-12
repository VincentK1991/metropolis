import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="backdrop-blur-xl bg-white/70 dark:bg-deco-navy-500/70 backdrop-saturate-150 rounded-2xl dark:rounded-lg shadow-xl dark:shadow-2xl p-8 max-w-2xl w-full border border-white/40 dark:border-deco-gold/30 transition-all duration-300">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-nouveau-cream mb-6">About Ulam</h1>

        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p className="text-lg">
            This is a modern web application built with cutting-edge technologies.
          </p>

          <div className="backdrop-blur-lg bg-gradient-to-r from-nouveau-lavender/30 to-nouveau-rose/30 dark:from-deco-burgundy/40 dark:to-deco-emerald/40 rounded-xl dark:rounded-lg p-6 mt-6 border border-white/50 dark:border-deco-gold/30 shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-deco-gold mb-4">Tech Stack</h2>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">✓</span>
                <span className="dark:text-gray-200"><strong>React 19</strong> - UI library</span>
              </li>
              <li className="flex items-center">
                <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">✓</span>
                <span className="dark:text-gray-200"><strong>TypeScript</strong> - Type safety</span>
              </li>
              <li className="flex items-center">
                <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">✓</span>
                <span className="dark:text-gray-200"><strong>Vite</strong> - Build tool and dev server</span>
              </li>
              <li className="flex items-center">
                <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">✓</span>
                <span className="dark:text-gray-200"><strong>Tailwind CSS</strong> - Utility-first CSS framework</span>
              </li>
              <li className="flex items-center">
                <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">✓</span>
                <span className="dark:text-gray-200"><strong>TanStack Router</strong> - Type-safe routing</span>
              </li>
              <li className="flex items-center">
                <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">✓</span>
                <span className="dark:text-gray-200"><strong>TanStack Query</strong> - Data fetching & caching</span>
              </li>
              <li className="flex items-center">
                <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">✓</span>
                <span className="dark:text-gray-200"><strong>Axios</strong> - HTTP client</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
