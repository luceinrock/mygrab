import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

interface Overview {
  total_rides: number
  rides_today: number
  active_rides: number
  completed_rides: number
  cancelled_rides: number
  total_revenue: number
  revenue_today: number
}

interface OnlineDriver {
  id: string
  full_name: string
  phone: string
  vehicle_make: string
  vehicle_model: string
  vehicle_color: string
  vehicle_type: string
  plate_number: string
  lat: number | null
  lng: number | null
  last_location_update: string | null
}

interface DaySeries {
  date: string
  rides: number
  completed: number
  revenue: number
}

type CardVariant = 'default' | 'live' | 'revenue' | 'success'

const CARD_BAR: Record<CardVariant, string>   = { default: 'bg-slate-300',   live: 'bg-accent-500', revenue: 'bg-brand-500', success: 'bg-emerald-500' }
const CARD_VAL: Record<CardVariant, string>   = { default: 'text-slate-800', live: 'text-accent-500', revenue: 'text-brand-500', success: 'text-emerald-600' }
const CARD_RING: Record<CardVariant, string>  = { default: 'border-slate-200', live: 'border-accent-200', revenue: 'border-brand-200', success: 'border-emerald-200' }

function StatCard({ label, value, sub, variant = 'default' }: {
  label: string; value: string | number; sub?: string; variant?: CardVariant
}) {
  return (
    <div className={`rounded-xl border bg-white p-5 relative overflow-hidden ${CARD_RING[variant]}`}>
      <div className={`absolute top-0 inset-x-0 h-[3px] ${CARD_BAR[variant]}`} />
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${CARD_VAL[variant]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function formatAge(ts: string | null) {
  if (!ts) return 'unknown'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function shortDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

export default function Dashboard() {
  const [data, setData] = useState<Overview | null>(null)
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([])
  const [series, setSeries] = useState<DaySeries[]>([])
  const [days, setDays] = useState<7 | 30>(7)
  const [error, setError] = useState('')

  const loadOnline = useCallback(() => {
    api.get<{ drivers: OnlineDriver[]; count: number }>('/api/v1/admin/drivers/online')
      .then(r => setOnlineDrivers(r.drivers))
      .catch(() => {})
  }, [])

  const loadSeries = useCallback((d: number) => {
    api.get<{ series: DaySeries[] }>(`/api/v1/admin/analytics/timeseries?days=${d}`)
      .then(r => setSeries(r.series))
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.get<{ overview: Overview }>('/api/v1/admin/analytics/overview')
      .then(r => setData(r.overview))
      .catch(e => setError(e.message))
    loadOnline()
    loadSeries(days)

    const channel = supabase
      .channel('dashboard-driver-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'driver_profiles' }, () => {
        loadOnline()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadOnline, loadSeries, days])

  if (error) return <p className="text-red-500 text-sm">{error}</p>
  if (!data) return (
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin inline-block" />
      Loading dashboard…
    </div>
  )

  const chartData = series.map(s => ({ ...s, date: shortDate(s.date) }))
  const completionRate = data.total_rides ? Math.round((data.completed_rides / data.total_rides) * 100) : 0

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-400 mt-0.5">Real-time overview of your ride network</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Online Drivers" value={onlineDrivers.length} variant="live" sub="active right now" />
        <StatCard label="Active Rides" value={data.active_rides} variant="live" sub="in progress" />
        <StatCard label="Rides Today" value={data.rides_today} variant="default" />
        <StatCard label="Completion Rate" value={data.total_rides ? `${completionRate}%` : '—'} variant={completionRate >= 70 ? 'success' : 'default'} />
        <StatCard label="Total Rides" value={data.total_rides} variant="default" />
        <StatCard label="Completed" value={data.completed_rides} variant="success" />
        <StatCard label="Revenue Today" value={`₱${data.revenue_today.toLocaleString()}`} variant="revenue" />
        <StatCard label="Total Revenue" value={`₱${data.total_revenue.toLocaleString()}`} variant="revenue" />
      </div>

      {/* Charts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Trends</h3>
            <p className="text-xs text-slate-400">Ride volume &amp; revenue over time</p>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {([7, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => { setDays(d); loadSeries(d) }}
                className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                  days === d
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ride volume */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Ride Volume</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRides" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066FF" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(v, name) => [v, (name as string) === 'rides' ? 'Total' : 'Completed']}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={v => v === 'rides' ? 'Total' : 'Completed'} />
                <Area type="monotone" dataKey="rides" stroke="#0066FF" fill="url(#colorRides)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#colorCompleted)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Revenue (₱)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#FF7A00" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Online drivers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              Online Drivers
              <span className="px-2 py-0.5 bg-accent-500 text-white text-xs font-bold rounded-full">
                {onlineDrivers.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">Currently active on the platform</p>
          </div>
          <button
            onClick={loadOnline}
            className="text-xs font-medium text-brand-500 hover:text-brand-700 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {onlineDrivers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">No drivers online right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {onlineDrivers.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 hover:border-brand-200 hover:shadow-sm transition-all">
                <div className="shrink-0 mt-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-500 opacity-50" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-500" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{d.full_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {[d.vehicle_color, d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ')}
                    {d.plate_number ? ` · ${d.plate_number}` : ''}
                    {d.vehicle_type ? ` · ${d.vehicle_type.toUpperCase()}` : ''}
                  </p>
                  {d.lat != null && d.lng != null ? (
                    <a
                      href={`https://maps.google.com/?q=${d.lat},${d.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-500 hover:text-brand-700 hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      📍 {Number(d.lat).toFixed(4)}, {Number(d.lng).toFixed(4)}
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">{formatAge(d.last_location_update)}</span>
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Location not yet reported</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
