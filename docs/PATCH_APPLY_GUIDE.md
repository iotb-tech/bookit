
## Important: existing `booking_status` enum

Some live BookIt databases use a PostgreSQL enum named `booking_status`.
For those databases, `pending` must be added and committed before the workflow
migration can use it.

Run the SQL files in this exact order in **Supabase → SQL Editor**:

1. `supabase/migrations/20260902_00_add_pending_booking_status.sql`
   - Run this file **by itself**.
   - Wait until Supabase shows **Success**.
   - Its verification result should show `pending` among the enum values when
     the column uses an enum.
2. `supabase/migrations/20260902_workflow_notifications_settings.sql`
   - Only run this after step 1 succeeds.

Do not paste the two migrations into one SQL query. PostgreSQL requires the
new enum value to be committed before it can be used by the second migration.
The workflow migration is rerunnable, so it is safe to rerun after the enum
compatibility step.


# Apply BOOKIT_7_WORKFLOW_ENHANCEMENTS_PATCH

## 1. Back up the working project

Your project:

```text
C:\Users\HP\Desktop\BOOKIT
```

Make a copy before replacing files.

## 2. Stop development server

In VS Code terminal:

```powershell
Ctrl + C
```

## 3. Extract and copy the patch

Extract `BOOKIT_7_WORKFLOW_ENHANCEMENTS_PATCH.zip`.

Copy **everything inside** the extracted patch folder into:

```text
C:\Users\HP\Desktop\BOOKIT
```

Choose:

```text
Replace the files in the destination
```

The patch contains only new/changed project files.

It does not contain:

```text
.env.local
.git
.next
node_modules
```

## 4. Run the new Supabase migration

Open:

```text
supabase/migrations/20260902_workflow_notifications_settings.sql
```

Copy the entire file into Supabase SQL Editor and run it.

This assumes the existing mentor and Study Group migrations have already been applied.

Do **not** run `supabase/schema.sql` over the existing live database.

## 5. Restart

```powershell
cd C:\Users\HP\Desktop\BOOKIT
npm run dev
```

## 6. Verify locally

```powershell
npm run typecheck
npm run lint
npm run build
```

If any of these three commands fails, stop before pushing to GitHub and fix the reported error.
