-- =========================================================
-- BOOKIT: ADD PENDING BOOKING STATUS (ENUM COMPATIBILITY)
-- Migration date: 2026-09-02
--
-- IMPORTANT:
-- Run THIS FILE BY ITSELF first and wait for Success.
-- Then run 20260902_workflow_notifications_settings.sql.
--
-- Why this exists:
-- Some existing BookIt databases use the PostgreSQL enum
-- public.booking_status instead of a text status column.
-- PostgreSQL requires a newly-added enum value to be committed
-- before a later query can safely use it.
-- =========================================================

do $$
declare
  status_type_oid oid;
  status_is_enum boolean := false;
  pending_exists boolean := false;
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

  if status_type_oid is null then
    raise exception 'BOOKINGS_STATUS_COLUMN_NOT_FOUND';
  end if;

  select (t.typtype = 'e')
  into status_is_enum
  from pg_type t
  where t.oid = status_type_oid;

  if status_is_enum then
    select exists (
      select 1
      from pg_enum e
      where e.enumtypid = status_type_oid
        and e.enumlabel = 'pending'
    )
    into pending_exists;

    if not pending_exists then
      execute format(
        'alter type %s add value if not exists %L',
        status_type_oid::regtype,
        'pending'
      );
    end if;
  end if;
end $$;

-- Verification. If the status column is an enum, "pending"
-- should now appear in the returned enum labels.
select
  a.atttypid::regtype as status_column_type,
  t.typtype as type_kind,
  case
    when t.typtype = 'e' then (
      select string_agg(e.enumlabel, ', ' order by e.enumsortorder)
      from pg_enum e
      where e.enumtypid = a.atttypid
    )
    else 'text/non-enum status column'
  end as allowed_status_values
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_type t on t.oid = a.atttypid
where n.nspname = 'public'
  and c.relname = 'bookings'
  and a.attname = 'status'
  and a.attnum > 0
  and not a.attisdropped;
