# BookIt Final Workflow Patch — Implementation Steps

This patch is based directly on `BOOKIT(7).zip` and preserves the current BookIt design.

## Apply the patch

1. Stop `npm run dev`.
2. Back up `C:\Users\HP\Desktop\BOOKIT`.
3. Extract `BOOKIT_7_WORKFLOW_ENHANCEMENTS_PATCH.zip`.
4. Copy everything inside the extracted patch folder.
5. Paste into `C:\Users\HP\Desktop\BOOKIT`.
6. Choose **Replace the files in the destination**.
7. Keep your existing `.env.local`; the patch does not include it.
8. Do not copy `.next`, `node_modules`, or `.git` from anywhere else.

## Supabase

For the existing shared BookIt database, run only this new migration after the previous mentor/study-group migrations:

```text
supabase/migrations/20260902_workflow_notifications_settings.sql
```

Do **not** run `supabase/schema.sql` on the existing live database. `schema.sql` is synchronized as the fresh-install reference.

## Restart and test

```powershell
cd C:\Users\HP\Desktop\BOOKIT
npm run dev
```

Test in this order:

1. Mentee sends a one-to-one booking request.
2. Mentor sees it under Sessions → Requests.
3. Mentor confirms it; mentee receives a notification.
4. Repeat and have mentor cancel with a required reason.
5. Mentee opens Messages/Notifications and sees the reason.
6. Mentee requests a reschedule; mentor approves/declines it.
7. Mentor clears open availability and verifies booked slots remain.
8. Mentor saves Study Group regular days/times and generates sessions.
9. Verify conflicting group/one-to-one times are skipped/rejected.
10. Cancel a Study Group session with a reason and verify member notifications.
11. Mark Study Group attendance after a completed session.
12. Fill a Study Group to capacity, join the waitlist, then free a space and verify promotion.
13. Test Light/Dark/System theme, notification preferences and password change.
14. Verify unread notification badges and Mark all as read.

## Final local verification

```powershell
npm run typecheck
npm run lint
npm run build
```

Do not push to GitHub until all three pass locally.
