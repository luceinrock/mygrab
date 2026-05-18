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

export default function Riders() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    api.get<{ riders: Rider[] }>('/api/v1/admin/riders')
      .then(r => setRiders(r.riders))
      .catch(() => setRiders([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

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
        <p className="text-gray-400 text-sm">No riders found.</p>
      ) : (
        <div className="space-y-3">
          {riders.map(r => (
            <div key={r.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{r.full_name}</p>
                  <p className="text-sm text-gray-500">{r.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    ⭐ {r.rating_average} · {r.total_rides} rides
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
                {r.cancellation_strikes > 0 && (
                  <button
                    onClick={() => resetStrikes(r.id)}
                    disabled={actionId === r.id}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 disabled:opacity-50 flex-shrink-0"
                  >
                    Reset Strikes
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
