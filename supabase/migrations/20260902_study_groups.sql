-- BookIt study-group membership and mentor management upgrade.
-- Run AFTER 20260901_mentor_portal.sql on an existing BookIt Supabase project.
-- This migration is additive and keeps the existing one-to-one mentor booking flow.

create extension if not exists pgcrypto;

-- =========================================================
-- 0. LIVE-DATABASE PROFILE COMPATIBILITY
-- =========================================================
-- Some older BookIt databases were created with only profiles.id.
-- Add the fields now used by the mentee/mentor application and backfill
-- trusted email/name data from Supabase Auth.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists role text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.profiles
  alter column role set default 'mentee';

update public.profiles p
set
  email = lower(u.email),
  full_name = coalesce(
    nullif(p.full_name, ''),
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(u.email, 'BookIt Mentee'), '@', 1)
  ),
  role = case
    when p.role is null then 'mentee'
    when lower(p.role) in ('student', 'fellow', 'user') then 'mentee'
    when lower(p.role) = 'mentor' then 'mentor'
    else 'mentee'
  end,
  updated_at = now()
from auth.users u
where p.id = u.id;

update public.profiles
set role = 'mentee'
where role is null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('mentee', 'mentor'));

alter table public.profiles
  alter column role set not null;

create unique index if not exists profiles_email_lower_unique_idx
  on public.profiles (lower(email))
  where email is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'BookIt User'), '@', 1)
    ),
    lower(new.email),
    'mentee',
    now(),
    now()
  )
  on conflict (id)
  do update set
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- 1. STUDY GROUP RESOURCE FIELDS
-- =========================================================

alter table public.resources
  add column if not exists capacity integer not null default 15,
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resources_capacity_check'
      and conrelid = 'public.resources'::regclass
  ) then
    alter table public.resources
      add constraint resources_capacity_check
      check (capacity between 2 and 200);
  end if;
end $$;

create index if not exists resources_owner_type_idx
  on public.resources(owner_id, type);

create index if not exists resources_archived_idx
  on public.resources(archived_at);

-- =========================================================
-- 2. STUDY GROUP MEMBERSHIP
-- =========================================================

create table if not exists public.study_group_members (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'leader')),
  status text not null default 'active' check (status in ('active', 'left', 'removed')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  removed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(resource_id, user_id)
);

create index if not exists study_group_members_resource_status_idx
  on public.study_group_members(resource_id, status);

create index if not exists study_group_members_user_status_idx
  on public.study_group_members(user_id, status);

-- =========================================================
-- 3. STUDY GROUP SESSIONS
-- =========================================================

create table if not exists public.study_group_sessions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  meeting_link text,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists study_group_sessions_resource_start_idx
  on public.study_group_sessions(resource_id, start_time);

-- =========================================================
-- 4. SECURITY HELPERS
-- =========================================================

create or replace function public.is_study_group_resource(p_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.resources r
    where r.id = p_resource_id
      and lower(replace(r.type::text, ' ', '_')) = 'study_group'
  );
$$;

create or replace function public.is_active_study_group_member(p_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.study_group_members m
    where m.resource_id = p_resource_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

-- =========================================================
-- 5. RLS
-- =========================================================

alter table public.study_group_members enable row level security;
alter table public.study_group_sessions enable row level security;

-- Public authenticated resource browsing excludes archived resources.
-- Owners may still read archived resources through their mentor management views.
drop policy if exists "Authenticated users can view resources" on public.resources;
drop policy if exists "Authenticated users can view active resources" on public.resources;
create policy "Authenticated users can view active resources"
on public.resources for select to authenticated
using (archived_at is null or owner_id = auth.uid());

-- Study-group creation is a mentor responsibility.
drop policy if exists "Owners can create allowed resources" on public.resources;
create policy "Mentors can create resources they own"
on public.resources for insert to authenticated
with check (
  auth.uid() = owner_id
  and public.is_current_user_mentor()
);

-- Keep updates owner-only. Study groups are archived instead of hard-deleted.
drop policy if exists "Owners can update their own resources" on public.resources;
create policy "Owners can update their own resources"
on public.resources for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete their own resources" on public.resources;

-- Members may read only their own membership row. The owning mentor may read
-- membership rows for groups they own. Profile email/name exposure to the mentor
-- is handled by a guarded security-definer function below.
drop policy if exists "Members and owners can view group memberships" on public.study_group_members;
create policy "Members and owners can view group memberships"
on public.study_group_members for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.resources r
    where r.id = study_group_members.resource_id
      and r.owner_id = auth.uid()
      and public.is_current_user_mentor()
  )
);

