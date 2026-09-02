# BookIt Study Group Update

This update keeps the existing one-to-one mentor booking flow and adds a separate membership model for Study Groups.

## Required live database migration

Run after the mentor portal migration:

```text
supabase/migrations/20260902_study_groups.sql
```

Do not run `schema.sql` on the existing Supabase project.

## Expected Team 4 flow

1. Mentor creates **Team 4** with capacity 15.
2. Eleven BookIt users independently open Team 4 and click **Join Group**.
3. The database creates 11 active rows in `study_group_members`.
4. The mentor sees 11/15 and can see each active member's name/email.
5. Mentor schedules one Saturday session.
6. All 11 active members see the same session under **My Study Groups**.
7. No member consumes or blocks the group session for another member.

## One-to-one booking remains separate

Mentor resources continue using:

```text
resource_availability → bookings
```

Study Groups use:

```text
study_group_members + study_group_sessions
```
