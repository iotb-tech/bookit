-- =========================================================
-- BOOKIT WORKFLOW, NOTIFICATIONS, SETTINGS & SCHEDULING
-- Migration date: 2026-09-02
-- Apply AFTER 20260902_study_groups.sql on an existing DB.
-- Safe to rerun: tables/columns/functions are guarded or replaced.
-- =========================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------
-- 0. ENUM COMPATIBILITY PREFLIGHT
-- ---------------------------------------------------------
-- Existing BookIt databases may use the enum public.booking_status.
-- Run 20260902_00_add_pending_booking_status.sql as a SEPARATE query
-- before this migration so PostgreSQL can commit the new enum value.
do $$
declare
  status_type_oid oid;
  status_is_enum boolean := false;
begin
  select a.atttypid
  into status_type_oid
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'bookings'
    and a.attname = 'status'
    and a.attnum > 0
    and not a.attisdropped;

  if status_type_oid is not null then
    select (t.typtype = 'e')
    into status_is_enum
    from pg_type t
    where t.oid = status_type_oid;

    if status_is_enum
       and not exists (
         select 1
         from pg_enum e
         where e.enumtypid = status_type_oid
           and e.enumlabel = 'pending'
       ) then
      raise exception
        'BOOKING_STATUS_PENDING_REQUIRED: run 20260902_00_add_pending_booking_status.sql first, wait for Success, then rerun this migration.';
    end if;
  end if;
end $$;



-- ---------------------------------------------------------
-- 0B. STUDY-GROUP SESSION COLUMN COMPATIBILITY
-- ---------------------------------------------------------
-- BOOKIT(7) may already have study_group_sessions from the earlier
-- study-group migration, but without the newer cancellation audit columns.
-- Add them before the rest of this workflow migration so both the app and
-- later SQL functions can safely reference them.
alter table public.study_group_sessions
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancelled_at timestamptz;

-- ---------------------------------------------------------
-- 1. ONE-TO-ONE BOOKING APPROVAL WORKFLOW
-- ---------------------------------------------------------

alter table public.bookings
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references auth.users(id) on delete set null;

-- Remove the old generated status check if present, then allow pending.
alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled'));

alter table public.bookings
  alter column status set default 'pending';

-- Pending and confirmed both reserve a slot and must be treated as active.
drop index if exists public.bookings_one_confirmed_per_availability_idx;
drop index if exists public.bookings_one_active_per_availability_idx;

create unique index if not exists bookings_one_active_per_availability_idx
on public.bookings(availability_id)
where availability_id is not null
  and status in ('pending', 'confirmed');

alter table public.bookings
  drop constraint if exists bookings_no_confirmed_overlap;

alter table public.bookings
  drop constraint if exists bookings_no_active_overlap;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_no_active_overlap'
  ) then
    alter table public.bookings
      add constraint bookings_no_active_overlap
      exclude using gist (
        resource_id with =,
        tstzrange(start_time, end_time, '[)') with &&
      )
      where (status in ('pending', 'confirmed'));
  end if;
end $$;

-- Existing confirmed bookings remain confirmed; fill audit metadata where possible.
update public.bookings
set confirmed_at = coalesce(confirmed_at, created_at)
where status = 'confirmed';

-- ---------------------------------------------------------
-- 2. USER SETTINGS
-- ---------------------------------------------------------

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  booking_updates boolean not null default true,
  study_group_updates boolean not null default true,
  reminder_enabled boolean not null default true,
  reminder_hours integer not null default 24
    check (reminder_hours between 1 and 168),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users can view own preferences"
on public.user_preferences;
create policy "Users can view own preferences"
on public.user_preferences
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own preferences"
on public.user_preferences;
create policy "Users can insert own preferences"
on public.user_preferences
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own preferences"
on public.user_preferences;
create policy "Users can update own preferences"
on public.user_preferences
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ---------------------------------------------------------
-- 3. NOTIFICATIONS + SCHEDULED REMINDERS
-- ---------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_due_idx
on public.notifications(user_id, scheduled_for desc);

create index if not exists notifications_user_unread_idx
on public.notifications(user_id, read_at)
where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications"
on public.notifications;
create policy "Users can view own notifications"
on public.notifications
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update own notifications"
on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Internal helper. It is deliberately not granted to authenticated users.
create or replace function public.bookit_create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_href text default null,
  p_scheduled_for timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allow_booking boolean := true;
  allow_study_group boolean := true;
  allow_reminder boolean := true;
