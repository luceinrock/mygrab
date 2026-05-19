import { useEffect, useState } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [ridesMap, setRidesMap] = useState<Record<string, Ride[]>>({})
  const [ridesLoading, setRidesLoading] = useState<string | null>(null)

  function load() {
    setLoading(true)
    api.get<{ riders: Rider[] }>('/api/v1/admin/riders')
      .then(r => setRiders(r.riders))
      .catch(() => setRiders([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function toggleRides(riderId: string) {
    if (expandedId === riderId) {
      setExpandedId(null)
      return
    }
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

  const strikeColor = (n: number) => {
    if (n >= 5) return 'text-red-600 font-bold'
    if (n >= 3) return 'text-yellow-600 font-semibold'
    return 'text-gray-600'
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Riders</h2>
      <p className="text-xs text-gray-400 mb-4">Sorted by cancellation strikes (highest first)</p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : riders.length === 0 ? (
        <p className="text-gray-400 text-sm">No riders yet.</p>
      ) : (
        <div className="space-y-3">
          {riders.map(r => (
            <div key={r.id} className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{r.full_name}</p>
                  <p className="text-sm text-gray-500">{r.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    ⭐ {r.rating_average ?? '—'} · {r.total_rides} ride{r.total_rides !== 1 ? 's' : ''}
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
                    <p className="text-xs text-gray-400">No rides found.</p>
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
      )}
    </div>
  )
}
