import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'

export function MainLayout() {
  const location = useLocation()
  const showTopbar = location.pathname === '/app' || location.pathname === '/app/dashboard'

  return (
    <div className="app-shell app-shell--collapsed">
      <Sidebar />
      <div className="app-shell__content">
        {showTopbar ? <Topbar /> : null}
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
