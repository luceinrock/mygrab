import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface PlatformConfig {
  min_driver_balance: number
  commission_short_km: number
  commission_medium_km: number
  commission_fee_short: number
  commission_fee_medium: number
  commission_fee_long: number
  min_topup_amount: number
  base_fare_lite: number
  base_fare_plus: number
  base_fare_moto: number
  per_km_lite: number
  per_km_plus: number
  per_km_moto: number
  updated_at: string
}

function Field({
  label, description, value, onChange,
}: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-24 text-right border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    </div>
  )
}

export default function Config() {
  const [config, setConfig] = useState<PlatformConfig | null>(null)
  const [draft, setDraft] = useState<PlatformConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get<{ config: PlatformConfig }>('/api/v1/admin/config')
      .then(r => { setConfig(r.config); setDraft(r.config) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set(key: keyof PlatformConfig, value: number) {
    setDraft(d => d ? { ...d, [key]: value } : d)
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    const { updated_at: _, ...fields } = draft
    await api.put<{ config: PlatformConfig }>('/api/v1/admin/config', fields)
      .then(r => { setConfig(r.config); setDraft(r.config); setSaved(true); setTimeout(() => setSaved(false), 2000) })
      .catch(() => {})
    setSaving(false)
  }

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>
  if (!draft) return <p className="text-red-500 text-sm">Failed to load config.</p>

  const dirty = JSON.stringify(config) !== JSON.stringify(draft)

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Platform Config</h2>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Driver Credits</p>
        <Field
          label="Minimum balance to go online"
          description="Driver must have at least this many credits to toggle online (₱)"
          value={draft.min_driver_balance}
          onChange={v => set('min_driver_balance', v)}
        />
        <Field
          label="Minimum top-up amount"
          description="Smallest top-up accepted at an outlet (₱)"
          value={draft.min_topup_amount}
          onChange={v => set('min_topup_amount', v)}
        />
      </div>

      <div className="bg-white rounded-xl border p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Commission Tiers (flat fee per ride)</p>
        <Field
          label="Short trip threshold"
          description="Trips below this distance are billed the short fee (km)"
          value={draft.commission_short_km}
          onChange={v => set('commission_short_km', v)}
        />
        <Field
          label="Medium trip threshold"
          description="Trips below this distance (but above short) are billed the medium fee (km)"
          value={draft.commission_medium_km}
          onChange={v => set('commission_medium_km', v)}
        />
        <Field
          label="Short trip commission fee"
          description={`Flat fee deducted for trips < ${draft.commission_short_km} km (₱)`}
          value={draft.commission_fee_short}
          onChange={v => set('commission_fee_short', v)}
        />
        <Field
          label="Medium trip commission fee"
          description={`Flat fee for ${draft.commission_short_km}–${draft.commission_medium_km} km trips (₱)`}
          value={draft.commission_fee_medium}
          onChange={v => set('commission_fee_medium', v)}
        />
        <Field
          label="Long trip commission fee"
          description={`Flat fee for trips ≥ ${draft.commission_medium_km} km (₱)`}
          value={draft.commission_fee_long}
          onChange={v => set('commission_fee_long', v)}
        />
      </div>

      <div className="bg-white rounded-xl border p-4 mt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Vehicle-Type Base Fare (₱)</p>
        <Field label="Lite base fare" description="Starting fare for Lite (Sedan/Hatchback)" value={draft.base_fare_lite} onChange={v => set('base_fare_lite', v)} />
        <Field label="Plus base fare" description="Starting fare for Plus (SUV/Van)" value={draft.base_fare_plus} onChange={v => set('base_fare_plus', v)} />
        <Field label="Moto base fare" description="Starting fare for Moto (Motorcycle)" value={draft.base_fare_moto} onChange={v => set('base_fare_moto', v)} />
      </div>

      <div className="bg-white rounded-xl border p-4 mt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Vehicle-Type Rate per km (₱)</p>
        <Field label="Lite per km" description="Charge per km for Lite rides" value={draft.per_km_lite} onChange={v => set('per_km_lite', v)} />
        <Field label="Plus per km" description="Charge per km for Plus rides" value={draft.per_km_plus} onChange={v => set('per_km_plus', v)} />
        <Field label="Moto per km" description="Charge per km for Moto rides" value={draft.per_km_moto} onChange={v => set('per_km_moto', v)} />
      </div>

      {config?.updated_at && (
        <p className="text-xs text-gray-400 mt-3">
          Last updated: {new Date(config.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}
