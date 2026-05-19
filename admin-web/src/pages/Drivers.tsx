import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface NewDriverResult {
  driver: { id: string; email: string; full_name: string }
  temp_password: string
}

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

  // Add driver modal
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', vehicle_type: 'lite', vehicle_make: '', vehicle_model: '', vehicle_color: '', plate_number: '', year_manufactured: '' })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [created, setCreated] = useState<NewDriverResult | null>(null)

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

  async function submitAddDriver(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    try {
      const payload = {
        ...form,
        year_manufactured: form.year_manufactured ? parseInt(form.year_manufactured) : undefined,
      }
      const result = await api.post<NewDriverResult>('/api/v1/admin/drivers', payload)
      setCreated(result)
      load(tab)
    } catch (err: any) {
      setAddError(err?.message ?? 'Failed to create driver')
    } finally {
      setAdding(false)
    }
  }

  function closeAddModal() {
    setShowAdd(false)
    setForm({ full_name: '', email: '', phone: '', vehicle_type: 'lite', vehicle_make: '', vehicle_model: '', vehicle_color: '', plate_number: '', year_manufactured: '' })
    setAddError(null)
    setCreated(null)
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Drivers</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Add Driver
        </button>
      </div>

      {/* Add Driver Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            {created ? (
              <div>
                <h3 className="font-semibold text-gray-800 text-base mb-1">Driver Registered</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Account created for <strong>{created.driver.full_name}</strong>. Driver is verified and can go online after topping up credits.
                </p>
                <div className="bg-gray-50 rounded-xl border p-4 space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400 text-xs">Email</span>
                    <p className="font-medium text-gray-800">{created.driver.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Temporary Password</span>
                    <p className="font-mono font-bold text-blue-700 text-base tracking-wide">{created.temp_password}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">Driver should change their password after first login. Remember to top up their credits so they can go online.</p>
                <button
                  onClick={closeAddModal}
                  className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitAddDriver}>
                <h3 className="font-semibold text-gray-800 text-base mb-4">Register New Driver</h3>
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personal Info</p>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
                    <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Juan dela Cruz" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@email.com" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Phone <span className="text-gray-400">(optional)</span></label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="09XX XXX XXXX" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>

                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-2">Vehicle Info</p>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Vehicle Type *</label>
                    <select required value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="lite">Lite (Sedan / Hatchback)</option>
                      <option value="plus">Plus (SUV / Van)</option>
                      <option value="moto">Moto (Motorcycle)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Make</label>
                      <input value={form.vehicle_make} onChange={e => setForm(f => ({ ...f, vehicle_make: e.target.value }))} placeholder="Toyota" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Model</label>
                      <input value={form.vehicle_model} onChange={e => setForm(f => ({ ...f, vehicle_model: e.target.value }))} placeholder="Vios" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Color</label>
                      <input value={form.vehicle_color} onChange={e => setForm(f => ({ ...f, vehicle_color: e.target.value }))} placeholder="White" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Year</label>
                      <input type="number" min="1990" max={new Date().getFullYear() + 1} value={form.year_manufactured} onChange={e => setForm(f => ({ ...f, year_manufactured: e.target.value }))} placeholder="2020" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Plate Number</label>
                    <input value={form.plate_number} onChange={e => setForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))} placeholder="ABC 1234" className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                </div>
                {addError && <p className="text-xs text-red-500 mt-3">{addError}</p>}
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={closeAddModal} className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={adding} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {adding ? 'Creating…' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
