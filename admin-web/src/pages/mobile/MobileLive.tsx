import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'

interface Overview {
  active_rides: number
  rides_today: number
  completed_rides: number
  total_revenue: number
  revenue_today: number
}

interface OnlineDriver {
  id: string
  full_name: string
  vehicle_make: string
  vehicle_model: string
  vehicle_color: string
  vehicle_type: string
  plate_number: string
  lat: number | null
  lng: number | null
  last_location_update: string | null
}

function age(ts: string | null) {
  if (!ts) return '—'
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function MobileLive() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [drivers, setDrivers] = useState<OnlineDriver[]>([])
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const loadDrivers = useCallback(() => {
    api.get<{ drivers: OnlineDriver[] }>('/api/v1/admin/drivers/online')
      .then(r => { setDrivers(r.drivers); setLastRefresh(new Date()) })
      .catch(() => {})
  }, [])

  const load = useCallback(() => {
    setRefreshing(true)
    Promise.all([
      api.get<{ overview: Overview }>('/api/v1/admin/analytics/overview').then(r => setOverview(r.overview)),
      api.get<{ drivers: OnlineDriver[] }>('/api/v1/admin/drivers/online').then(r => setDrivers(r.drivers)),
    ]).finally(() => {
      setRefreshing(false)
      setLastRefresh(new Date())
    })
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('mobile-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'driver_profiles' }, loadDrivers)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load, loadDrivers])

  return (
    <div className="space-y-4">
      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Updated {lastRefresh.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-500 disabled:opacity-40"
        >
          <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
          Refresh
        </button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-accent-500" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Active Rides</p>
          <p className="text-3xl font-bold text-accent-500 mt-1">
            {overview?.active_rides ?? '—'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">in progress now</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-accent-500" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Online Drivers</p>
          <p className="text-3xl font-bold text-accent-500 mt-1">{drivers.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">on the road</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-brand-500" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Rides Today</p>
          <p className="text-3xl font-bold text-brand-500 mt-1">{overview?.rides_today ?? '—'}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-emerald-500" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Revenue Today</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            ₱{overview ? overview.revenue_today.toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {/* Online drivers list */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Online Drivers
        </p>
        {drivers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
            <p className="text-slate-400 text-sm">No drivers online right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {drivers.map(d => (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
                <span className="relative flex h-3 w-3 mt-1 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-500 opacity-50" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-500" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{d.full_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {[d.vehicle_color, d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ')}
                    {d.plate_number ? ` · ${d.plate_number}` : ''}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">{age(d.last_location_update)}</p>
                </div>
                {d.vehicle_type && (
                  <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 uppercase">
                    {d.vehicle_type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
