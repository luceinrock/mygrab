import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface PricingConfig {
  surge_multiplier: number
  base_fare_lite: number
  base_fare_plus: number
  base_fare_moto: number
  per_km_lite: number
  per_km_plus: number
  per_km_moto: number
  per_min: number
  booking_fee: number
  min_fare: number
}

type VehicleType = 'lite' | 'plus' | 'moto'

const VEHICLE_LABELS: Record<VehicleType, string> = {
  lite: 'Lite (Sedan)',
  plus: 'Plus (SUV)',
  moto: 'Moto (Bike)',
}

export default function Pricing() {
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [surge, setSurge] = useState(1)
  const [vehicleType, setVehicleType] = useState<VehicleType>('lite')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get<PricingConfig>('/api/v1/admin/pricing')
      .then(r => { setConfig(r); setSurge(r.surge_multiplier) })
      .catch(() => {})
  }, [])

  async function saveSurge() {
    setSaving(true)
    await api.put('/api/v1/admin/pricing/surge', { surge_multiplier: surge }).catch(() => {})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (config) setConfig({ ...config, surge_multiplier: surge })
  }

  const baseFare = config ? config[`base_fare_${vehicleType}` as keyof PricingConfig] as number : 50
  const perKm = config ? config[`per_km_${vehicleType}` as keyof PricingConfig] as number : 15
  const perMin = config?.per_min ?? 2
  const bookingFee = config?.booking_fee ?? 10
  const minFare = config?.min_fare ?? 89

  // Sample: 2km, 5min ride
  const previewFare = config
    ? Math.max(minFare, (baseFare + perKm * 2 + perMin * 5 + bookingFee) * surge)
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
          <p className="text-xs text-gray-400 mb-1">Applies to all vehicle types. Persists across deploys.</p>
          <button
            onClick={saveSurge}
            disabled={saving}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Apply Surge'}
          </button>
        </div>

        {/* Fare preview by vehicle type */}
        {config && (
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-medium text-gray-700 mb-3">Fare Preview — 2 km, 5 min</h3>

            {/* Vehicle type toggle */}
            <div className="flex gap-1 mb-4">
              {(['lite', 'plus', 'moto'] as VehicleType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setVehicleType(t)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    vehicleType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {VEHICLE_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="space-y-2 text-sm">
              {[
                ['Base fare', `₱${baseFare}`],
                ['Per km (×2)', `₱${(perKm * 2).toFixed(2)}`],
                ['Per minute (×5)', `₱${(perMin * 5).toFixed(2)}`],
                ['Booking fee', `₱${bookingFee}`],
                surge > 1 ? [`Surge (×${surge.toFixed(1)})`, ''] : null,
                ['Min fare', `₱${minFare}`],
              ].filter((x): x is [string, string] => x !== null).map(([label, val]) => (
                <div key={label as string} className="flex justify-between text-gray-600">
                  <span>{label}</span>
                  {val && <span className="font-medium text-gray-800">{val}</span>}
                </div>
              ))}
              <div className="flex justify-between text-gray-800 font-bold border-t pt-2 mt-2">
                <span>Estimated Total</span>
                <span>₱{previewFare.toFixed(0)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Edit base fares and per-km rates in Platform Config.</p>
          </div>
        )}
      </div>
    </div>
  )
}
