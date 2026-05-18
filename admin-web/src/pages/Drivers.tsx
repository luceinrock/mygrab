import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Driver {
  id: string
  full_name: string
  email: string
  phone: string
  verification_status: string
  is_online: boolean
  rating_average: number
  total_rides: number
  vehicle_make: string
  vehicle_model: string
  plate_number: string
  created_at: string
  wallet_balance: number
  wallet_state: string
}

const TABS = ['pending', 'verified', 'suspended'] as const
type Tab = typeof TABS[number]

const TAB_COLOR: Record<Tab, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  verified: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
}

const WALLET_COLOR: Record<string, string> = {
  ACTIVE_GREEN: 'text-green-600',
  ACTIVE_YELLOW: 'text-yellow-600',
  BLOCKED_RED: 'text-red-600 font-semibold',
}

export default function Drivers() {
  const [tab, setTab] = useState<Tab>('pending')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [topupId, setTopupId] = useState<string | null>(null)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupNote, setTopupNote] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)

  function load(status: Tab) {
    setLoading(true)
    api.get<{ drivers: Driver[] }>(`/api/v1/admin/drivers?status=${status}`)
      .then(r => setDrivers(r.drivers))
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  async function approve(id: string) {
    setActionId(id)
    await api.post(`/api/v1/admin/drivers/${id}/approve`).catch(() => {})
    setActionId(null)
    load(tab)
  }

  async function suspend(id: string) {
    setActionId(id)
    await api.post(`/api/v1/admin/drivers/${id}/suspend`).catch(() => {})
    setActionId(null)
    load(tab)
  }

  async function reject(id: string) {
    setActionId(id)
    await api.post(`/api/v1/admin/drivers/${id}/reject`).catch(() => {})
    setActionId(null)
    load(tab)
  }

  async function submitTopup() {
    if (!topupId) return
    const amount = parseFloat(topupAmount)
    if (isNaN(amount) || amount <= 0) return
    setTopupLoading(true)
    await api.post(`/api/v1/admin/drivers/${topupId}/topup`, { amount, note: topupNote || 'Cash top-up at office' }).catch(() => {})
    setTopupLoading(false)
    setTopupId(null)
    setTopupAmount('')
    setTopupNote('')
    load(tab)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Drivers</h2>

      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? TAB_COLOR[t] : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : drivers.length === 0 ? (
        <p className="text-gray-400 text-sm">No {tab} drivers.</p>
      ) : (
        <div className="space-y-3">
          {drivers.map(d => (
            <div key={d.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{d.full_name}</p>
                  <p className="text-sm text-gray-500">{d.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {d.vehicle_make} {d.vehicle_model} · {d.plate_number} · ⭐ {d.rating_average} · {d.total_rides} rides
                  </p>
                  <p className={`text-xs mt-1 ${WALLET_COLOR[d.wallet_state] ?? 'text-gray-500'}`}>
                    Credits: ₱{Number(d.wallet_balance).toFixed(2)} · {d.wallet_state?.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => { setTopupId(d.id); setTopupAmount(''); setTopupNote('') }}
                    className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg hover:bg-blue-100"
                  >
                    Top Up
                  </button>
                  {tab === 'pending' && (
                    <>
                      <button
                        onClick={() => approve(d.id)}
                        disabled={actionId === d.id}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(d.id)}
                        disabled={actionId === d.id}
                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {tab === 'verified' && (
                    <button
                      onClick={() => suspend(d.id)}
                      disabled={actionId === d.id}
                      className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 disabled:opacity-50"
                    >
                      Suspend
                    </button>
                  )}
                  {tab === 'suspended' && (
                    <button
                      onClick={() => approve(d.id)}
                      disabled={actionId === d.id}
                      className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-lg hover:bg-green-200 disabled:opacity-50"
                    >
                      Reinstate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top-up dialog */}
      {topupId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <h3 className="font-semibold text-gray-800 mb-4">Add Credits</h3>
            <label className="block text-xs text-gray-500 mb-1">Amount (₱)</label>
            <input
              type="number"
              min="1"
              value={topupAmount}
              onChange={e => setTopupAmount(e.target.value)}
              placeholder="e.g. 500"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
            <input
              type="text"
              value={topupNote}
              onChange={e => setTopupNote(e.target.value)}
              placeholder="Cash top-up at office"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex gap-2">
              <button
                onClick={submitTopup}
                disabled={topupLoading || !topupAmount}
                className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {topupLoading ? 'Processing…' : 'Confirm'}
              </button>
              <button
                onClick={() => setTopupId(null)}
                className="flex-1 bg-gray-100 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
