import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/api'

interface Driver {
  id: string
  full_name: string
  email: string
  phone: string
  vehicle_make: string
  vehicle_model: string
  vehicle_color: string
  vehicle_type: string
  plate_number: string
  created_at: string
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function MobileApprovals() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, 'approved' | 'rejected'>>({})

  const load = useCallback(() => {
    setLoading(true)
    api.get<{ drivers: Driver[] }>('/api/v1/admin/drivers?status=pending')
      .then(r => setDrivers(r.drivers))
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function approve(id: string) {
    setActionId(id)
    try {
      await api.post(`/api/v1/admin/drivers/${id}/approve`)
      setDone(prev => ({ ...prev, [id]: 'approved' }))
    } catch {}
    setActionId(null)
  }

  async function reject(id: string) {
    setActionId(id)
    try {
      await api.post(`/api/v1/admin/drivers/${id}/reject`)
      setDone(prev => ({ ...prev, [id]: 'rejected' }))
    } catch {}
    setActionId(null)
  }

  const pending = drivers.filter(d => !done[d.id])
  const resolved = drivers.filter(d => done[d.id])

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Pending</p>
          {pending.length > 0 && (
            <span className="px-2 py-0.5 bg-accent-500 text-white text-xs font-bold rounded-full">
              {pending.length}
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="text-xs font-semibold text-brand-500"
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pending.length === 0 && resolved.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-semibold text-slate-700 text-sm">All caught up</p>
          <p className="text-xs text-slate-400 mt-1">No pending driver applications</p>
        </div>
      ) : (
        <>
          {/* Pending */}
          <div className="space-y-3">
            {pending.map(d => (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Yellow top accent for pending */}
                <div className="h-[3px] bg-yellow-400" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{d.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{d.email}</p>
                      {d.phone && <p className="text-xs text-slate-400">{d.phone}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(d.created_at)}</span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 w-16 shrink-0">Vehicle</span>
                      <span className="text-xs text-slate-700">
                        {[d.vehicle_color, d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ') || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 w-16 shrink-0">Plate</span>
                      <span className="text-xs font-mono font-bold text-slate-800">{d.plate_number || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 w-16 shrink-0">Type</span>
                      <span className="text-xs font-bold text-brand-600 uppercase">{d.vehicle_type || '—'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(d.id)}
                      disabled={actionId === d.id}
                      className="flex-1 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-40 transition-colors"
                    >
                      {actionId === d.id ? '…' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => reject(d.id)}
                      disabled={actionId === d.id}
                      className="flex-1 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 disabled:opacity-40 border border-red-200 transition-colors"
                    >
                      {actionId === d.id ? '…' : '✕ Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resolved this session */}
          {resolved.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Done this session</p>
              <div className="space-y-2">
                {resolved.map(d => (
                  <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3 opacity-60">
                    <span className={`text-lg ${done[d.id] === 'approved' ? '' : ''}`}>
                      {done[d.id] === 'approved' ? '✅' : '❌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{d.full_name}</p>
                      <p className="text-xs text-slate-400 capitalize">{done[d.id]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
