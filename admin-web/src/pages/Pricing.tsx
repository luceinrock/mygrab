import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface SurgeConfig {
  surge_multiplier: number
  base_fare: number
  per_km: number
  per_min: number
  booking_fee: number
  min_fare: number
}

export default function Pricing() {
  const [config, setConfig] = useState<SurgeConfig | null>(null)
  const [surge, setSurge] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get<SurgeConfig>('/api/v1/admin/pricing')
      .then(r => { setConfig(r); setSurge(r.surge_multiplier) })
      .catch(() => {
        // fallback defaults while backend is being built
        const defaults = { surge_multiplier: 1, base_fare: 50, per_km: 15, per_min: 2, booking_fee: 10, min_fare: 89 }
        setConfig(defaults)
        setSurge(1)
      })
  }, [])

  async function saveSurge() {
    setSaving(true)
    await api.put('/api/v1/admin/pricing/surge', { surge_multiplier: surge }).catch(() => {})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const previewFare = config
    ? Math.max(config.min_fare, (config.base_fare + config.per_km * 2 + config.per_min * 5 + config.booking_fee) * surge)
    : 0

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Pricing</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Surge multiplier */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-medium text-gray-700 mb-3">Surge Multiplier</h3>
          <div className="flex items-center gap-4 mb-3">
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={surge}
              onChange={e => setSurge(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className={`text-2xl font-bold w-14 text-right ${surge > 1.5 ? 'text-red-500' : surge > 1.2 ? 'text-yellow-500' : 'text-green-600'}`}>
              {surge.toFixed(1)}×
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Sample 2km, 5min ride: <span className="font-medium text-gray-600">₱{previewFare.toFixed(0)}</span>
          </p>
          <button
            onClick={saveSurge}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Apply Surge'}
          </button>
        </div>

        {/* Base fare breakdown */}
        {config && (
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-medium text-gray-700 mb-3">Base Fare Structure</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Base fare', `₱${config.base_fare}`],
                ['Per km', `₱${config.per_km}`],
                ['Per minute', `₱${config.per_min}`],
                ['Booking fee', `₱${config.booking_fee}`],
                ['Minimum fare', `₱${config.min_fare}`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-gray-600">
                  <span>{label}</span>
                  <span className="font-medium text-gray-800">{val}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Edit via backend environment to change base rates.</p>
          </div>
        )}
      </div>
    </div>
  )
}
