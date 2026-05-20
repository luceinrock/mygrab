import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

interface Driver {
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

// Cebu City center
const CEBU: [number, number] = [10.3157, 123.8854]

function formatAge(ts: string | null) {
  if (!ts) return 'unknown'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function isStale(ts: string | null) {
  if (!ts) return true
  return Date.now() - new Date(ts).getTime() > 60_000
}

export default function DriverMap() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [tick, setTick] = useState(0)

  const load = useCallback(() => {
    api.get<{ drivers: Driver[] }>('/api/v1/admin/drivers/online')
      .then(r => setDrivers(r.drivers))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()

    const clock = setInterval(() => setTick(t => t + 1), 15_000)

    const channel = supabase
      .channel('driver-map-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'driver_profiles' }, () => {
        load()
      })
      .subscribe()

    return () => {
      clearInterval(clock)
      supabase.removeChannel(channel)
    }
  }, [load])

  void tick

  const located = drivers.filter(d => d.lat != null && d.lng != null)
  const unlocated = drivers.filter(d => d.lat == null || d.lng == null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">Driver Map</h2>
          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {drivers.length} online
          </span>
        </div>
        <button onClick={load} className="text-xs text-blue-600 hover:text-blue-800">Refresh</button>
      </div>

      {/* Map */}
      <div className="rounded-xl border overflow-hidden" style={{ height: 480 }}>
        <MapContainer center={CEBU} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {located.map(d => (
            <CircleMarker
              key={d.id}
              center={[d.lat!, d.lng!]}
              radius={10}
              pathOptions={{
                fillColor: isStale(d.last_location_update) ? '#9ca3af' : '#22c55e',
                fillOpacity: 0.9,
                color: '#fff',
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm space-y-0.5 min-w-40">
                  <p className="font-semibold text-gray-800">{d.full_name}</p>
                  <p className="text-gray-500">
                    {[d.vehicle_color, d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ')}
                    {d.plate_number ? ` · ${d.plate_number}` : ''}
                  </p>
                  {d.vehicle_type && (
                    <p className="text-gray-400 capitalize text-xs">{d.vehicle_type}</p>
                  )}
                  <p className="text-gray-400 text-xs">{d.phone}</p>
                  <p className={`text-xs font-medium mt-1 ${isStale(d.last_location_update) ? 'text-gray-400' : 'text-green-600'}`}>
                    {isStale(d.last_location_update) ? 'Stale · ' : 'Live · '}
                    {formatAge(d.last_location_update)}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${d.lat},${d.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block mt-1"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Live (&lt;1 min)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Stale (&gt;1 min)
        </span>
        <span className="ml-auto">{located.length} plotted · {unlocated.length} awaiting location</span>
      </div>

      {/* Drivers without location */}
      {unlocated.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">Awaiting first location ping</p>
          <div className="flex flex-wrap gap-2">
            {unlocated.map(d => (
              <div key={d.id} className="bg-white border rounded-lg px-3 py-1.5 text-xs text-gray-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                {d.full_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
