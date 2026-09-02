# BookIt Mentor + Study Group Implementation Steps

## Existing project

1. Keep your current BookIt folder as a backup.
2. Replace it with the updated project files or apply the patch.
3. Keep your existing `.env.local`; it is intentionally not included in release ZIP files.
4. On the live Supabase project, confirm the mentor migration has been applied:
   - `20260901_mentor_portal.sql`
5. Run the new migration:
   - `20260902_study_groups.sql`
6. Do not run `schema.sql` on the existing database.
7. Restart the app.
8. Test one-to-one Mentor booking first.
9. Test Study Group create/join/member/session flows.
10. Run `npm run typecheck`, `npm run lint`, and `npm run build` locally before pushing.

## Important behavior

- Mentor resources still use exact-slot booking.
- Study Groups do not use exact-slot booking.
- Study Group Join creates membership.
- One group session is visible to all active members.
- Study Group archive keeps history.
- Mentor Profile deactivation keeps the BookIt account/history.
