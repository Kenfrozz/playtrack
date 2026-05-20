import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import CoursesPage from './components/CoursesPage'

function getPreferredTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(getPreferredTheme)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? 'dark' : 'light')
    }

    setTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return (
    <TooltipProvider>
      <div className={cn(theme, 'h-screen flex flex-col bg-background text-foreground')}>
        <main className="flex-1 overflow-hidden bg-background">
          <CoursesPage />
        </main>
      </div>
    </TooltipProvider>
  )
}
