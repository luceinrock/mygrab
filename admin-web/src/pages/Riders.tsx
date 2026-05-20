import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../lib/api'

interface Rider {
  id: string
  full_name: string
  email: string
  rating_average: number
  total_rides: number
  cancellation_strikes: number
  last_cancellation_at: string | null
  created_at: string
}

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
  created_at: string
  completed_at: string | null
  driver_name: string | null
}

interface NewRiderResult {
  rider: { id: string; email: string; full_name: string }
  temp_password: string
}

type SortBy = 'strikes' | 'rides' | 'rating' | 'joined'

const SORT_LABELS: Record<SortBy, string> = {
  strikes: 'Strikes',
  rides: 'Rides',
  rating: 'Rating',
  joined: 'Joined',
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  accepted: 'bg-yellow-100 text-yellow-700',
  arrived: 'bg-yellow-100 text-yellow-700',
  requested: 'bg-gray-100 text-gray-600',
  disputed: 'bg-orange-100 text-orange-700',
}

export default function Riders() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [ridesMap, setRidesMap] = useState<Record<string, Ride[]>>({})
  const [ridesLoading, setRidesLoading] = useState<string | null>(null)

  // Filter / sort state
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('strikes')
  const [sortAsc, setSortAsc] = useState(false)
  const [minStrikes, setMinStrikes] = useState(0)
  const [page, setPage] = useState(1)
  const LIMIT = 20
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Add rider modal state
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [created, setCreated] = useState<NewRiderResult | null>(null)

  const load = useCallback((overrides?: { page?: number; search?: string; sortBy?: SortBy; sortAsc?: boolean; minStrikes?: number }) => {
    const p = overrides?.page ?? page
    const s = overrides?.search ?? search
    const sb = overrides?.sortBy ?? sortBy
    const sa = overrides?.sortAsc ?? sortAsc
    const ms = overrides?.minStrikes ?? minStrikes

    const params = new URLSearchParams({
      page: String(p),
      limit: String(LIMIT),
      sort_by: sb,
      sort_dir: sa ? 'asc' : 'desc',
    })
    if (s) params.set('search', s)
    if (ms > 0) params.set('min_strikes', String(ms))

    setLoading(true)
    api.get<{ riders: Rider[]; total: number }>(`/api/v1/admin/riders?${params}`)
      .then(r => { setRiders(r.riders); setTotal(r.total) })
      .catch(() => { setRiders([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [page, search, sortBy, sortAsc, minStrikes])

  useEffect(() => { load() }, [load])

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      load({ search: value, page: 1 })
    }, 350)
  }

  function handleSort(newSortBy: SortBy) {
    if (newSortBy === sortBy) {
      setSortAsc(a => !a)
      setPage(1)
      load({ sortBy: newSortBy, sortAsc: !sortAsc, page: 1 })
    } else {
      setSortBy(newSortBy)
      setSortAsc(false)
      setPage(1)
      load({ sortBy: newSortBy, sortAsc: false, page: 1 })
    }
  }

  function handleMinStrikes(ms: number) {
    setMinStrikes(ms)
    setPage(1)
    load({ minStrikes: ms, page: 1 })
  }

  function goPage(p: number) {
    setPage(p)
    load({ page: p })
  }

  async function toggleRides(riderId: string) {
    if (expandedId === riderId) { setExpandedId(null); return }
    setExpandedId(riderId)
    if (ridesMap[riderId]) return
    setRidesLoading(riderId)
    try {
      const r = await api.get<{ rides: Ride[] }>(`/api/v1/admin/riders/${riderId}/rides`)
      setRidesMap(m => ({ ...m, [riderId]: r.rides }))
    } catch {
      setRidesMap(m => ({ ...m, [riderId]: [] }))
    } finally {
      setRidesLoading(null)
    }
  }

  async function resetStrikes(id: string) {
    setActionId(id)
    await api.post(`/api/v1/admin/riders/${id}/reset-strikes`).catch(() => {})
    setActionId(null)
    load()
  }

  async function submitAddRider(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    try {
      const result = await api.post<NewRiderResult>('/api/v1/admin/riders', form)
      setCreated(result)
      load()
    } catch (err: any) {
      setAddError(err?.message ?? 'Failed to create rider')
    } finally {
      setAdding(false)
    }
  }

  function closeAddModal() {
    setShowAdd(false)
    setForm({ full_name: '', email: '', phone: '' })
    setAddError(null)
    setCreated(null)
  }

  const strikeColor = (n: number) => {
    if (n >= 5) return 'text-red-600 font-bold'
    if (n >= 3) return 'text-yellow-600 font-semibold'
    return 'text-gray-600'
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Riders</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Add Rider
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search name or email…"
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-56"
        />

        {/* Sort buttons */}
        <div className="flex gap-1">
          {(Object.keys(SORT_LABELS) as SortBy[]).map(sb => (
            <button
              key={sb}
              onClick={() => handleSort(sb)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${
                sortBy === sb ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {SORT_LABELS[sb]}
              {sortBy === sb && (
                <span className="text-xs">{sortAsc ? '↑' : '↓'}</span>
              )}
            </button>
          ))}
        </div>

        {/* Min strikes filter */}
        <div className="flex gap-1">
          {[0, 1, 3, 5].map(ms => (
            <button
              key={ms}
              onClick={() => handleMinStrikes(ms)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                minStrikes === ms ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {ms === 0 ? 'All Strikes' : `${ms}+ Strikes`}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-xs text-gray-400 mb-3">
          {total} rider{total !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
          {minStrikes > 0 && ` with ${minStrikes}+ strikes`}
        </p>
      )}

      {/* Add Rider Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            {created ? (
              <div>
                <h3 className="font-semibold text-gray-800 text-base mb-1">Rider Registered</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Account created for <strong>{created.rider.full_name}</strong>. Give the rider these credentials to log in.
                </p>
                <div className="bg-gray-50 rounded-xl border p-4 space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400 text-xs">Email</span>
                    <p className="font-medium text-gray-800">{created.rider.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Temporary Password</span>
                    <p className="font-mono font-bold text-blue-700 text-base tracking-wide">{created.temp_password}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">The rider should change their password after first login.</p>
                <button
                  onClick={closeAddModal}
                  className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitAddRider}>
                <h3 className="font-semibold text-gray-800 text-base mb-4">Register New Rider</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
                    <input
                      required
                      value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="Juan dela Cruz"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="juan@email.com"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Phone <span className="text-gray-400">(optional)</span></label>
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="09XX XXX XXXX"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                </div>
                {addError && <p className="text-xs text-red-500 mt-3">{addError}</p>}
                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {adding ? 'Creating…' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : riders.length === 0 ? (
        <p className="text-gray-400 text-sm">No riders found.</p>
      ) : (
        <>
          <div className="space-y-3">
            {riders.map(r => (
              <div key={r.id} className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{r.full_name}</p>
                    <p className="text-sm text-gray-500">{r.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      ⭐ {r.rating_average ?? '—'} · {r.total_rides} ride{r.total_rides !== 1 ? 's' : ''}
                      {' · Joined '}
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                    <p className={`text-xs mt-1 ${strikeColor(r.cancellation_strikes)}`}>
                      {r.cancellation_strikes} cancellation strike{r.cancellation_strikes !== 1 ? 's' : ''}
                      {r.last_cancellation_at && (
                        <span className="text-gray-400 font-normal">
                          {' · last: '}
                          {new Date(r.last_cancellation_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {r.cancellation_strikes > 0 && (
                      <button
                        onClick={() => resetStrikes(r.id)}
                        disabled={actionId === r.id}
                        className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      >
                        Reset Strikes
                      </button>
                    )}
                    <button
                      onClick={() => toggleRides(r.id)}
                      className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg hover:bg-blue-100"
                    >
                      {expandedId === r.id ? 'Hide Rides' : `Rides (${r.total_rides})`}
                    </button>
                  </div>
                </div>

                {expandedId === r.id && (
                  <div className="border-t bg-gray-50 px-4 py-3">
                    {ridesLoading === r.id ? (
                      <p className="text-xs text-gray-400">Loading rides…</p>
                    ) : !ridesMap[r.id] || ridesMap[r.id].length === 0 ? (
                      <p className="text-xs text-gray-400">No rides yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {ridesMap[r.id].map(ride => (
                          <div key={ride.id} className="bg-white rounded-lg border p-3 text-xs">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ride.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {ride.status.replace('_', ' ')}
                              </span>
                              <span className="text-gray-400">
                                {new Date(ride.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-700 truncate">📍 {ride.pickup_address}</p>
                            <p className="text-gray-700 truncate">🏁 {ride.dropoff_address}</p>
                            <div className="flex gap-4 mt-1.5 text-gray-500">
                              <span>₱{ride.final_fare ?? ride.fare_estimate}</span>
                              {ride.distance_km && <span>{ride.distance_km} km</span>}
                              {ride.duration_min && <span>{ride.duration_min} min</span>}
                              {ride.driver_name && <span>Driver: {ride.driver_name}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-400">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const p = start + i
                  return (
                    <button
                      key={p}
                      onClick={() => goPage(p)}
                      className={`px-3 py-1.5 text-xs border rounded-lg font-medium ${
                        p === page ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
