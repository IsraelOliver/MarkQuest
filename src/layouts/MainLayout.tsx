import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'

export function MainLayout() {
  const location = useLocation()
  const showTopbar = location.pathname === '/app' || location.pathname === '/app/dashboard'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'app-shell--collapsed' : ''}`}>
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed((current) => !current)} />
      <div className="app-shell__content">
        {showTopbar ? <Topbar /> : null}
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