-- Membership writes happen through RPCs so capacity, ownership, and status checks
-- cannot be bypassed from the browser.

-- Group sessions are private to active members and the owning mentor.
drop policy if exists "Group members and owners can view group sessions" on public.study_group_sessions;
create policy "Group members and owners can view group sessions"
on public.study_group_sessions for select to authenticated
using (
  exists (
    select 1
    from public.resources r
    where r.id = study_group_sessions.resource_id
      and r.owner_id = auth.uid()
  )
  or public.is_active_study_group_member(study_group_sessions.resource_id)
);

drop policy if exists "Owners can create group sessions" on public.study_group_sessions;
create policy "Owners can create group sessions"
on public.study_group_sessions for insert to authenticated
with check (
  created_by = auth.uid()
  and public.current_user_owns_resource(resource_id)
  and public.is_current_user_mentor()
  and public.is_study_group_resource(resource_id)
);

drop policy if exists "Owners can update group sessions" on public.study_group_sessions;
create policy "Owners can update group sessions"
on public.study_group_sessions for update to authenticated
using (
  public.current_user_owns_resource(resource_id)
  and public.is_current_user_mentor()
)
with check (
  public.current_user_owns_resource(resource_id)
  and public.is_current_user_mentor()
);

-- =========================================================
-- 6. STUDY GROUP SUMMARY / MEMBERSHIP RPCS
-- =========================================================

