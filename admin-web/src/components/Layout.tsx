import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/rides', label: 'Live Rides', icon: '🚗' },
  { to: '/drivers', label: 'Drivers', icon: '👤' },
  { to: '/riders', label: 'Riders', icon: '🧑' },
  { to: '/pricing', label: 'Pricing', icon: '💰' },
  { to: '/config', label: 'Config', icon: '⚙️' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r flex flex-col">
        <div className="px-5 py-4 border-b">
          <span className="font-bold text-gray-800">RideNow Admin</span>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t">
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
