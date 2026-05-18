import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Overview {
  total_rides: number
  rides_today: number
  active_rides: number
  completed_rides: number
  cancelled_rides: number
  total_revenue: number
  revenue_today: number
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<{ overview: Overview }>('/api/v1/admin/analytics/overview')
      .then(r => setData(r.overview))
      .catch(e => setError(e.message))
  }, [])

  if (error) return <p className="text-red-500 text-sm">{error}</p>
  if (!data) return <p className="text-gray-400 text-sm">Loading…</p>

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total rides" value={data.total_rides} />
        <StatCard label="Rides today" value={data.rides_today} />
        <StatCard label="Active now" value={data.active_rides} />
        <StatCard label="Completed" value={data.completed_rides} />
        <StatCard
          label="Total revenue"
          value={`₱${data.total_revenue.toLocaleString()}`}
        />
        <StatCard
          label="Revenue today"
          value={`₱${data.revenue_today.toLocaleString()}`}
        />
        <StatCard label="Cancelled" value={data.cancelled_rides} />
        <StatCard
          label="Completion rate"
          value={
            data.total_rides
              ? `${Math.round((data.completed_rides / data.total_rides) * 100)}%`
              : '—'
          }
        />
      </div>
    </div>
  )
}
