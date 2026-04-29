import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const links = [
  { to: '/app/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/app/units', label: 'Unidades', icon: 'units' },
  { to: '/app/account-settings', label: 'Configurações da conta', icon: 'settings' },
]

export function Sidebar() {
  const { logout, user } = useAuth()

  return (
    <aside className="sidebar sidebar--collapsed">
      <div className="sidebar__top">
        <div className="sidebar__brand">
          <span className="sidebar__logo">MQ</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
            aria-label={link.label}
          >
            <>
              <span className="sidebar__icon" aria-hidden="true">
                {link.icon === 'dashboard' ? (
                  <svg viewBox="0 0 24 24" focusable="false">
                    <rect x="3" y="3" width="8" height="8" rx="2" />
                    <rect x="13" y="3" width="8" height="5" rx="2" />
                    <rect x="13" y="10" width="8" height="11" rx="2" />
                    <rect x="3" y="13" width="8" height="8" rx="2" />
                  </svg>
                ) : link.icon === 'settings' ? (
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M12 8.75A3.25 3.25 0 1 0 12 15.25A3.25 3.25 0 1 0 12 8.75Z" />
                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.33 7.33 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.49-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.58.22-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.84a.5.5 0 0 0 .49-.42l.36-2.54c.58-.22 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M4 20V8.5L12 4l8 4.5V20h-5v-6h-6v6H4Z" />
                  </svg>
                )}
              </span>
              <>
                <span className="sidebar__tooltip" role="tooltip">
                  {link.label}
                </span>
              </>
            </>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__session">
        <button className="sidebar__link sidebar__button" type="button" onClick={() => void logout()} aria-label="Sair">
          <span className="sidebar__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M10 4H5v16h5v-2H7V6h3V4Zm4.7 3.3-1.4 1.4 2.3 2.3H10v2h5.6l-2.3 2.3 1.4 1.4L19.4 12l-4.7-4.7Z" />
            </svg>
          </span>
          <span className="sidebar__tooltip" role="tooltip">
            Sair{user ? ` - ${user.name}` : ''}
          </span>
        </button>
      </div>
    </aside>
  )
}
