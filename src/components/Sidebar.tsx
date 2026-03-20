import { NavLink } from 'react-router-dom'

const links = [
  { to: '/app/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/app/units', label: 'Unidades', icon: 'units' },
]

type SidebarProps = {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__top">
        <div className="sidebar__brand">
          <span className="sidebar__logo">MQ</span>
          {!isCollapsed ? (
            <div>
              <strong>MarkQuest</strong>
              <small>OMR Platform</small>
            </div>
          ) : null}
        </div>

        {!isCollapsed ? (
          <button type="button" className="sidebar__toggle" onClick={onToggle} aria-label="Fechar menu lateral">
            <span />
            <span />
            <span />
          </button>
        ) : null}
      </div>

      <nav className="sidebar__nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
            aria-label={link.label}
          >
            {isCollapsed ? (
              <span className="sidebar__icon" aria-hidden="true">
                {link.icon === 'dashboard' ? (
                  <svg viewBox="0 0 24 24" focusable="false">
                    <rect x="3" y="3" width="8" height="8" rx="2" />
                    <rect x="13" y="3" width="8" height="5" rx="2" />
                    <rect x="13" y="10" width="8" height="11" rx="2" />
                    <rect x="3" y="13" width="8" height="8" rx="2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M4 20V8.5L12 4l8 4.5V20h-5v-6h-6v6H4Z" />
                  </svg>
                )}
              </span>
            ) : (
              link.label
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
