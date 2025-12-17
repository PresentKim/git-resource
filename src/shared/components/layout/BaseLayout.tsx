import {Outlet} from 'react-router-dom'

import Header from './Header'

export default function BaseLayout() {
  return (
    <>
      <div className="flex h-full w-full max-w-full flex-col">
        <Header />
        <main className="flex flex-1 w-full justify-start">
          <Outlet />
        </main>
      </div>
    </>
  )
}
