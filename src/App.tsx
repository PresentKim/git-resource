import {Suspense, lazy, useEffect, useMemo} from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import {useSettingStore} from '@/stores/settingStore'

const BaseLayout = lazy(() => import('@/layout/BaseLayout'))
const Home = lazy(() => import('@/pages/Home'))
const RepoView = lazy(() => import('@/pages/RepoView'))

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
            <Route path="/" element={<Home />} />
            <Route path="/*" element={<RepoView />} />
          </Route>
        </Routes>
      </Router>
    </Suspense>
  )
}

export default App
