import {Suspense, lazy} from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'

const BaseLayout = lazy(() => import('@/layout/BaseLayout'))
const Home = lazy(() => import('@/pages/Home'))
const RepoView = lazy(() => import('@/pages/RepoView'))

function App() {
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
