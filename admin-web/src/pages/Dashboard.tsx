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

function StatCard({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-green-700' : 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
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
  if (!data) return <p className="text-gray-400 text-sm">Loading…</p>

  const chartData = series.map(s => ({ ...s, date: shortDate(s.date) }))

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Dashboard</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Online drivers" value={onlineDrivers.length} highlight />
          <StatCard label="Active rides" value={data.active_rides} />
          <StatCard label="Rides today" value={data.rides_today} />
          <StatCard label="Total rides" value={data.total_rides} />
          <StatCard label="Completed" value={data.completed_rides} />
          <StatCard label="Total revenue" value={`₱${data.total_revenue.toLocaleString()}`} />
          <StatCard label="Revenue today" value={`₱${data.revenue_today.toLocaleString()}`} />
          <StatCard
            label="Completion rate"
            value={data.total_rides ? `${Math.round((data.completed_rides / data.total_rides) * 100)}%` : '—'}
          />
        </div>
      </div>

      {/* Charts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Trends</h3>
          <div className="flex gap-1">
            {([7, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => { setDays(d); loadSeries(d) }}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  days === d ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ride volume */}
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm font-medium text-gray-600 mb-4">Ride Volume</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number, name: string) => [v, name === 'rides' ? 'Total' : 'Completed']}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} formatter={v => v === 'rides' ? 'Total' : 'Completed'} />
                <Area type="monotone" dataKey="rides" stroke="#93c5fd" fill="#dbeafe" strokeWidth={2} />
                <Area type="monotone" dataKey="completed" stroke="#34d399" fill="#d1fae5" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm font-medium text-gray-600 mb-4">Revenue (₱)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number) => [`₱${v.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Online drivers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800">
            Online Drivers
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {onlineDrivers.length}
            </span>
          </h3>
          <button onClick={loadOnline} className="text-xs text-blue-600 hover:text-blue-800">Refresh</button>
        </div>

        {onlineDrivers.length === 0 ? (
          <p className="text-gray-400 text-sm">No drivers online right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {onlineDrivers.map(d => (
              <div key={d.id} className="bg-white rounded-xl border p-4 flex gap-3">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{d.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {[d.vehicle_color, d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ')}
                    {d.plate_number ? ` · ${d.plate_number}` : ''}
                  </p>
                  {d.lat != null && d.lng != null ? (
                    <a
                      href={`https://maps.google.com/?q=${d.lat},${d.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      📍 {Number(d.lat).toFixed(5)}, {Number(d.lng).toFixed(5)}
                      <span className="text-gray-400 ml-1">· {formatAge(d.last_location_update)}</span>
                    </a>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Location not yet reported</p>
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
