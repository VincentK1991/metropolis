import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="backdrop-blur-xl bg-white/70 dark:bg-deco-navy-500/70 backdrop-saturate-150 rounded-2xl dark:rounded-lg shadow-xl dark:shadow-2xl p-8 max-w-2xl w-full border border-white/40 dark:border-deco-gold/30 transition-all duration-300">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-nouveau-cream mb-6">About Metropolis</h1>

        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p className="text-lg text-nouveau-lavender-700 dark:text-nouveau-cream/90 mb-6">
            Metropolis is a modern AI agent platform that brings together the power of Claude AI with beautiful, intuitive interfaces. Built with cutting-edge technologies, it provides seamless conversations and intelligent assistance.
          </p>

          <p className="text-base text-nouveau-lavender-600 dark:text-nouveau-cream/80 mb-8 bg-nouveau-lavender-50 dark:bg-deco-navy/30 p-4 rounded-lg border border-nouveau-lavender-200 dark:border-deco-gold/20">
            This web application is named after <strong>Nicholas Metropolis</strong> (1915-1999), a pioneering mathematician and physicist who made fundamental contributions to computer science. Metropolis co-developed the Monte Carlo method for computational simulations, worked on the Manhattan Project, and was instrumental in early computer development at Los Alamos. His work laid the foundation for modern computational physics and statistical mechanics, making him a fitting namesake for an AI platform that bridges mathematics, computation, and intelligent problem-solving. The name "Metropolis" is also a clever pun, as our AI is powered by <strong>Claude</strong> (named after Claude Shannon, the father of information theory), creating a connection between two giants of computational mathematics.
          </p>

          <div className="backdrop-blur-lg bg-gradient-to-r from-nouveau-lavender/30 to-nouveau-rose/30 dark:from-deco-burgundy/40 dark:to-deco-emerald/40 rounded-xl dark:rounded-lg p-6 mt-6 border border-white/50 dark:border-deco-gold/30 shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-deco-gold mb-4">Tech Stack</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-700 dark:text-nouveau-cream mb-3">AI & Backend</h3>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">🤖</span>
                    <span className="dark:text-gray-200"><strong>Claude Agent SDK</strong> - AI agent runtime</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">🐍</span>
                    <span className="dark:text-gray-200"><strong>FastAPI</strong> - Python web framework</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">🗄️</span>
                    <span className="dark:text-gray-200"><strong>MongoDB</strong> - Document database</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">🧠</span>
                    <span className="dark:text-gray-200"><strong>Skills System</strong> - Reusable AI capabilities</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">⚙️</span>
                    <span className="dark:text-gray-200"><strong>Code Execution</strong> - Dynamic workflow processing</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-700 dark:text-nouveau-cream mb-3">Frontend</h3>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">⚛️</span>
                    <span className="dark:text-gray-200"><strong>React 19</strong> - UI library</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">📘</span>
                    <span className="dark:text-gray-200"><strong>TypeScript</strong> - Type safety</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">⚡</span>
                    <span className="dark:text-gray-200"><strong>Vite</strong> - Build tool and dev server</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">🎨</span>
                    <span className="dark:text-gray-200"><strong>Tailwind CSS</strong> - Utility-first CSS</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">🛣️</span>
                    <span className="dark:text-gray-200"><strong>TanStack Router</strong> - Type-safe routing</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-nouveau-lavender-500 dark:text-deco-emerald mr-2">🔄</span>
                    <span className="dark:text-gray-200"><strong>Server-Sent Events</strong> - Real-time streaming</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
