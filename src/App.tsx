import {Suspense, lazy, useEffect} from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import {useSettingStore} from '@/stores/settingStore'

const BaseLayout = lazy(() => import('@/layout/BaseLayout'))
const Home = lazy(() => import('@/pages/Home'))
const RepoView = lazy(() => import('@/pages/RepoView'))

function App() {
  const theme = useSettingStore(state => state.theme)

  useEffect(() => {
    const applyTheme = (currentTheme: typeof theme) => {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(currentTheme)
    }

    applyTheme(theme)
  }, [theme])

  return (
    <Suspense fallback={<div className="loading"></div>}>
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
