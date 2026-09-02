-- BookIt mentor portal upgrade.
-- Run once against the existing BookIt Supabase project.

create extension if not exists btree_gist;

-- =========================================================
-- 1. ROLE MODEL + SECURITY
-- =========================================================

-- Some earlier/live BookIt databases were created before the complete
-- profile model existed. Add all fields used by the mentor portal first.
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
    split_part(coalesce(u.email, 'BookIt User'), '@', 1)
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
  alter column role set not null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('mentee', 'mentor'));

create or replace function public.prevent_unapproved_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'ROLE_CHANGE_NOT_ALLOWED';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change
before update of role on public.profiles
for each row execute function public.prevent_unapproved_profile_role_change();

create or replace function public.is_current_user_mentor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'mentor'
  );
$$;

create or replace function public.current_user_owns_resource(p_resource_id uuid)
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
      and r.owner_id = auth.uid()
  );
$$;

-- =========================================================
-- 2. RESOURCE / BOOKING FIELDS USED BY MENTORS
-- =========================================================

alter table public.resources
  add column if not exists headline text,
  add column if not exists meeting_link text,
  add column if not exists timezone text not null default 'Africa/Lagos',
  add column if not exists next_available_at timestamptz;

create table if not exists public.resource_availability (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists resource_availability_resource_start_idx
  on public.resource_availability(resource_id, start_time);

create unique index if not exists resource_availability_unique_slot_idx
  on public.resource_availability(resource_id, start_time, end_time);

alter table public.bookings
  add column if not exists availability_id uuid,
  add column if not exists cancelled_by text,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_availability_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_availability_id_fkey
      foreign key (availability_id)
      references public.resource_availability(id)
      on delete set null;
  end if;
end $$;

alter table public.bookings
  drop constraint if exists bookings_cancelled_by_check;

alter table public.bookings
  add constraint bookings_cancelled_by_check
  check (cancelled_by is null or cancelled_by in ('mentee', 'mentor'));

create unique index if not exists bookings_one_confirmed_per_availability_idx
  on public.bookings(availability_id)
  where availability_id is not null and status = 'confirmed';

-- =========================================================
-- 3. MENTOR WEEKLY AVAILABILITY PREFERENCES
-- =========================================================

create table if not exists public.mentor_availability_preferences (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  days_of_week smallint[] not null default array[1,2,3,4,5]::smallint[],
  start_time time not null default time '09:00',
  end_time time not null default time '16:00',
  session_duration_minutes integer not null default 60 check (session_duration_minutes between 15 and 240),
  break_minutes integer not null default 30 check (break_minutes between 0 and 240),
  weeks_ahead integer not null default 4 check (weeks_ahead between 1 and 12),
  timezone text not null default 'Africa/Lagos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource_id)
);

-- =========================================================
-- 4. RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.resource_availability enable row level security;
alter table public.bookings enable row level security;
alter table public.mentor_availability_preferences enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

drop policy if exists "Mentors can view profiles of their booked mentees" on public.profiles;
create policy "Mentors can view profiles of their booked mentees"
on public.profiles for select to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.bookings b
    join public.resources r on r.id = b.resource_id
    where b.user_id = profiles.id
      and r.owner_id = auth.uid()
      and public.is_current_user_mentor()
  )
);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Authenticated users can view resources" on public.resources;
create policy "Authenticated users can view resources"
on public.resources for select to authenticated
using (true);

drop policy if exists "Users can create their own resources" on public.resources;
drop policy if exists "Mentors can create their own mentor resource" on public.resources;
drop policy if exists "Owners can create allowed resources" on public.resources;
create policy "Owners can create allowed resources"
on public.resources for insert to authenticated
with check (
  auth.uid() = owner_id
  and (
    public.is_current_user_mentor()
    or lower(replace(type::text, ' ', '_')) = 'study_group'
  )
);

drop policy if exists "Owners can update their own resources" on public.resources;
create policy "Owners can update their own resources"
on public.resources for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Authenticated users can view availability" on public.resource_availability;
create policy "Authenticated users can view availability"
on public.resource_availability for select to authenticated
using (true);

drop policy if exists "Owners can create availability" on public.resource_availability;
create policy "Owners can create availability"
on public.resource_availability for insert to authenticated
with check (public.current_user_owns_resource(resource_id));

drop policy if exists "Owners can update availability" on public.resource_availability;
create policy "Owners can update availability"
on public.resource_availability for update to authenticated
using (public.current_user_owns_resource(resource_id))
with check (public.current_user_owns_resource(resource_id));

