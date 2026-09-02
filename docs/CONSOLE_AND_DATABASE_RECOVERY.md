# BookIt Console + Database Recovery

This recovery applies to the two errors:

1. `Encountered a script tag while rendering React component`
2. `column study_group_sessions.cancellation_reason does not exist`

## Frontend fix

The theme bootstrap no longer renders `<script>` or `next/script`.
`src/app/layout.tsx` now mounts `ThemeInitializer`, a client component that
applies the saved Light/Dark/System preference inside `useEffect`.

After replacing the files:

```powershell
Ctrl + C
Remove-Item -Recurse -Force .next
npm run dev
```

## Database fix

If `pending` has not already been added to the live `booking_status` enum,
run this first as its own Supabase SQL query:

`supabase/migrations/20260902_00_add_pending_booking_status.sql`

Wait for Success.

Then run:

`supabase/migrations/20260902_workflow_notifications_settings.sql`

The corrected workflow SQL now adds these columns near the very beginning:

- `study_group_sessions.cancellation_reason`
- `study_group_sessions.cancelled_by`
- `study_group_sessions.cancelled_at`

The workflow migration is designed to be rerun after a partial/failed attempt.

Do not run `supabase/schema.sql` against the existing live database.
