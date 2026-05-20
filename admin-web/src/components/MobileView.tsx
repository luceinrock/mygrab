import { useState } from 'react'
import { supabase } from '../lib/supabase'
import MobileLive from '../pages/mobile/MobileLive'
import MobileApprovals from '../pages/mobile/MobileApprovals'

type Tab = 'live' | 'approvals'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'live', label: 'Live', icon: '📡' },
  { id: 'approvals', label: 'Approvals', icon: '👤' },
]

export default function MobileView() {
  const [tab, setTab] = useState<Tab>('live')

  return (
    <div className="flex flex-col h-dvh bg-slate-100">
      {/* Header */}
      <header className="shrink-0 bg-navy-800 px-4 pt-safe-top">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
              style={{ background: 'linear-gradient(135deg, #0066FF 0%, #FF7A00 100%)' }}
            >
              RN
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">RideNow</p>
              <p className="text-steel-500 text-xs leading-none mt-0.5">Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
            <span className="text-xs text-steel-400 font-medium">Live</span>
          </div>
        </div>
      </header>

      {/* Page title */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3">
        <h1 className="text-base font-bold text-slate-800">
          {tab === 'live' ? 'Live Overview' : 'Driver Approvals'}
        </h1>
        <p className="text-xs text-slate-400">
          {tab === 'live'
            ? 'Real-time ride & driver activity'
            : 'Review pending driver applications'}
        </p>
      </div>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {tab === 'live' ? <MobileLive /> : <MobileApprovals />}
      </main>

      {/* Bottom nav */}
      <nav className="shrink-0 fixed bottom-0 inset-x-0 bg-navy-800 border-t border-white/[0.08] flex pb-safe-bottom">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              tab === t.id ? 'text-brand-300' : 'text-steel-500'
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="text-xs font-semibold">{t.label}</span>
            {tab === t.id && (
              <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-brand-500" />
            )}
          </button>
        ))}

        {/* Sign out */}
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-steel-600 hover:text-steel-400 transition-colors"
        >
          <span className="text-lg leading-none">↩</span>
          <span className="text-xs font-semibold">Sign out</span>
        </button>
      </nav>
    </div>
  )
}