drop policy if exists "Owners can delete availability" on public.resource_availability;
create policy "Owners can delete availability"
on public.resource_availability for delete to authenticated
using (public.current_user_owns_resource(resource_id));

drop policy if exists "Users can create their own bookings" on public.bookings;
drop policy if exists "Users can update their own bookings" on public.bookings;
drop policy if exists "Users can view their own bookings" on public.bookings;
create policy "Users can view their own bookings"
on public.bookings for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.resources r
    where r.id = bookings.resource_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "Mentors manage own availability preferences" on public.mentor_availability_preferences;
create policy "Mentors manage own availability preferences"
on public.mentor_availability_preferences
for all to authenticated
using (mentor_id = auth.uid() and public.is_current_user_mentor())
with check (mentor_id = auth.uid() and public.is_current_user_mentor());

-- =========================================================
-- 5. REFRESH NEXT AVAILABLE SLOT
-- =========================================================

create or replace function public.refresh_resource_next_available(p_resource_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.resources r
  set next_available_at = (
    select min(a.start_time)
    from public.resource_availability a
    where a.resource_id = r.id
      and a.status = 'available'
      and a.start_time > now()
  )
  where r.id = p_resource_id;
$$;

create or replace function public.sync_resource_next_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_resource_next_available(coalesce(new.resource_id, old.resource_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_resource_next_available_trigger on public.resource_availability;
create trigger sync_resource_next_available_trigger
after insert or update or delete on public.resource_availability
for each row execute function public.sync_resource_next_available();

-- =========================================================
-- 6. SLOT-BASED MENTEE BOOKING / CANCELLATION
-- The database is the final authority for concurrency.
-- =========================================================

create or replace function public.create_booking_from_slot(
  p_resource_id uuid,
  p_slot_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_slot public.resource_availability%rowtype;
  resource_status text;
  booking_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select a.* into selected_slot
  from public.resource_availability a
  where a.id = p_slot_id
    and a.resource_id = p_resource_id
  for update;

  if selected_slot.id is null then
    raise exception 'SLOT_NOT_FOUND';
  end if;

  if selected_slot.status::text <> 'available' then
    raise exception 'SLOT_NOT_AVAILABLE';
  end if;

  if selected_slot.start_time <= now() then
    raise exception 'SLOT_IN_PAST';
  end if;

  select r.status::text into resource_status
  from public.resources r
  where r.id = p_resource_id;

  if resource_status is null then
    raise exception 'RESOURCE_NOT_FOUND';
  end if;

  if resource_status <> 'available' then
    raise exception 'RESOURCE_NOT_AVAILABLE';
  end if;

  insert into public.bookings (
    resource_id,
    user_id,
    availability_id,
    start_time,
    end_time,
    status
  ) values (
    p_resource_id,
    auth.uid(),
    selected_slot.id,
    selected_slot.start_time,
    selected_slot.end_time,
    'confirmed'
  ) returning id into booking_id;

  update public.resource_availability
  set status = 'booked'
  where id = selected_slot.id;

  perform public.refresh_resource_next_available(p_resource_id);

  return booking_id;
exception
  when exclusion_violation or unique_violation then
    raise exception 'SLOT_NOT_AVAILABLE';
end;
$$;

create or replace function public.cancel_booking_and_release_slot(
  p_booking_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.bookings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into target
  from public.bookings
  where id = p_booking_id
    and user_id = auth.uid()
  for update;

  if target.id is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if target.status::text <> 'confirmed' then
    raise exception 'BOOKING_NOT_CONFIRMED';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancelled_by = 'mentee',
      cancellation_reason = null,
      cancelled_at = now()
  where id = target.id;

  if target.availability_id is not null and target.start_time > now() then
    update public.resource_availability
    set status = 'available'
    where id = target.availability_id;
  end if;

  perform public.refresh_resource_next_available(target.resource_id);
  return true;
end;
$$;

-- =========================================================
-- 7. MENTOR WEEKLY SCHEDULE GENERATOR
-- =========================================================

create or replace function public.mentor_generate_availability(
  p_resource_id uuid,
  p_days_of_week smallint[],
  p_start_time time,
  p_end_time time,
  p_session_duration_minutes integer default 60,
  p_break_minutes integer default 30,
  p_weeks_ahead integer default 4,
  p_timezone text default 'Africa/Lagos',
  p_replace_existing boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_current_user_mentor() then
    raise exception 'MENTOR_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.resources r
    where r.id = p_resource_id
      and r.owner_id = auth.uid()
      and lower(replace(r.type::text, ' ', '_')) in ('mentor', 'mentor_resource')
  ) then
    raise exception 'RESOURCE_NOT_OWNED';
  end if;

  if p_start_time >= p_end_time then
    raise exception 'INVALID_TIME_WINDOW';
  end if;

  if p_session_duration_minutes < 15 or p_session_duration_minutes > 240 then
    raise exception 'INVALID_SESSION_DURATION';
  end if;

  if p_weeks_ahead < 1 or p_weeks_ahead > 12 then
    raise exception 'INVALID_WEEKS_AHEAD';
  end if;

  if p_days_of_week is null or cardinality(p_days_of_week) = 0 then
    raise exception 'SELECT_AT_LEAST_ONE_DAY';
  end if;

  insert into public.mentor_availability_preferences (
    mentor_id,
    resource_id,
    days_of_week,
    start_time,
    end_time,
    session_duration_minutes,
    break_minutes,
    weeks_ahead,
    timezone,
    updated_at
  ) values (
    auth.uid(),
    p_resource_id,
    p_days_of_week,
    p_start_time,
    p_end_time,
    p_session_duration_minutes,
    p_break_minutes,
    p_weeks_ahead,
    p_timezone,
    now()
  )
  on conflict (resource_id) do update set
    days_of_week = excluded.days_of_week,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    session_duration_minutes = excluded.session_duration_minutes,
    break_minutes = excluded.break_minutes,
    weeks_ahead = excluded.weeks_ahead,
    timezone = excluded.timezone,
    updated_at = now();

  if p_replace_existing then
    delete from public.resource_availability a
    where a.resource_id = p_resource_id
      and a.start_time > now()
      and a.status = 'available'
      and not exists (
        select 1
        from public.bookings b
        where b.availability_id = a.id
          and b.status = 'confirmed'
      );
  end if;

  insert into public.resource_availability (
    resource_id,
    start_time,
    end_time,
    status
  )
  select
    p_resource_id,
    slot_start at time zone p_timezone,
    (slot_start + make_interval(mins => p_session_duration_minutes)) at time zone p_timezone,
    'available'
  from generate_series(
    current_date,
    current_date + ((p_weeks_ahead * 7) - 1),
    interval '1 day'
  ) d(day)
  cross join lateral generate_series(
    d.day::date + p_start_time,
    d.day::date + p_end_time - make_interval(mins => p_session_duration_minutes),
    make_interval(mins => p_session_duration_minutes + p_break_minutes)
  ) slot_start
  where extract(isodow from d.day)::smallint = any(p_days_of_week)
    and (slot_start at time zone p_timezone) > now()
    and not exists (
      select 1
      from public.resource_availability a
      where a.resource_id = p_resource_id
        and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(
          slot_start at time zone p_timezone,
          (slot_start + make_interval(mins => p_session_duration_minutes)) at time zone p_timezone,
          '[)'
        )
    );

  get diagnostics inserted_count = row_count;

  update public.resources
  set duration_minutes = p_session_duration_minutes,
      timezone = p_timezone
  where id = p_resource_id;

  perform public.refresh_resource_next_available(p_resource_id);

  return inserted_count;
end;
$$;

-- =========================================================
-- 8. MENTOR CANCELLATION
-- Mentor cancellation does NOT reopen the slot automatically.
-- =========================================================

create or replace function public.mentor_cancel_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.bookings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_current_user_mentor() then
    raise exception 'MENTOR_REQUIRED';
  end if;

  select b.*
  into target
  from public.bookings b
  join public.resources r on r.id = b.resource_id
  where b.id = p_booking_id
    and r.owner_id = auth.uid()
  for update of b;

  if target.id is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if target.status <> 'confirmed' then
    raise exception 'BOOKING_NOT_CONFIRMED';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancelled_by = 'mentor',
      cancellation_reason = nullif(trim(p_reason), ''),
      cancelled_at = now()
  where id = target.id;

  if target.availability_id is not null and target.start_time > now() then
    update public.resource_availability
    set status = 'unavailable'
    where id = target.availability_id;
  end if;

  perform public.refresh_resource_next_available(target.resource_id);
  return true;
end;
$$;

grant execute on function public.is_current_user_mentor() to authenticated;
grant execute on function public.current_user_owns_resource(uuid) to authenticated;
grant execute on function public.create_booking_from_slot(uuid, uuid) to authenticated;
grant execute on function public.cancel_booking_and_release_slot(uuid) to authenticated;
grant execute on function public.mentor_generate_availability(uuid, smallint[], time, time, integer, integer, integer, text, boolean) to authenticated;
grant execute on function public.mentor_cancel_booking(uuid, text) to authenticated;
