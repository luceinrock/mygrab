import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #07101F 0%, #0A1628 50%, #112040 100%)' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0066FF, transparent)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #FF7A00, transparent)' }}
        />
      </div>

      <div className="w-full max-w-sm px-4 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0066FF 0%, #FF7A00 100%)' }}
          >
            RN
          </div>
          <h1 className="text-2xl font-bold text-white">RideNow Admin</h1>
          <p className="text-steel-500 text-sm mt-1">Secure admin access only</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7 border"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-steel-400 uppercase tracking-widest mb-1.5">
                Email
              </label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-steel-500 bg-white/[0.06] border border-white/10 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-steel-400 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-steel-500 bg-white/[0.06] border border-white/10 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              style={{ background: loading ? '#0052CC' : 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)' }}
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-steel-600 mt-6">
          RideNow Philippines · Admin Console
        </p>
      </div>
    </div>
  )
}
