import { useTheme } from '../contexts/ThemeContext'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-14 h-14 rounded-full transition-all duration-300
        hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2
        backdrop-blur-lg backdrop-saturate-150
        ${theme === 'light'
          ? 'bg-gradient-to-br from-nouveau-lavender-300/80 to-nouveau-rose-300/80 focus:ring-nouveau-lavender/50 shadow-lg hover:shadow-xl border border-white/60'
          : 'bg-gradient-to-br from-deco-navy/85 to-deco-burgundy/85 focus:ring-deco-gold/50 shadow-xl hover:shadow-2xl border border-deco-gold/40'
        }
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {theme === 'light' ? (
          // Sun icon with Art Nouveau curved rays
          <svg
            className="w-7 h-7 text-yellow-500 transition-transform duration-300"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          // Moon icon with Art Deco geometric accents
          <svg
            className="w-7 h-7 text-deco-gold transition-transform duration-300"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            <path d="M19 9l-1 1m-2-4l-1 1m4 5l-1-1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
        )}
      </div>

      {/* Glass highlight effect */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)',
          boxShadow: theme === 'light'
            ? 'inset 0 2px 8px rgba(255,255,255,0.4), inset 0 -2px 8px rgba(0,0,0,0.05)'
            : 'inset 0 2px 8px rgba(212,160,55,0.3), inset 0 -2px 8px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  )
}

