# Mentor Account Setup

BookIt uses one Supabase Auth system for both mentees and mentors. Mentor access is controlled by `profiles.role`; choosing **Mentor Login** never promotes an account.

## 1. Run migrations on the existing Supabase project

Run in order:

```text
supabase/migrations/20260901_mentor_portal.sql
supabase/migrations/20260902_study_groups.sql
```

Do **not** run the full `supabase/schema.sql` over an existing database. `schema.sql` is for a fresh database.

The updated migrations also repair older live `profiles` tables that are missing `full_name`, `email` or `role` and backfill those values from Supabase Auth where possible.

## 2. Create/sign up the mentor account

The mentor signs up normally using BookIt email/password or an enabled OAuth provider. The account begins as a mentee.

## 3. Assign the mentor role as an authorised admin action

Use `auth.users` as the trusted email source:

```sql
update public.profiles p
set
  role = 'mentor',
  updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('mentor@example.com');
```

Verify:

```sql
select
  p.id,
  p.full_name,
  u.email,
  p.role
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('mentor@example.com');
```

The role should be `mentor`.

## 4. Connect an existing Mentor resource instead of duplicating it

If that mentor already exists in BookIt Resources, connect the existing resource to the Auth user:

```sql
update public.resources r
set owner_id = u.id
from auth.users u
where lower(u.email) = lower('mentor@example.com')
  and lower(r.name) = lower('Mentor Name');
```

## 5. Mentor profile and one-to-one availability

Use:

```text
/login?mode=mentor
/mentor/profile
/mentor/availability
```

The mentor can maintain their one-to-one mentor profile, meeting link and availability.

## 6. Study Group management

Use:

```text
/mentor/study-groups
```

The mentor can create groups, set capacity, see real member names/emails, schedule shared sessions, remove members and archive groups.

## Security rule

Do not add a public "Become a Mentor" button that writes `profiles.role = 'mentor'`. Mentor promotion remains an authorised administrative action.
