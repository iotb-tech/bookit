-- =========================================================
-- BOOKIT NOTIFICATION CLEANUP + SAMPLE RESOURCE ARCHIVE
-- 2026-09-04
--
-- Adds:
--   clear_my_notifications()
--
-- Archives old sample mentors/groups without deleting
-- booking history or related records.
-- =========================================================

alter table public.resources
  add column if not exists archived_at timestamptz;

create or replace function public.clear_my_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  delete from public.notifications
  where user_id = auth.uid()
    and (
      scheduled_for is null
      or scheduled_for <= now()
    );

  get diagnostics deleted_count = row_count;

  return deleted_count;
end;
$$;

revoke all
on function public.clear_my_notifications()
from public;

grant execute
on function public.clear_my_notifications()
to authenticated;

-- ---------------------------------------------------------
-- Archive original sample mentors / study groups.
--
-- Do NOT hard-delete because historic bookings may still
-- reference these resources.
-- ---------------------------------------------------------

update public.resources
set archived_at =
  coalesce(
    archived_at,
    now()
  )
where lower(trim(name)) in (
  lower('Abdulsalam Idris'),
  lower('Adewuyi Awwal'),
  lower('Balogun Waliyat'),
  lower('Study Group: Team 1'),
  lower('Study Group: Team 2'),
  lower('Study Group: Team 3'),
  lower('Study Group: Team 4')
);

-- Harry Williams and ELITE are intentionally untouched.