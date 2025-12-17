import {Suspense, lazy, useEffect, useMemo} from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import {useSettingStore} from '@/shared/stores/settingStore'

const BaseLayout = lazy(() => import('@/shared/components/layout/BaseLayout'))
const HomePage = lazy(() => import('@/features/home/HomePage'))
const RepoPage = lazy(() => import('@/features/repo/RepoPage'))

/**
 * Apply theme to document root
 */
function applyTheme(theme: 'light' | 'dark'): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

function App() {
  const theme = useSettingStore(state => state.theme)

  useEffect(() => {
    applyTheme(theme)
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
