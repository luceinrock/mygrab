import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Ride {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  fare_estimate: number
  payment_method: string
  created_at: string
  driver_id: string | null
  driver_name: string | null
  driver_lat: number | null
  driver_lng: number | null
  driver_last_seen: string | null
}

const STATUS_COLOR: Record<string, string> = {
  requested:   'bg-yellow-100 text-yellow-700',
  accepted:    'bg-blue-100 text-blue-700',
  arrived:     'bg-purple-100 text-purple-700',
  in_progress: 'bg-green-100 text-green-700',
}

const ACTIVE = ['requested', 'accepted', 'arrived', 'in_progress']

async function fetchRides(): Promise<Ride[]> {
  const { data: ridesData, error } = await supabase
    .from('rides')
    .select('id, status, pickup_address, dropoff_address, fare_estimate, payment_method, created_at, driver_id, profiles!rides_driver_id_fkey(full_name)')
    .in('status', ACTIVE)
    .order('created_at', { ascending: false })

  if (error || !ridesData) return []

  const driverIds = ridesData.filter(r => r.driver_id).map(r => r.driver_id as string)
  let locationMap: Record<string, any> = {}
  if (driverIds.length > 0) {
    const { data: locs } = await supabase
      .from('driver_profiles')
      .select('user_id, current_location_lat, current_location_lng, last_location_update')
      .in('user_id', driverIds)
    if (locs) locationMap = Object.fromEntries(locs.map(l => [l.user_id, l]))
  }

  return (ridesData as any[]).map(r => ({
    id:               r.id,
    status:           r.status,
    pickup_address:   r.pickup_address,
    dropoff_address:  r.dropoff_address,
    fare_estimate:    r.fare_estimate,
    payment_method:   r.payment_method,
    created_at:       r.created_at,
    driver_id:        r.driver_id,
    driver_name:      r.profiles?.full_name ?? null,
    driver_lat:       locationMap[r.driver_id]?.current_location_lat ?? null,
    driver_lng:       locationMap[r.driver_id]?.current_location_lng ?? null,
    driver_last_seen: locationMap[r.driver_id]?.last_location_update ?? null,
  }))
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return 'unknown'
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  return `${Math.floor(secs / 60)}m ago`
}

export default function ActiveRides() {
  const [rides, setRides] = useState<Ride[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    fetchRides().then(setRides)

    // Refresh "last seen" labels every 10 s without hitting the DB
    const clock = setInterval(() => setTick(t => t + 1), 10_000)

    // Realtime: ride status changes
    const rideChannel = supabase
      .channel('admin-active-rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        fetchRides().then(setRides)
      })
      .subscribe()

    // Realtime: driver location pings
    const locationChannel = supabase
      .channel('admin-driver-locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'driver_profiles' }, payload => {
        const p = payload.new as any
        setRides(prev => prev.map(r =>
          r.driver_id === p.user_id
            ? { ...r, driver_lat: p.current_location_lat, driver_lng: p.current_location_lng, driver_last_seen: p.last_location_update }
            : r
        ))
      })
      .subscribe()

    return () => {
      clearInterval(clock)
      supabase.removeChannel(rideChannel)
      supabase.removeChannel(locationChannel)
    }
  }, [])

  // suppress unused-var warning for tick — it's only used to force re-render
  void tick

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Live Rides</h2>
        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
          {rides.length} active
        </span>
      </div>

      {rides.length === 0 ? (
        <p className="text-gray-400 text-sm">No active rides right now.</p>
      ) : (
        <div className="space-y-3">
          {rides.map(r => (
            <div key={r.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.pickup_address}</p>
                  <p className="text-sm text-gray-500 truncate">→ {r.dropoff_address}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-3 ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {r.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span>₱{r.fare_estimate}</span>
                <span>{r.payment_method.toUpperCase()}</span>
                <span>{new Date(r.created_at).toLocaleTimeString()}</span>
              </div>

              {/* Driver location row */}
              <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs">
                {r.driver_id ? (
                  <>
                    <span className="font-medium text-gray-700">{r.driver_name ?? 'Driver'}</span>
                    {r.driver_lat != null && r.driver_lng != null ? (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="font-mono text-gray-500">
                          {r.driver_lat.toFixed(5)}, {r.driver_lng.toFixed(5)}
                        </span>
                        <span className="text-gray-400">·</span>
                        <span className={r.driver_last_seen && (Date.now() - new Date(r.driver_last_seen).getTime()) < 30_000 ? 'text-green-500' : 'text-gray-400'}>
                          {formatLastSeen(r.driver_last_seen)}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">· no location yet</span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">No driver assigned</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
