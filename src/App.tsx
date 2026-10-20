import {Suspense, lazy, useEffect, useLayoutEffect, useMemo} from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import {useSettingStore} from '@/shared/stores/settingStore'

const BaseLayout = lazy(() => import('@/shared/components/layout/BaseLayout'))
const HomePage = lazy(() => import('@/features/home/HomePage'))
const RepoPage = lazy(() => import('@/features/repo/RepoPage'))

/** How many loading fallbacks are mounted; the spinner shows while any are */
let mountedFallbacks = 0

function setBootSpinnerVisible(visible: boolean) {
  const spinner = document.getElementById('loading-spinner-wrapper')
  if (spinner) spinner.hidden = !visible
}

/** Shows the spinner from index.html while a lazy chunk loads */
function LoadingFallback() {
  useLayoutEffect(() => {
    mountedFallbacks++
    setBootSpinnerVisible(true)
    return () => {
      mountedFallbacks--
      if (mountedFallbacks === 0) setBootSpinnerVisible(false)
    }
  }, [])
  return null
}

function App() {
  const theme = useSettingStore(state => state.theme)

  // The spinner in index.html shows until the first render. Children's layout
  // effects run first, so a fallback mounted in the same commit keeps it.
  useLayoutEffect(() => {
    if (mountedFallbacks === 0) setBootSpinnerVisible(false)
  }, [])

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

  const loadingFallback = useMemo(() => <LoadingFallback />, [])

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
