import {Suspense, lazy, useEffect, useMemo} from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import {useSettingStore} from '@/shared/stores/settingStore'

const BaseLayout = lazy(() => import('@/shared/components/layout/BaseLayout'))
const HomePage = lazy(() => import('@/features/home/HomePage'))
const RepoPage = lazy(() => import('@/features/repo/RepoPage'))

function App() {
  const theme = useSettingStore(state => state.theme)

  useEffect(() => {
    /** Apply theme to document root */
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    let mediaQuery: MediaQueryList | undefined

    if (theme === 'system') {
      const applySystemTheme = () => {
        const systemDark = window.matchMedia(
          '(prefers-color-scheme: dark)',
        ).matches
        root.classList.remove('light', 'dark')
        root.classList.add(systemDark ? 'dark' : 'light')
      }
      applySystemTheme()
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', applySystemTheme)

      // Clean up event listener on unmount or when theme changes
      return () => {
        mediaQuery?.removeEventListener('change', applySystemTheme)
      }
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  const loadingFallback = useMemo(
    () => <div className="loading" aria-label="Loading application" />,
    [],
  )

  return (
    <Suspense fallback={loadingFallback}>
      <Router>
        <Routes>
          <Route element={<BaseLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/*" element={<RepoPage />} />
          </Route>
        </Routes>
      </Router>
    </Suspense>
  )
}

export default App
