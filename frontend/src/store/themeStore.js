import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // default dark mode
      toggleTheme: (event) => {
        const currentTheme = get().theme
        const next = currentTheme === 'dark' ? 'light' : 'dark'

        // Check if browser supports View Transitions API and not reduced-motion
        const isAppearanceTransition =
          typeof document !== 'undefined' &&
          'startViewTransition' in document &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (!isAppearanceTransition) {
          // Fallback with smooth CSS transition
          document.documentElement.classList.add('theme-transition')
          set({ theme: next })
          if (next === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
          setTimeout(() => {
            document.documentElement.classList.remove('theme-transition')
          }, 500)
          return
        }

        // Circular ripple animation from the click coordinates
        const x = event?.clientX ?? window.innerWidth / 2
        const y = event?.clientY ?? 0
        const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        )

        const transition = document.startViewTransition(() => {
          set({ theme: next })
          if (next === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        })

        transition.ready.then(() => {
          const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ]
          document.documentElement.animate(
            {
              clipPath: clipPath,
            },
            {
              duration: 500,
              easing: 'ease-in-out',
              pseudoElement: '::view-transition-new(root)',
            }
          )
        })
      },
      setTheme: (theme) => {
        set({ theme })
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
      initTheme: () => {
        const current = get().theme || 'dark'
        if (current === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    }),
    { name: 'cpo-theme' }
  )
)
