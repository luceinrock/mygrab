import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MobileView from './MobileView'

const links = [
  { to: '/', label: 'Dashboard', icon: '⊞', live: false },
  { to: '/rides', label: 'Live Rides', icon: '🚗', live: true },
  { to: '/ride-history', label: 'Ride History', icon: '🗂️', live: false },
  { to: '/driver-map', label: 'Driver Map', icon: '🗺️', live: false },
  { to: '/drivers', label: 'Drivers', icon: '👤', live: false },
  { to: '/riders', label: 'Riders', icon: '🧑', live: false },
  { to: '/pricing', label: 'Pricing', icon: '💰', live: false },
  { to: '/promos', label: 'Promo Codes', icon: '🎟️', live: false },
  { to: '/config', label: 'Config', icon: '⚙️', live: false },
  { to: '/logs', label: 'System Logs', icon: '📋', live: false },
]

export default function Layout() {
  return (
    <>
      {/* Mobile — shown only on small screens */}
      <div className="md:hidden">
        <MobileView />
      </div>

      {/* Desktop — hidden on small screens */}
      <div className="hidden md:flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-60 bg-navy-800 flex flex-col shrink-0 shadow-2xl">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
              style={{ background: 'linear-gradient(135deg, #0066FF 0%, #FF7A00 100%)' }}
            >
              RN
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">RideNow</p>
              <p className="text-steel-500 text-xs mt-1 leading-none">Admin Console</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border-l-4 ${
                  isActive
                    ? 'bg-brand-500/[0.15] text-brand-300 border-brand-500'
                    : 'text-steel-400 hover:bg-white/[0.05] hover:text-steel-300 border-transparent'
                }`
              }
            >
              <span className="text-base leading-none w-5 text-center shrink-0">{l.icon}</span>
              <span className="truncate">{l.label}</span>
              {l.live && (
                <span className="ml-auto w-2 h-2 rounded-full bg-accent-500 animate-pulse shrink-0" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/[0.07]">
          <div className="px-3 py-1 mb-3">
            <p className="text-steel-500 text-xs">Logged in as admin</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-2 text-xs text-steel-500 hover:text-steel-300 px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <span>↩</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
            <span className="text-xs font-medium text-steel-500">Live System</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </>
  )
}