begin
  if p_user_id is null then
    return;
  end if;

  select
    coalesce(up.booking_updates, true),
    coalesce(up.study_group_updates, true),
    coalesce(up.reminder_enabled, true)
  into allow_booking, allow_study_group, allow_reminder
  from public.user_preferences up
  where up.user_id = p_user_id;

  if not found then
    allow_booking := true;
    allow_study_group := true;
    allow_reminder := true;
  end if;

  if p_type like 'booking_%' or p_type like 'reschedule_%' then
    if p_type like '%reminder%' then
      if not allow_reminder then return; end if;
    elsif not allow_booking then
      return;
    end if;
  end if;

  if p_type like 'study_group_%' or p_type like 'waitlist_%' then
    if p_type like '%reminder%' then
      if not allow_reminder then return; end if;
    elsif not allow_study_group then
      return;
    end if;
  end if;

  insert into public.notifications(
    user_id, type, title, body, href, scheduled_for, metadata
  )
  values(
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_href,
    coalesce(p_scheduled_for, now()),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.bookit_create_notification(
  uuid, text, text, text, text, timestamptz, jsonb
) from public, anon, authenticated;

create or replace function public.bookit_reminder_time(
  p_user_id uuid,
  p_start_time timestamptz
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  hours_before integer := 24;
  enabled boolean := true;
begin
  select
    coalesce(up.reminder_hours, 24),
    coalesce(up.reminder_enabled, true)
  into hours_before, enabled
  from public.user_preferences up
  where up.user_id = p_user_id;

  if not found then
    hours_before := 24;
    enabled := true;
  end if;

  if not enabled then
    return null;
  end if;

  return greatest(
    now(),
    p_start_time - make_interval(hours => hours_before)
  );
end;
$$;

revoke all on function public.bookit_reminder_time(uuid, timestamptz)
from public, anon, authenticated;

-- ---------------------------------------------------------
-- 4. BOOKING NOTIFICATION TRIGGER
-- ---------------------------------------------------------

create or replace function public.bookit_booking_notification_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resource_name text;
  mentor_id uuid;
  reminder_time timestamptz;
  cancellation_text text;
begin
  select r.name, r.owner_id
  into resource_name, mentor_id
  from public.resources r
  where r.id = new.resource_id;

  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.bookit_create_notification(
      mentor_id,
      'booking_request',
      'New booking request',
      'A mentee requested a session with you for ' ||
        to_char(new.start_time at time zone 'Africa/Lagos', 'Dy, Mon DD · HH12:MI AM') || '.',
      '/mentor/sessions',
      now(),
      jsonb_build_object('booking_id', new.id)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'confirmed' then
      perform public.bookit_create_notification(
        new.user_id,
        'booking_confirmed',
        'Session confirmed',
        'Your session with ' || coalesce(resource_name, 'your mentor') ||
          ' has been confirmed for ' ||
          to_char(new.start_time at time zone 'Africa/Lagos', 'Dy, Mon DD · HH12:MI AM') || '.',
        '/my-bookings',
        now(),
        jsonb_build_object('booking_id', new.id)
      );

      reminder_time := public.bookit_reminder_time(new.user_id, new.start_time);
      if reminder_time is not null then
        perform public.bookit_create_notification(
          new.user_id,
          'booking_reminder',
          'Upcoming mentorship session',
          'Your session with ' || coalesce(resource_name, 'your mentor') ||
            ' starts at ' ||
            to_char(new.start_time at time zone 'Africa/Lagos', 'Dy, Mon DD · HH12:MI AM') || '.',
          '/my-bookings',
          reminder_time,
          jsonb_build_object('booking_id', new.id)
        );
      end if;

    elsif new.status = 'cancelled' then
      cancellation_text :=
        case
          when coalesce(new.cancellation_reason, '') <> ''
            then ' Reason: ' || new.cancellation_reason
          else ''
        end;

      if new.cancelled_by = 'mentor' then
        perform public.bookit_create_notification(
          new.user_id,
          'booking_cancelled',
          'Session cancelled by mentor',
          'Your session with ' || coalesce(resource_name, 'your mentor') ||
            ' was cancelled.' || cancellation_text,
          '/messages',
          now(),
          jsonb_build_object('booking_id', new.id)
        );
      else
        perform public.bookit_create_notification(
          mentor_id,
          'booking_cancelled',
          'Mentee cancelled a session',
          'A mentee cancelled the ' ||
            to_char(new.start_time at time zone 'Africa/Lagos', 'Dy, Mon DD · HH12:MI AM') ||
            ' session.' || cancellation_text,
          '/mentor/messages',
          now(),
          jsonb_build_object('booking_id', new.id)
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookit_booking_notification
on public.bookings;

create trigger bookit_booking_notification
after insert or update of status on public.bookings
for each row
execute function public.bookit_booking_notification_trigger();

-- ---------------------------------------------------------
-- 5. MANUAL MENTOR CONFIRM / CANCEL
-- ---------------------------------------------------------

create or replace function public.mentor_confirm_booking(p_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.bookings%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;

  select b.*
  into target
  from public.bookings b
  join public.resources r on r.id = b.resource_id
  where b.id = p_booking_id
    and r.owner_id = auth.uid()
  for update of b;

  if target.id is null then raise exception 'BOOKING_NOT_FOUND'; end if;
  if target.status <> 'pending' then raise exception 'BOOKING_NOT_PENDING'; end if;
  if target.start_time <= now() then raise exception 'BOOKING_IN_PAST'; end if;

  update public.bookings
  set
    status = 'confirmed',
    confirmed_at = now(),
    confirmed_by = auth.uid()
  where id = target.id;

  return true;
end;
$$;

grant execute on function public.mentor_confirm_booking(uuid)
to authenticated;

-- Make mentor cancellation work for pending OR confirmed bookings and require a reason.
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
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'CANCELLATION_REASON_REQUIRED';
  end if;

  select b.*
  into target
  from public.bookings b
  join public.resources r on r.id = b.resource_id
  where b.id = p_booking_id
    and r.owner_id = auth.uid()
  for update of b;

  if target.id is null then raise exception 'BOOKING_NOT_FOUND'; end if;
  if target.status not in ('pending', 'confirmed') then
    raise exception 'BOOKING_NOT_ACTIVE';
  end if;

  update public.bookings
  set
    status = 'cancelled',
    cancelled_by = 'mentor',
    cancellation_reason = trim(p_reason),
    cancelled_at = now()
  where id = target.id;

  if target.availability_id is not null
     and target.start_time > now() then
    update public.resource_availability
    set status = 'unavailable'
    where id = target.availability_id;
  end if;

  perform public.refresh_resource_next_available(target.resource_id);
  return true;
end;
$$;

grant execute on function public.mentor_cancel_booking(uuid, text)
to authenticated;

-- Mentee cancellation supports pending and confirmed.
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
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target
  from public.bookings
  where id = p_booking_id
    and user_id = auth.uid()
  for update;

  if target.id is null then raise exception 'BOOKING_NOT_FOUND'; end if;
  if target.status not in ('pending', 'confirmed') then
    raise exception 'BOOKING_NOT_ACTIVE';
  end if;

  update public.bookings
  set
    status = 'cancelled',
    cancelled_by = 'mentee',
    cancelled_at = now()
  where id = target.id;

  if target.availability_id is not null
     and target.start_time > now() then
    update public.resource_availability
    set status = 'available'
    where id = target.availability_id;
  end if;

  perform public.refresh_resource_next_available(target.resource_id);
  return true;
end;
$$;

grant execute on function public.cancel_booking_and_release_slot(uuid)
to authenticated;

-- ---------------------------------------------------------
-- 6. CREATE BOOKING AS PENDING + OWNER CONFLICT PROTECTION
-- ---------------------------------------------------------

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
  slot public.resource_availability%rowtype;
  booking_id uuid;
  target_type text;
  mentor_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select
    lower(replace(r.type::text, ' ', '_')),
    r.owner_id
  into target_type, mentor_id
  from public.resources r
  where r.id = p_resource_id;

  if target_type = 'study_group' then
    raise exception 'STUDY_GROUP_USE_MEMBERSHIP';
  end if;

  select * into slot
  from public.resource_availability
  where id = p_slot_id
    and resource_id = p_resource_id
  for update;

  if slot.id is null then raise exception 'SLOT_NOT_FOUND'; end if;
  if slot.status <> 'available' then raise exception 'SLOT_NOT_AVAILABLE'; end if;
  if slot.start_time <= now() then raise exception 'SLOT_IN_PAST'; end if;

  if not exists (
    select 1
    from public.resources
    where id = p_resource_id
      and status = 'available'
      and archived_at is null
  ) then
    raise exception 'RESOURCE_NOT_AVAILABLE';
  end if;

  -- Do not allow a 1-to-1 request that conflicts with one of the mentor's
  -- scheduled study-group sessions.
  if exists (
    select 1
    from public.study_group_sessions s
    join public.resources r on r.id = s.resource_id
    where r.owner_id = mentor_id
      and s.status = 'scheduled'
      and s.start_time < slot.end_time
      and s.end_time > slot.start_time
  ) then
    raise exception 'MENTOR_GROUP_SESSION_CONFLICT';
  end if;

  insert into public.bookings(
    resource_id,
    user_id,
    availability_id,
    start_time,
    end_time,
    status
  )
  values(
    p_resource_id,
    auth.uid(),
    slot.id,
    slot.start_time,
    slot.end_time,
    'pending'
  )
  returning id into booking_id;

  update public.resource_availability
  set status = 'booked'
  where id = slot.id;

  perform public.refresh_resource_next_available(p_resource_id);
  return booking_id;
end;
$$;

grant execute on function public.create_booking_from_slot(uuid, uuid)
to authenticated;

-- ---------------------------------------------------------
-- 7. BULK CLEAR OPEN AVAILABILITY
-- ---------------------------------------------------------

create or replace function public.mentor_clear_open_availability(
  p_resource_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_count integer := 0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;
  if not public.current_user_owns_resource(p_resource_id) then
    raise exception 'RESOURCE_NOT_OWNED';
  end if;

  delete from public.resource_availability
  where resource_id = p_resource_id
    and start_time > now()
    and status in ('available', 'unavailable');

  get diagnostics removed_count = row_count;
  perform public.refresh_resource_next_available(p_resource_id);
  return removed_count;
end;
$$;

grant execute on function public.mentor_clear_open_availability(uuid)
to authenticated;

-- ---------------------------------------------------------
-- 8. RESCHEDULE REQUESTS
-- ---------------------------------------------------------

create table if not exists public.booking_reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  proposed_slot_id uuid not null references public.resource_availability(id) on delete cascade,
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  response_reason text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists one_pending_reschedule_per_booking
on public.booking_reschedule_requests(booking_id)
where status = 'pending';

alter table public.booking_reschedule_requests enable row level security;

drop policy if exists "Users and resource owners can view reschedule requests"
on public.booking_reschedule_requests;
create policy "Users and resource owners can view reschedule requests"
on public.booking_reschedule_requests
for select to authenticated
using (
  requested_by = auth.uid()
  or exists (
    select 1
    from public.bookings b
    join public.resources r on r.id = b.resource_id
    where b.id = booking_reschedule_requests.booking_id
      and r.owner_id = auth.uid()
  )
);

create or replace function public.request_booking_reschedule(
  p_booking_id uuid,
  p_proposed_slot_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.bookings%rowtype;
  proposed public.resource_availability%rowtype;
  request_id uuid;
  old_request public.booking_reschedule_requests%rowtype;
  mentor_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select *
  into target
  from public.bookings
  where id = p_booking_id
    and user_id = auth.uid()
  for update;

  if target.id is null then raise exception 'BOOKING_NOT_FOUND'; end if;
  if target.status not in ('pending', 'confirmed') then
    raise exception 'BOOKING_NOT_ACTIVE';
  end if;
  if target.start_time <= now() then
    raise exception 'BOOKING_IN_PAST';
  end if;

  select *
  into proposed
  from public.resource_availability
  where id = p_proposed_slot_id
    and resource_id = target.resource_id
  for update;

  if proposed.id is null then raise exception 'SLOT_NOT_FOUND'; end if;
  if proposed.status <> 'available' then raise exception 'SLOT_NOT_AVAILABLE'; end if;
  if proposed.start_time <= now() then raise exception 'SLOT_IN_PAST'; end if;
  if proposed.id = target.availability_id then raise exception 'SAME_SLOT'; end if;

  -- Release a previous pending proposed slot before replacing the request.
  select *
  into old_request
  from public.booking_reschedule_requests
  where booking_id = target.id
    and status = 'pending'
  for update;

  if old_request.id is not null then
    update public.resource_availability
    set status = 'available'
    where id = old_request.proposed_slot_id
      and status = 'booked';

    update public.booking_reschedule_requests
    set
      status = 'cancelled',
      responded_at = now()
    where id = old_request.id;
  end if;

  update public.resource_availability
  set status = 'booked'
  where id = proposed.id;

  insert into public.booking_reschedule_requests(
    booking_id, requested_by, proposed_slot_id, reason
  )
  values(
    target.id, auth.uid(), proposed.id, nullif(trim(coalesce(p_reason, '')), '')
  )
  returning id into request_id;

  select owner_id into mentor_id
  from public.resources
  where id = target.resource_id;

  perform public.bookit_create_notification(
    mentor_id,
    'reschedule_request',
    'Reschedule request',
    'A mentee requested to move a session to ' ||
      to_char(proposed.start_time at time zone 'Africa/Lagos', 'Dy, Mon DD · HH12:MI AM') || '.',
    '/mentor/sessions',
    now(),
    jsonb_build_object('booking_id', target.id, 'request_id', request_id)
  );

  return request_id;
end;
$$;

grant execute on function public.request_booking_reschedule(uuid, uuid, text)
to authenticated;

create or replace function public.mentor_respond_reschedule(
  p_request_id uuid,
  p_approve boolean,
  p_response_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.booking_reschedule_requests%rowtype;
  target public.bookings%rowtype;
  proposed public.resource_availability%rowtype;
  resource_name text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;

  select rr.*
  into req
  from public.booking_reschedule_requests rr
  join public.bookings b on b.id = rr.booking_id
  join public.resources r on r.id = b.resource_id
  where rr.id = p_request_id
    and rr.status = 'pending'
    and r.owner_id = auth.uid()
  for update of rr;

  if req.id is null then raise exception 'RESCHEDULE_REQUEST_NOT_FOUND'; end if;

  select *
  into target
  from public.bookings
  where id = req.booking_id
  for update;

  select *
  into proposed
  from public.resource_availability
  where id = req.proposed_slot_id
  for update;

  if target.status not in ('pending', 'confirmed') then
    raise exception 'BOOKING_NOT_ACTIVE';
  end if;

  select name into resource_name
  from public.resources
  where id = target.resource_id;

  if p_approve then
    if proposed.id is null or proposed.status <> 'booked' then
      raise exception 'PROPOSED_SLOT_NOT_RESERVED';
    end if;

    if exists (
      select 1
      from public.study_group_sessions s
      join public.resources r on r.id = s.resource_id
      where r.owner_id = auth.uid()
        and s.status = 'scheduled'
        and s.start_time < proposed.end_time
        and s.end_time > proposed.start_time
    ) then
      raise exception 'MENTOR_GROUP_SESSION_CONFLICT';
    end if;

    if target.availability_id is not null
       and target.start_time > now() then
      update public.resource_availability
      set status = 'available'
      where id = target.availability_id;
    end if;

    update public.bookings
    set
      availability_id = proposed.id,
      start_time = proposed.start_time,
      end_time = proposed.end_time
    where id = target.id;

    update public.booking_reschedule_requests
    set
      status = 'approved',
      response_reason = nullif(trim(coalesce(p_response_reason, '')), ''),
      responded_at = now()
    where id = req.id;

    perform public.bookit_create_notification(
      target.user_id,
      'reschedule_approved',
      'Reschedule approved',
      'Your session with ' || coalesce(resource_name, 'your mentor') ||
        ' was moved to ' ||
        to_char(proposed.start_time at time zone 'Africa/Lagos', 'Dy, Mon DD · HH12:MI AM') || '.',
      '/my-bookings',
      now(),
      jsonb_build_object('booking_id', target.id)
    );
  else
    update public.resource_availability
    set status = 'available'
    where id = req.proposed_slot_id
      and status = 'booked';

    update public.booking_reschedule_requests
    set
      status = 'rejected',
      response_reason = nullif(trim(coalesce(p_response_reason, '')), ''),
      responded_at = now()
    where id = req.id;

    perform public.bookit_create_notification(
      target.user_id,
      'reschedule_rejected',
      'Reschedule request declined',
      'Your current booking time remains unchanged.' ||
        case
          when nullif(trim(coalesce(p_response_reason, '')), '') is not null
            then ' Reason: ' || trim(p_response_reason)
          else ''
        end,
      '/my-bookings',
      now(),
      jsonb_build_object('booking_id', target.id)
    );
  end if;

  perform public.refresh_resource_next_available(target.resource_id);
  return true;
end;
$$;

grant execute on function public.mentor_respond_reschedule(uuid, boolean, text)
to authenticated;

-- ---------------------------------------------------------
-- 9. STUDY-GROUP REGULAR WEEKLY SCHEDULE
-- ---------------------------------------------------------

create table if not exists public.study_group_schedule_preferences (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Africa/Lagos',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique(resource_id, weekday, start_time, end_time)
);

alter table public.study_group_schedule_preferences enable row level security;

drop policy if exists "Authenticated users can view study group schedules"
on public.study_group_schedule_preferences;
create policy "Authenticated users can view study group schedules"
on public.study_group_schedule_preferences
for select to authenticated
using (true);

drop policy if exists "Owners can manage study group schedules"
on public.study_group_schedule_preferences;
create policy "Owners can manage study group schedules"
on public.study_group_schedule_preferences
for all to authenticated
using (public.current_user_owns_resource(resource_id))
with check (public.current_user_owns_resource(resource_id));

-- Central conflict checker used by manual and generated group sessions.
create or replace function public.mentor_has_schedule_conflict(
  p_mentor_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_group_session uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.bookings b
      join public.resources r on r.id = b.resource_id
      where r.owner_id = p_mentor_id
        and b.status in ('pending', 'confirmed')
        and b.start_time < p_end
        and b.end_time > p_start
    )
    or exists (
      select 1
      from public.study_group_sessions s
      join public.resources r on r.id = s.resource_id
      where r.owner_id = p_mentor_id
        and s.status = 'scheduled'
        and (p_exclude_group_session is null or s.id <> p_exclude_group_session)
        and s.start_time < p_end
        and s.end_time > p_start
    );
$$;

revoke all on function public.mentor_has_schedule_conflict(
  uuid, timestamptz, timestamptz, uuid
) from public, anon, authenticated;

create or replace function public.mentor_create_study_group_session(
  p_resource_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_meeting_link text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.resources%rowtype;
  session_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;
  if p_end <= p_start then raise exception 'INVALID_TIME_RANGE'; end if;
  if p_start <= now() then raise exception 'SESSION_IN_PAST'; end if;

  select *
  into target
  from public.resources
  where id = p_resource_id
    and owner_id = auth.uid()
    and lower(replace(type::text, ' ', '_')) = 'study_group';

  if target.id is null then raise exception 'RESOURCE_NOT_OWNED'; end if;
  if target.archived_at is not null then raise exception 'STUDY_GROUP_ARCHIVED'; end if;

  if public.mentor_has_schedule_conflict(
    auth.uid(), p_start, p_end, null
  ) then
    raise exception 'MENTOR_SCHEDULE_CONFLICT';
  end if;

  insert into public.study_group_sessions(
    resource_id,
    start_time,
    end_time,
    meeting_link,
    status,
    created_by
  )
  values(
    p_resource_id,
    p_start,
    p_end,
    coalesce(nullif(trim(p_meeting_link), ''), target.meeting_link),
    'scheduled',
    auth.uid()
  )
  returning id into session_id;

  return session_id;
end;
$$;

grant execute on function public.mentor_create_study_group_session(
  uuid, timestamptz, timestamptz, text
) to authenticated;

create or replace function public.mentor_generate_study_group_sessions(
  p_resource_id uuid,
  p_weeks_ahead integer default 4
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.resources%rowtype;
  pref public.study_group_schedule_preferences%rowtype;
  day_cursor date;
  range_end date;
  start_ts timestamptz;
  end_ts timestamptz;
  created_count integer := 0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;
  if p_weeks_ahead < 1 or p_weeks_ahead > 12 then
    raise exception 'INVALID_WEEKS_AHEAD';
  end if;

  select *
  into target
  from public.resources
  where id = p_resource_id
    and owner_id = auth.uid()
    and lower(replace(type::text, ' ', '_')) = 'study_group';

  if target.id is null then raise exception 'RESOURCE_NOT_OWNED'; end if;
  if target.archived_at is not null then raise exception 'STUDY_GROUP_ARCHIVED'; end if;

  day_cursor := current_date;
  range_end := current_date + (p_weeks_ahead * 7);

  while day_cursor <= range_end loop
    for pref in
      select *
      from public.study_group_schedule_preferences
      where resource_id = p_resource_id
        and active = true
        and weekday = extract(isodow from day_cursor)::smallint
      order by start_time
    loop
      start_ts := (day_cursor + pref.start_time) at time zone pref.timezone;
      end_ts := (day_cursor + pref.end_time) at time zone pref.timezone;

      if start_ts > now()
         and not public.mentor_has_schedule_conflict(
           auth.uid(), start_ts, end_ts, null
         )
         and not exists (
           select 1
           from public.study_group_sessions s
           where s.resource_id = p_resource_id
             and s.status = 'scheduled'
             and s.start_time = start_ts
             and s.end_time = end_ts
         ) then
        insert into public.study_group_sessions(
          resource_id,
          start_time,
          end_time,
          meeting_link,
          status,
          created_by
        )
        values(
          p_resource_id,
          start_ts,
          end_ts,
          target.meeting_link,
          'scheduled',
          auth.uid()
        );

        created_count := created_count + 1;
      end if;
    end loop;

    day_cursor := day_cursor + 1;
  end loop;

  return created_count;
end;
$$;

grant execute on function public.mentor_generate_study_group_sessions(uuid, integer)
to authenticated;

-- ---------------------------------------------------------
-- 10. GROUP SESSION CANCELLATION REASON + NOTIFICATIONS
-- ---------------------------------------------------------

alter table public.study_group_sessions
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancelled_at timestamptz;

create or replace function public.mentor_cancel_study_group_session(
  p_session_id uuid,
  p_resource_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;
  if not public.current_user_owns_resource(p_resource_id) then
    raise exception 'RESOURCE_NOT_OWNED';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'CANCELLATION_REASON_REQUIRED';
  end if;

  update public.study_group_sessions
  set
    status = 'cancelled',
    cancellation_reason = trim(p_reason),
    cancelled_by = auth.uid(),
    cancelled_at = now(),
    updated_at = now()
  where id = p_session_id
    and resource_id = p_resource_id
    and status = 'scheduled';

  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  return true;
end;
$$;

grant execute on function public.mentor_cancel_study_group_session(
  uuid, uuid, text
) to authenticated;

create or replace function public.bookit_group_session_notification_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  group_name text;
  member_row record;
  reminder_time timestamptz;
  body_text text;
begin
  select name into group_name
  from public.resources
  where id = new.resource_id;

  if tg_op = 'INSERT' and new.status = 'scheduled' then
    for member_row in
      select user_id
      from public.study_group_members
      where resource_id = new.resource_id
        and status = 'active'
    loop
      perform public.bookit_create_notification(
        member_row.user_id,
        'study_group_session',
        'New ' || coalesce(group_name, 'study group') || ' session',
        'A group session is scheduled for ' ||
          to_char(new.start_time at time zone 'Africa/Lagos', 'Dy, Mon DD · HH12:MI AM') || '.',
        '/my-study-groups',
        now(),
        jsonb_build_object('resource_id', new.resource_id, 'session_id', new.id)
      );

      reminder_time := public.bookit_reminder_time(
        member_row.user_id, new.start_time
      );

      if reminder_time is not null then
        perform public.bookit_create_notification(
          member_row.user_id,
          'study_group_reminder',
          'Upcoming ' || coalesce(group_name, 'study group') || ' session',
          'Your group session starts at ' ||
            to_char(new.start_time at time zone 'Africa/Lagos', 'Dy, Mon DD · HH12:MI AM') || '.',
          '/my-study-groups',
          reminder_time,
          jsonb_build_object('resource_id', new.resource_id, 'session_id', new.id)
        );
      end if;
    end loop;
  elsif tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status = 'cancelled' then

    body_text := 'The ' || coalesce(group_name, 'study group') ||
      ' session for ' ||
      to_char(new.start_time at time zone 'Africa/Lagos', 'Dy, Mon DD · HH12:MI AM') ||
      ' was cancelled.' ||
      case
        when nullif(trim(coalesce(new.cancellation_reason, '')), '') is not null
          then ' Reason: ' || new.cancellation_reason
        else ''
      end;

    for member_row in
      select user_id
      from public.study_group_members
      where resource_id = new.resource_id
        and status = 'active'
    loop
      perform public.bookit_create_notification(
        member_row.user_id,
        'study_group_cancelled',
        'Study group session cancelled',
        body_text,
        '/messages',
        now(),
        jsonb_build_object('resource_id', new.resource_id, 'session_id', new.id)
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists bookit_group_session_notification
on public.study_group_sessions;

create trigger bookit_group_session_notification
after insert or update of status on public.study_group_sessions
for each row
execute function public.bookit_group_session_notification_trigger();

-- ---------------------------------------------------------
-- 11. ATTENDANCE
-- ---------------------------------------------------------

create table if not exists public.study_group_attendance (
  session_id uuid not null references public.study_group_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'excused')),
  marked_by uuid not null references auth.users(id) on delete cascade,
  marked_at timestamptz not null default now(),
  primary key(session_id, user_id)
);

alter table public.study_group_attendance enable row level security;

drop policy if exists "Mentors and users can view relevant attendance"
on public.study_group_attendance;
create policy "Mentors and users can view relevant attendance"
on public.study_group_attendance
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.study_group_sessions s
    join public.resources r on r.id = s.resource_id
    where s.id = study_group_attendance.session_id
      and r.owner_id = auth.uid()
  )
);

create or replace function public.mentor_mark_study_group_attendance(
  p_resource_id uuid,
  p_session_id uuid,
  p_user_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  session_start timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;
  if not public.current_user_owns_resource(p_resource_id) then
    raise exception 'RESOURCE_NOT_OWNED';
  end if;
  if p_status not in ('present', 'absent', 'excused') then
    raise exception 'INVALID_ATTENDANCE_STATUS';
  end if;

  select start_time into session_start
  from public.study_group_sessions
  where id = p_session_id
    and resource_id = p_resource_id
    and status <> 'cancelled';

  if session_start is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if session_start > now() then raise exception 'SESSION_NOT_STARTED'; end if;

  if not exists (
    select 1
    from public.study_group_members
    where resource_id = p_resource_id
      and user_id = p_user_id
      and status = 'active'
  ) then
    raise exception 'ACTIVE_MEMBERSHIP_NOT_FOUND';
  end if;

  insert into public.study_group_attendance(
    session_id, user_id, status, marked_by, marked_at
  )
  values(
    p_session_id, p_user_id, p_status, auth.uid(), now()
  )
  on conflict(session_id, user_id)
  do update set
    status = excluded.status,
    marked_by = excluded.marked_by,
    marked_at = excluded.marked_at;

  return true;
end;
$$;

grant execute on function public.mentor_mark_study_group_attendance(
  uuid, uuid, uuid, text
) to authenticated;

-- ---------------------------------------------------------
-- 12. WAITLIST + AUTO-PROMOTION
-- ---------------------------------------------------------

create table if not exists public.study_group_waitlist (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'promoted', 'left', 'removed')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(resource_id, user_id)
);

alter table public.study_group_waitlist enable row level security;

drop policy if exists "Users can view own waitlist entries"
on public.study_group_waitlist;
create policy "Users can view own waitlist entries"
on public.study_group_waitlist
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_owns_resource(resource_id)
);

create or replace function public.promote_study_group_waitlist(
  p_resource_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.resources%rowtype;
  active_count bigint;
  next_user uuid;
begin
  select *
  into target
  from public.resources
  where id = p_resource_id
  for update;

  if target.id is null
     or target.archived_at is not null
     or target.status <> 'available' then
    return null;
  end if;

  select count(*) into active_count
  from public.study_group_members
  where resource_id = p_resource_id
    and status = 'active';

  if active_count >= target.capacity then
    return null;
  end if;

  select user_id
  into next_user
  from public.study_group_waitlist
  where resource_id = p_resource_id
    and status = 'waiting'
  order by joined_at asc
  limit 1
  for update skip locked;

  if next_user is null then
    return null;
  end if;

  insert into public.study_group_members(
    resource_id, user_id, role, status, joined_at, left_at,
    removed_at, updated_at
  )
  values(
    p_resource_id, next_user, 'member', 'active', now(),
    null, null, now()
  )
  on conflict(resource_id, user_id)
  do update set
    status = 'active',
    role = 'member',
    joined_at = now(),
    left_at = null,
    removed_at = null,
    updated_at = now();

  update public.study_group_waitlist
  set
    status = 'promoted',
    updated_at = now()
  where resource_id = p_resource_id
    and user_id = next_user;

  perform public.bookit_create_notification(
    next_user,
    'waitlist_promoted',
    'A study-group space opened',
    'You have been moved from the waitlist into ' ||
      coalesce(target.name, 'the study group') || '.',
    '/my-study-groups',
    now(),
    jsonb_build_object('resource_id', p_resource_id)
  );

  return next_user;
end;
$$;

revoke all on function public.promote_study_group_waitlist(uuid)
from public, anon, authenticated;

create or replace function public.join_study_group_waitlist(
  p_resource_id uuid
)
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

  select *
  into target
  from public.resources
  where id = p_resource_id
    and lower(replace(type::text, ' ', '_')) = 'study_group'
  for update;

  if target.id is null then raise exception 'STUDY_GROUP_NOT_FOUND'; end if;
  if target.archived_at is not null then raise exception 'STUDY_GROUP_ARCHIVED'; end if;
  if target.status <> 'available' then raise exception 'STUDY_GROUP_CLOSED'; end if;
  if target.owner_id = auth.uid() then raise exception 'GROUP_OWNER_IS_HOST'; end if;

  if exists (
    select 1 from public.study_group_members
    where resource_id = p_resource_id
      and user_id = auth.uid()
      and status = 'active'
  ) then
    raise exception 'ALREADY_GROUP_MEMBER';
  end if;

  select count(*) into active_count
  from public.study_group_members
  where resource_id = p_resource_id
    and status = 'active';

  if active_count < target.capacity then
    raise exception 'SPACE_AVAILABLE_JOIN_GROUP';
  end if;

  insert into public.study_group_waitlist(
    resource_id, user_id, status, joined_at, updated_at
  )
  values(
    p_resource_id, auth.uid(), 'waiting', now(), now()
  )
  on conflict(resource_id, user_id)
  do update set
    status = 'waiting',
    joined_at = now(),
    updated_at = now();

  return true;
end;
$$;

grant execute on function public.join_study_group_waitlist(uuid)
to authenticated;

create or replace function public.leave_study_group_waitlist(
  p_resource_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.study_group_waitlist
  set
    status = 'left',
    updated_at = now()
  where resource_id = p_resource_id
    and user_id = auth.uid()
    and status = 'waiting';

  if not found then raise exception 'WAITLIST_ENTRY_NOT_FOUND'; end if;
  return true;
end;
$$;

grant execute on function public.leave_study_group_waitlist(uuid)
to authenticated;

-- Replace summary to include waitlist information.
drop function if exists public.get_study_group_summary(uuid);

create function public.get_study_group_summary(p_resource_id uuid)
returns table (
  capacity integer,
  member_count bigint,
  membership_status text,
  can_join boolean,
  is_owner boolean,
  waitlist_count bigint,
  waitlist_status text
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
  waiting_count bigint;
  current_waitlist text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into target
  from public.resources r
  where r.id = p_resource_id
    and lower(replace(r.type::text, ' ', '_')) = 'study_group';

  if target.id is null then
    raise exception 'STUDY_GROUP_NOT_FOUND';
  end if;

  select count(*) into active_count
  from public.study_group_members
  where resource_id = p_resource_id
    and status = 'active';

  select status into current_status
  from public.study_group_members
  where resource_id = p_resource_id
    and user_id = auth.uid();

  select count(*) into waiting_count
  from public.study_group_waitlist
  where resource_id = p_resource_id
    and status = 'waiting';

  select status into current_waitlist
  from public.study_group_waitlist
  where resource_id = p_resource_id
    and user_id = auth.uid();

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
    target.owner_id = auth.uid(),
    waiting_count,
    current_waitlist;
end;
$$;

grant execute on function public.get_study_group_summary(uuid)
to authenticated;

-- Auto-promote waitlist after a member leaves.
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

  perform public.promote_study_group_waitlist(p_resource_id);
  return true;
end;
$$;

grant execute on function public.leave_study_group(uuid)
to authenticated;

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
  if not public.current_user_owns_resource(p_resource_id) then
    raise exception 'RESOURCE_NOT_OWNED';
  end if;

  update public.study_group_members
  set
    status = 'removed',
    removed_at = now(),
    updated_at = now()
  where resource_id = p_resource_id
    and user_id = p_user_id
    and status = 'active';

  if not found then raise exception 'ACTIVE_MEMBERSHIP_NOT_FOUND'; end if;

  perform public.promote_study_group_waitlist(p_resource_id);
  return true;
end;
$$;

grant execute on function public.mentor_remove_study_group_member(uuid, uuid)
to authenticated;

-- ---------------------------------------------------------
-- 13. UPDATED GUARDED MENTOR SESSION DIRECTORY
--     Includes pending bookings and latest pending reschedule request.
-- ---------------------------------------------------------

drop function if exists public.mentor_get_sessions(uuid);

create function public.mentor_get_sessions(p_resource_id uuid)
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
  mentee_email text,
  reschedule_request_id uuid,
  proposed_slot_id uuid,
  proposed_start_time timestamptz,
  proposed_end_time timestamptz,
  reschedule_reason text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_current_user_mentor() then raise exception 'MENTOR_REQUIRED'; end if;
  if not public.current_user_owns_resource(p_resource_id) then
    raise exception 'RESOURCE_NOT_OWNED';
  end if;

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
    u.email::text,
    rr.id,
    rr.proposed_slot_id,
    pa.start_time,
    pa.end_time,
    rr.reason
  from public.bookings b
  join auth.users u on u.id = b.user_id
  left join public.profiles p on p.id = b.user_id
  left join lateral (
    select x.*
    from public.booking_reschedule_requests x
    where x.booking_id = b.id
      and x.status = 'pending'
    order by x.created_at desc
    limit 1
  ) rr on true
  left join public.resource_availability pa
    on pa.id = rr.proposed_slot_id
  where b.resource_id = p_resource_id
  order by
    case when b.status = 'pending' then 0 else 1 end,
    b.start_time asc;
end;
$$;

grant execute on function public.mentor_get_sessions(uuid)
to authenticated;

-- ---------------------------------------------------------
-- 14. USEFUL GRANTS
-- ---------------------------------------------------------

grant select, update on public.notifications to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select on public.study_group_schedule_preferences to authenticated;
grant select on public.study_group_attendance to authenticated;
grant select on public.study_group_waitlist to authenticated;
