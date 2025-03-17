import {Outlet} from 'react-router-dom'
import {SearchDialog} from '@/components/SearchDialog'

import Header from './components/Header'
import Footer from './components/Footer'

export default function BaseLayout() {
  return (
    <>
      <div className="flex flex-col h-full w-full max-w-full">
        <Header />
        <main className="flex flex-col flex-1 justify-start items-center w-full px-4 py-4 space-y-6">
          <Outlet />
        </main>
        <Footer />
      </div>
      <SearchDialog />
    </>
  )
}
