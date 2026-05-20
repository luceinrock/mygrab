import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface PromoCode {
  id: string
  code: string
  description: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_fare: number
  max_uses: number | null
  uses_per_rider: number
  times_used: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_type: 'percent' as 'percent' | 'fixed',
  discount_value: '',
  min_fare: '',
  max_uses: '',
  uses_per_rider: '1',
  valid_from: '',
  valid_until: '',
}

export default function Promos() {
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  function load() {
    setLoading(true)
    api.get<{ promos: PromoCode[] }>('/api/v1/admin/promos')
      .then(r => setPromos(r.promos))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function toggle(id: string) {
    await api.patch<{ promo: PromoCode }>(`/api/v1/admin/promos/${id}/toggle`, {})
      .then(r => setPromos(ps => ps.map(p => p.id === id ? r.promo : p)))
      .catch(() => {})
  }

  async function create() {
    setFormError('')
    if (!form.code.trim()) { setFormError('Code is required'); return }
    if (!form.discount_value || isNaN(Number(form.discount_value))) { setFormError('Discount value is required'); return }
    if (form.discount_type === 'percent' && (Number(form.discount_value) <= 0 || Number(form.discount_value) > 100)) {
      setFormError('Percent must be 1–100'); return
    }
    setSaving(true)
    try {
      await api.post<{ promo: PromoCode }>('/api/v1/admin/promos', {
        code: form.code.trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_fare: Number(form.min_fare || 0),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        uses_per_rider: Number(form.uses_per_rider || 1),
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (e: any) {
      setFormError(e?.message === 'code_already_exists' ? 'Code already exists' : 'Failed to create promo')
    } finally {
      setSaving(false)
    }
  }

  function discountLabel(p: PromoCode) {
    return p.discount_type === 'percent'
      ? `${p.discount_value}% off`
      : `₱${p.discount_value} off`
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Promo Codes</h2>
        <button
          onClick={() => { setShowForm(s => !s); setFormError('') }}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Promo'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Create promo code</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Code *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5 uppercase"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Description</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Summer sale 20% off"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Discount type *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))}
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (₱)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">
                Discount value * {form.discount_type === 'percent' ? '(1–100)' : '(₱)'}
              </label>
              <input
                type="number"
                min="0"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === 'percent' ? '20' : '50'}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Min fare (₱, 0 = any)</label>
              <input
                type="number"
                min="0"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                value={form.min_fare}
                onChange={e => setForm(f => ({ ...f, min_fare: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Max total uses (blank = unlimited)</label>
              <input
                type="number"
                min="1"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="100"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Uses per rider</label>
              <input
                type="number"
                min="1"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                value={form.uses_per_rider}
                onChange={e => setForm(f => ({ ...f, uses_per_rider: e.target.value }))}
                placeholder="1"
              />
            </div>
            <div />
            <div>
              <label className="text-xs text-gray-500">Valid from (optional)</label>
              <input
                type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                value={form.valid_from}
                onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Valid until (optional)</label>
              <input
                type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                value={form.valid_until}
                onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
              />
            </div>
          </div>
          {formError && <p className="text-red-500 text-xs mt-2">{formError}</p>}
          <div className="mt-4 flex justify-end">
            <button
              onClick={create}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? 'Creating…' : 'Create Promo'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : promos.length === 0 ? (
        <p className="text-gray-400 text-sm">No promo codes yet.</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Discount</th>
                <th className="text-left px-4 py-3">Min Fare</th>
                <th className="text-left px-4 py-3">Uses</th>
                <th className="text-left px-4 py-3">Validity</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {promos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-gray-800">{p.code}</p>
                    {p.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-blue-700">{discountLabel(p)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {Number(p.min_fare) > 0 ? `₱${p.min_fare}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.times_used}{p.max_uses != null ? `/${p.max_uses}` : ''}{' '}
                    <span className="text-gray-400 text-xs">(×{p.uses_per_rider}/rider)</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.valid_from ? new Date(p.valid_from).toLocaleDateString() : '—'}
                    {' → '}
                    {p.valid_until ? new Date(p.valid_until).toLocaleDateString() : '∞'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(p.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
