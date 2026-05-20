# MyGrab — Project Brief

## What is this
MyGrab is a ride-sharing platform for the Philippines (Cebu area). Three clients:
- **Admin web dashboard** (React/Tailwind, deployed on Render as static site)
- **Android driver app** (Kotlin/Compose)
- **Android rider app** (Kotlin/Compose)
- **Backend API** (Express/TypeScript, deployed on Render)
- **Database** (Supabase — PostgreSQL + Auth + Realtime)

## What's already shipped
- Full ride lifecycle: request → accept → arrive → start → complete → rate
- Driver verification workflow + admin approval
- Driver wallet, commission deduction, top-up
- Real-time driver location tracking (GPS batch upload)
- Online/offline status with Supabase Realtime (WebSocket, no polling)
- Admin dashboard: stats, driver/rider management, pricing config, system logs, online drivers panel
- Ride history in both apps
- Go-offline on logout/app kill fix

## What's not done
See ROADMAP.md.

## Stack
- Backend: Express + TypeScript + Zod validation, hosted on Render
- DB: Supabase (PostgreSQL, Auth JWT, Realtime pub/sub)
- Admin: React 18, Tailwind CSS, Supabase JS client
- Apps: Kotlin, Jetpack Compose, Hilt DI, Retrofit, MapLibre maps
- Payments: stubbed (GCash/PayMaya — out of scope until gateway contract signed)
