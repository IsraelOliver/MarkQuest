import { NavLink } from 'react-router-dom'

const links = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/uploads', label: 'Uploads' },
  { to: '/app/results', label: 'Resultados' },
  { to: '/app/templates', label: 'Modelos' },
  { to: '/app/answer-keys', label: 'Gabaritos' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">MQ</span>
        <div>
          <strong>MarkQuest</strong>
          <small>OMR Platform</small>
        </div>
      </div>

      <nav className="sidebar__nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
