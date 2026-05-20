import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ActiveRides from './pages/ActiveRides'
import Drivers from './pages/Drivers'
import Pricing from './pages/Pricing'
import Riders from './pages/Riders'
import Config from './pages/Config'
import SystemLogs from './pages/SystemLogs'
import RideHistory from './pages/RideHistory'
import DriverMap from './pages/DriverMap'
import Promos from './pages/Promos'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="rides" element={<ActiveRides />} />
          <Route path="ride-history" element={<RideHistory />} />
          <Route path="driver-map" element={<DriverMap />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="riders" element={<Riders />} />
          <Route path="config" element={<Config />} />
          <Route path="logs" element={<SystemLogs />} />
          <Route path="promos" element={<Promos />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
