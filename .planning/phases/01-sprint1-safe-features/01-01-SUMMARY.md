# Summary 01-01 — Surge Pricing Persistence + Vehicle-Type Pricing

**Status:** DONE ✓
**Commit:** see git log — "01-01: Surge pricing persistence + vehicle-type pricing"

## What was done
- **Migration:** Added `surge_multiplier`, `base_fare_lite/plus/moto`, `per_km_lite/plus/moto` to `platform_config` with sensible defaults (Lite ₱50+₱15/km, Plus ₱70+₱20/km, Moto ₱35+₱10/km)
- **configService:** Extended `PlatformConfig` type + `getVehicleRates()` helper
- **pricing service:** `calculateFare()` now accepts `baseFare` and `perKm` (backward compatible via defaults)
- **pricing route:** Now async — reads surge and vehicle rates from DB per request
- **rides route:** Ride creation uses DB config + `ride_type` for correct fare per vehicle
- **admin routes:** GET /pricing reads DB; PUT /pricing/surge writes DB (no more in-memory reset on deploy); PUT /config accepts 6 new vehicle rate fields
- **Admin Config page:** Added vehicle base fare and per-km sections
- **Admin Pricing page:** Added Lite/Plus/Moto toggle; fare preview updates per type

## Deviations
None.

## Checkpoint needed
`checkpoint:human-verify` — Deploy backend + admin-web on Render, then:
1. Set surge to 1.5 → redeploy backend → GET /api/v1/admin/pricing still returns 1.5
2. Toggle vehicle type in Pricing page → preview fare changes (Moto lowest, Plus highest)