create or replace function public.get_study_group_summary(p_resource_id uuid)
returns table (
  capacity integer,
  member_count bigint,
  membership_status text,
  can_join boolean,
  is_owner boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target public.resources%rowtype;
  current_status text;
  active_count bigint;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into target
  from public.resources r
  where r.id = p_resource_id
    and lower(replace(r.type::text, ' ', '_')) = 'study_group';

  if target.id is null then
    raise exception 'STUDY_GROUP_NOT_FOUND';
  end if;

  select count(*) into active_count
  from public.study_group_members m
  where m.resource_id = p_resource_id
    and m.status = 'active';

  select m.status into current_status
  from public.study_group_members m
  where m.resource_id = p_resource_id
    and m.user_id = auth.uid();

  return query
  select
    target.capacity,
    active_count,
    current_status,
    (
      target.archived_at is null
      and target.status = 'available'
      and target.owner_id <> auth.uid()
      and coalesce(current_status, '') <> 'active'
      and active_count < target.capacity
    ),
    target.owner_id = auth.uid();
end;
$$;

create or replace function public.join_study_group(p_resource_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.resources%rowtype;
  active_count bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target
  from public.resources r
  where r.id = p_resource_id
    and lower(replace(r.type::text, ' ', '_')) = 'study_group'
  for update;

  if target.id is null then raise exception 'STUDY_GROUP_NOT_FOUND'; end if;
  if target.archived_at is not null then raise exception 'STUDY_GROUP_ARCHIVED'; end if;
  if target.status <> 'available' then raise exception 'STUDY_GROUP_CLOSED'; end if;
  if target.owner_id = auth.uid() then raise exception 'GROUP_OWNER_IS_HOST'; end if;

  if exists (
    select 1 from public.study_group_members m
    where m.resource_id = p_resource_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ) then
    return true;
  end if;

  select count(*) into active_count
  from public.study_group_members m
  where m.resource_id = p_resource_id
    and m.status = 'active';

  if active_count >= target.capacity then raise exception 'STUDY_GROUP_FULL'; end if;

  insert into public.study_group_members (
    resource_id, user_id, role, status, joined_at, left_at, removed_at, updated_at
  )
  values (
    p_resource_id, auth.uid(), 'member', 'active', now(), null, null, now()
  )
  on conflict (resource_id, user_id)
  do update set
    status = 'active',
    role = 'member',
    joined_at = now(),
    left_at = null,
    removed_at = null,
    updated_at = now();

  return true;
end;
$$;

create or replace function public.leave_study_group(p_resource_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.study_group_members
  set
    status = 'left',
    left_at = now(),
    updated_at = now()
  where resource_id = p_resource_id
    and user_id = auth.uid()
    and status = 'active';

  if not found then raise exception 'ACTIVE_MEMBERSHIP_NOT_FOUND'; end if;
  return true;
end;
$$;

create or replace function public.mentor_remove_study_group_member(
  p_resource_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;
  if not public.current_user_owns_resource(p_resource_id) then raise exception 'RESOURCE_NOT_OWNED'; end if;
  if not public.is_study_group_resource(p_resource_id) then raise exception 'NOT_STUDY_GROUP'; end if;

  update public.study_group_members
  set
    status = 'removed',
    removed_at = now(),
    updated_at = now()
  where resource_id = p_resource_id
    and user_id = p_user_id
    and status = 'active';

  if not found then raise exception 'ACTIVE_MEMBERSHIP_NOT_FOUND'; end if;
  return true;
end;
$$;

-- =========================================================
-- 7. GUARDED MEMBER DIRECTORY FOR THE OWNING MENTOR
-- =========================================================

create or replace function public.mentor_get_study_group_members(p_resource_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  status text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;
  if not public.current_user_owns_resource(p_resource_id) then raise exception 'RESOURCE_NOT_OWNED'; end if;
  if not public.is_study_group_resource(p_resource_id) then raise exception 'NOT_STUDY_GROUP'; end if;

  return query
  select
    m.user_id,
    coalesce(
      nullif(p.full_name, ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(u.email, 'BookIt Mentee'), '@', 1)
    )::text as full_name,
    u.email::text as email,
    m.role,
    m.status,
    m.joined_at
  from public.study_group_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.resource_id = p_resource_id
  order by
    case when m.status = 'active' then 0 else 1 end,
    m.joined_at asc;
end;
$$;

-- =========================================================
-- 8. GUARDED MENTOR SESSION DIRECTORY
-- =========================================================
-- Fixes "BookIt Mentee / Email unavailable" by resolving the booking user
-- against auth.users after verifying the logged-in mentor owns the resource.

create or replace function public.mentor_get_sessions(p_resource_id uuid)
returns table (
  id uuid,
  resource_id uuid,
  user_id uuid,
  availability_id uuid,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  cancelled_by text,
  cancellation_reason text,
  created_at timestamptz,
  mentee_full_name text,
  mentee_email text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;
  if not public.current_user_owns_resource(p_resource_id) then raise exception 'RESOURCE_NOT_OWNED'; end if;

  return query
  select
    b.id,
    b.resource_id,
    b.user_id,
    b.availability_id,
    b.start_time,
    b.end_time,
    b.status::text,
    b.cancelled_by::text,
    b.cancellation_reason,
    b.created_at,
    coalesce(
      nullif(p.full_name, ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(u.email, 'BookIt Mentee'), '@', 1)
    )::text,
    u.email::text
  from public.bookings b
  join auth.users u on u.id = b.user_id
  left join public.profiles p on p.id = b.user_id
  where b.resource_id = p_resource_id
  order by b.start_time asc;
end;
$$;

-- =========================================================
-- 9. KEEP STUDY GROUPS OUT OF ONE-TO-ONE SLOT BOOKING
-- =========================================================
-- The mentor slot model stays unchanged. Study groups use membership + shared
-- group sessions instead of consuming a slot once per member.

create or replace function public.create_booking_from_slot(p_resource_id uuid, p_slot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  slot public.resource_availability%rowtype;
  booking_id uuid;
  target_type text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select lower(replace(r.type::text, ' ', '_'))
  into target_type
  from public.resources r
  where r.id = p_resource_id;

  if target_type = 'study_group' then
    raise exception 'STUDY_GROUP_USE_MEMBERSHIP';
  end if;

  select * into slot
  from public.resource_availability
  where id = p_slot_id and resource_id = p_resource_id
  for update;

  if slot.id is null then raise exception 'SLOT_NOT_FOUND'; end if;
  if slot.status <> 'available' then raise exception 'SLOT_NOT_AVAILABLE'; end if;
  if slot.start_time <= now() then raise exception 'SLOT_IN_PAST'; end if;
  if not exists(
    select 1 from public.resources
    where id = p_resource_id
      and status = 'available'
      and archived_at is null
  ) then
    raise exception 'RESOURCE_NOT_AVAILABLE';
  end if;

  insert into public.bookings(resource_id, user_id, availability_id, start_time, end_time, status)
  values(p_resource_id, auth.uid(), slot.id, slot.start_time, slot.end_time, 'confirmed')
  returning id into booking_id;

  update public.resource_availability
  set status = 'booked'
  where id = slot.id;

  perform public.refresh_resource_next_available(p_resource_id);
  return booking_id;
end;
$$;

-- =========================================================
-- 10. GRANTS
-- =========================================================

grant execute on function public.get_study_group_summary(uuid) to authenticated;
grant execute on function public.join_study_group(uuid) to authenticated;
grant execute on function public.leave_study_group(uuid) to authenticated;
grant execute on function public.mentor_remove_study_group_member(uuid, uuid) to authenticated;
grant execute on function public.mentor_get_study_group_members(uuid) to authenticated;
grant execute on function public.mentor_get_sessions(uuid) to authenticated;
