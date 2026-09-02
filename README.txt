BOOKIT 7 CONSOLE + DATABASE HOTFIX

Fixes:
1. React/Next console error caused by script rendering in src/app/layout.tsx
2. Missing study_group_sessions.cancellation_reason column

Apply the files to:
C:\Users\HP\Desktop\BOOKIT
and choose "Replace the files in the destination".

Then:
1. If needed, run 20260902_00_add_pending_booking_status.sql first.
2. Run the corrected 20260902_workflow_notifications_settings.sql.
3. Stop dev server.
4. Remove .next.
5. Run npm run dev.
