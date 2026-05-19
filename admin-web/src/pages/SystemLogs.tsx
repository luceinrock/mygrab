import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface AdminLog {
  id: string
  action_type: string
  details: Record<string, unknown>
  created_at: string
  admin: { full_name: string; email: string } | null
  target_entity_id: string | null
}

interface UserRow {
  id: string
  email: string
  role: string
  last_sign_in_at: string | null
  created_at: string
}

type Tab = 'admin_actions' | 'users'

const ACTION_COLORS: Record<string, string> = {
  driver_registered: 'bg-blue-100 text-blue-700',
  driver_verified: 'bg-green-100 text-green-700',
  driver_rejected: 'bg-red-100 text-red-700',
  driver_wallet_topup: 'bg-yellow-100 text-yellow-700',
  rider_registered: 'bg-purple-100 text-purple-700',
  mock_data_deleted: 'bg-gray-100 text-gray-600',
}

function actionBadge(type: string) {
  const cls = ACTION_COLORS[type] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {type.replace(/_/g, ' ')}
    </span>
  )
}

function fmt(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    driver: 'bg-blue-100 text-blue-700',
    customer: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  )
}

export default function SystemLogs() {
  const [tab, setTab] = useState<Tab>('admin_actions')
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (tab === 'admin_actions') loadAdminLogs()
    else loadUsers()
  }, [tab])

  async function loadAdminLogs() {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('admin_logs')
        .select('id, action_type, target_entity_id, details, created_at, profiles!admin_logs_admin_id_fkey(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (err) throw err
      setLogs((data ?? []).map((r: any) => ({ ...r, admin: r.profiles ?? null })))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false })
      if (err) throw err

      const { data: authData } = await supabase.auth.admin?.listUsers?.() ?? { data: null }
      const authMap: Record<string, string | null> = {}
      if (authData?.users) {
        for (const u of authData.users) {
          authMap[u.id] = u.last_sign_in_at ?? null
        }
      }

      setUsers((data ?? []).map((p: any) => ({
        ...p,
        last_sign_in_at: authMap[p.id] ?? null,
      })))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'admin_actions', label: 'Admin Actions' },
    { key: 'users', label: 'Users & Sessions' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">System Logs</h1>
        <button
          onClick={() => tab === 'admin_actions' ? loadAdminLogs() : loadUsers()}
          className="text-sm text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {loading && <p className="text-gray-400 text-sm">Loading...</p>}

      {!loading && tab === 'admin_actions' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {logs.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No admin actions recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Time</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">By</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(log.created_at)}</td>
                    <td className="px-4 py-3">{actionBadge(log.action_type)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.admin ? (
                        <span title={log.admin.email ?? ''}>{log.admin.full_name}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && tab === 'users' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {users.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No users found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Last Sign In</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.email}</td>
                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(u.last_sign_in_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
