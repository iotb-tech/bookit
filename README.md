# BookIt

BookIt is a full-stack mentorship and study-group platform built with Next.js and Supabase. It supports two related but different learning flows:

1. **One-to-one mentorship** — a mentee chooses one real mentor availability slot and confirms a booking.
2. **Study groups** — a mentee joins a group once, then every active member can attend the shared sessions scheduled for that group.

The existing BookIt visual design remains the source of truth. Mentor and study-group features use the same spacing, cards, typography, purple primary colour, borders and navigation style already used by the project.

## Problem BookIt solves

Mentor sessions and group learning are often coordinated through messages. This creates uncertainty around availability, double-booking, group capacity and who is expected at a session.

BookIt solves this by giving mentees one place to find mentors and groups, giving mentors control over their schedule and groups, and making the database the final authority for booking, membership and capacity rules.

## User roles

### Mentee

A mentee can:

- sign up and log in with email/password;
- use Google or GitHub OAuth;
- browse Mentors and Study Groups;
- book an exact one-to-one Mentor slot;
- see and cancel personal bookings;
- join a Study Group without consuming a one-to-one slot;
- see joined groups under **My Study Groups**;
- see shared upcoming group sessions and meeting links;
- leave a Study Group.

### Mentor

A mentor can:

- use **Mentor Login** on the existing login card;
- see a protected Mentor Dashboard;
- see the real name and email of mentees who booked their one-to-one resource;
- create one-off or weekly one-to-one availability;
- pause/resume one-to-one bookings;
- manage a mentor profile and meeting link;
- cancel one-to-one sessions;
- create Study Groups;
- edit group name, headline, description, topics, capacity and meeting link;
- open/close a group to new members;
- see the real names/emails of members of groups they own;
- remove a member;
- schedule one shared session for all active members;
- cancel a shared group session;
- archive a group instead of deleting its history;
- deactivate the Mentor Profile instead of hard-deleting it;
- switch to Mentee View with the same account.

BookIt uses **one Supabase Auth system**. Selecting Mentor Login never promotes an account. Mentor access is controlled by `profiles.role = 'mentor'`.

## Mentor booking vs Study Group membership

```text
ONE-TO-ONE MENTORSHIP
Mentor availability
      ↓
Mentee chooses one slot
      ↓
Booking confirmed
      ↓
That exact slot becomes booked

STUDY GROUP
Study Group
      ↓
Mentee clicks Join Group
      ↓
Membership created
      ↓
Mentor schedules one group session
      ↓
Every active member can attend
```

A Study Group session is **not** booked once per member. If Team 4 has 11 members, the mentor schedules one Team 4 session and all 11 active members can see and attend it.

## Core technology

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- Supabase RPC / PostgreSQL functions
- TanStack Query
- React Hook Form
- Zod
- Lucide React

## Main routes

### Mentee

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/resources`
- `/resources/[id]`
- `/book/[id]` — Mentor one-to-one only
- `/my-bookings`
- `/my-study-groups`
- `/profile`
- `/settings`

### Mentor

- `/mentor/dashboard`
- `/mentor/sessions` — one-to-one bookings
- `/mentor/availability`
- `/mentor/study-groups`
- `/mentor/study-groups/[id]`
- `/mentor/profile`

## Database model

Core tables:

```text
profiles
resources
resource_availability
bookings
mentor_availability_preferences
study_group_members
study_group_sessions
```

### One-to-one mentorship

```text
resources (Mentor)
      ↓
resource_availability
      ↓
bookings
      ↓
bookings.user_id → mentee
```

### Study Groups

```text
resources (Study Group)
      ├── capacity
      ├── owner_id → mentor
      │
      ├── study_group_members
      │      └── user_id → member
      │
      └── study_group_sessions
             └── one session shared by all active members
```

## Existing Supabase project — migrations

For an **existing** BookIt Supabase project, do not run `schema.sql` over the live database.

Run migrations in this order:

```text
supabase/migrations/20260901_mentor_portal.sql
supabase/migrations/20260902_study_groups.sql
```

`20260901_mentor_portal.sql` now also safely adds/backfills the live `profiles.full_name`, `profiles.email` and `profiles.role` fields if an older database is missing them.

`20260902_study_groups.sql` adds:

- Study Group capacity;
- soft archive support;
- `study_group_members`;
- `study_group_sessions`;
- atomic Join Group capacity checking;
- Leave Group;
- mentor member removal;
- guarded group-member name/email lookup;
- guarded real mentee name/email lookup for Mentor Sessions;
- Study Group session RLS;
- protection that prevents Study Groups from using the one-to-one booking RPC.

For a **brand-new** Supabase project, `supabase/schema.sql` is the complete fresh-install reference.

## Assigning a mentor role

The mentor first creates a normal BookIt account. An authorised administrator then promotes the account using Supabase Auth as the trusted email source:

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

## Real mentee names and emails

Mentor Sessions no longer depends only on possibly incomplete old `profiles` rows. The guarded function:

```text
mentor_get_sessions(resource_id)
```

first verifies that the logged-in mentor owns the resource, then resolves the booking user against Supabase Auth and returns the real email plus the best available name.

The same pattern is used for Study Group member management:

```text
mentor_get_study_group_members(resource_id)
```

Only the owning mentor can use it.

## Study Group capacity

Joining is handled by the database function:

```text
join_study_group(resource_id)
```

It locks the group row, checks whether the group is open and not archived, counts active members and refuses the join if capacity has been reached. This prevents two simultaneous joins from silently overfilling the group.

## Study Group archive rule

Study Groups are archived instead of hard-deleted:

```text
archived_at = timestamp
status = unavailable
```

Archived groups disappear from normal Resources, stop accepting new members and keep their members/session history.

## Mentor Profile deactivation

Mentor Profile deactivation also uses soft deactivation. It hides the mentor resource and stops new bookings while keeping:

- the Supabase account;
- completed sessions;
- cancelled sessions;
- study groups;
- historical records.

It can later be reactivated.

## Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Do not commit `.env.local`.

## Local verification

```powershell
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

The release was statically checked with TypeScript and ESLint. The final production build should still be run on the project machine because a Linux SWC package could not be downloaded in the offline artifact environment.

See `docs/CROSS_ROLE_TESTING.md` for the end-to-end test checklist.
