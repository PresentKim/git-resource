import {Outlet} from 'react-router-dom'

import Header from './components/Header'
import Footer from './components/Footer'

export default function BaseLayout() {
  return (
    <>
      <div className="flex h-full w-full max-w-full flex-col">
        <Header />
        <main className="flex flex-1 w-full justify-start px-2 py-4 sm:px-4">
          <Outlet />
        </main>
        <Footer />
      </div>
    </>
  )
}
