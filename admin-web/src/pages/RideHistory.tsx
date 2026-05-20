import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'

interface Ride {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  fare_estimate: number
  final_fare: number | null
  payment_method: string
  distance_km: number | null
  duration_min: number | null
  ride_type: string | null
  cancellation_reason: string | null
  created_at: string
  completed_at: string | null
  rider_name: string | null
  driver_name: string | null
}

const STATUS_OPTIONS = ['all', 'requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled']

const STATUS_COLOR: Record<string, string> = {
  requested:   'bg-yellow-100 text-yellow-700',
  accepted:    'bg-blue-100 text-blue-700',
  arrived:     'bg-purple-100 text-purple-700',
  in_progress: 'bg-green-100 text-green-700',
  completed:   'bg-gray-100 text-gray-700',
  cancelled:   'bg-red-100 text-red-600',
}

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

export default function RideHistory() {
  const [rides, setRides]   = useState<Ride[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [from, setFrom]     = useState('')
  const [to, setTo]         = useState('')

  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page: String(page), limit: '25' })
    if (status !== 'all') params.set('status', status)
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (from) params.set('from', from)
    if (to)   params.set('to', to)
    api.get<{ rides: Ride[]; total: number }>(`/api/v1/admin/rides?${params}`)
      .then(r => { setRides(r.rides); setTotal(r.total) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, status, debouncedSearch, from, to])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 25)

  function resetFilters() {
    setSearch(''); setStatus('all'); setFrom(''); setTo(''); setPage(1)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Ride History</h2>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs text-gray-500 mb-1">Search address</label>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Pickup or dropoff…"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={e => { setFrom(e.target.value); setPage(1) }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={e => { setTo(e.target.value); setPage(1) }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <button
          onClick={resetFilters}
          className="text-xs text-gray-500 hover:text-gray-700 underline self-end pb-2"
        >
          Reset
        </button>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400">
        {loading ? 'Loading…' : `${total.toLocaleString()} ride${total !== 1 ? 's' : ''} found`}
      </p>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Table */}
      {rides.length === 0 && !loading ? (
        <p className="text-gray-400 text-sm">No rides match your filters.</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pickup → Dropoff</th>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Fare</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rides.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.cancellation_reason === 'no_driver_available' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
                        Timed out
                      </span>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-gray-800">{r.pickup_address}</p>
                    <p className="truncate text-gray-400 text-xs">→ {r.dropoff_address}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {r.rider_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {r.driver_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 font-medium">
                    ₱{(r.final_fare ?? r.fare_estimate ?? 0).toLocaleString()}
                    {r.distance_km != null && (
                      <span className="text-gray-400 font-normal text-xs ml-1">{r.distance_km.toFixed(1)} km</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs capitalize">
                    {r.ride_type ?? '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs">
                    {fmt(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
