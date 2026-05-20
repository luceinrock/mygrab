# Summary 01-02 — Auto-Cancel Stale Rides

**Status:** DONE ✓
**Commit:** "01-02: Auto-cancel stale rides after 2.5 min (cron job)"

## What was done
- Installed `node-cron` + `@types/node-cron`
- Created `backend/src/jobs/cancelStaleRides.ts` — queries rides where `status=requested`, `driver_id IS NULL`, `created_at < NOW()-2.5min`; updates to `cancelled` + `cancellation_reason=no_driver_available`
- Wired into `index.ts` on a `* * * * *` schedule (every 60 seconds)
- `ActiveRides.tsx` — now fetches active rides + recently timed-out rides (last 15 min); shows orange "Timed out" badge for `no_driver_available` cancellations

## Integration verified
Inserted a 3-minute-old stale test ride; SQL simulation of the job correctly cancelled it with reason `no_driver_available`.

## Deviations
None.

## Checkpoint needed
`checkpoint:human-verify` — After Render redeploy, request a ride and let it sit for 2.5 min with no driver. Confirm it appears as "Timed out" in admin ActiveRides.
