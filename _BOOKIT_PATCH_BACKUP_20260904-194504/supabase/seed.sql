-- Optional BookIt demo data.
-- Run after schema.sql or the final availability migration.
-- At least one user must already exist.

do $$

declare

  owner uuid;

  react_id uuid;
  next_id uuid;
  career_id uuid;
  database_id uuid;
  uiux_id uuid;
  python_id uuid;

begin

  select id
  into owner
  from auth.users
  order by created_at asc
  limit 1;

  if owner is null then

    raise notice
      'Create a BookIt user first, then rerun seed.sql.';

    return;

  end if;

  insert into public.resources (
    name,
    description,
    owner_id,
    type,
    skills,
    duration_minutes,
    status
  )

  select *
  from (
    values

      (
        'React Mentorship',
        'Expert guidance in React, Next.js, TypeScript and frontend architecture.',
        owner,
        'Mentor',
        array[
          'React',
          'Next.js',
          'TypeScript'
        ],
        60,
        'available'
      ),

      (
        'Study Group: Next.js',
        'Collaborative learning sessions for Next.js learners of all levels.',
        owner,
        'Study Group',
        array[
          'Next.js',
          'React',
          'Projects'
        ],
        60,
        'available'
      ),

      (
        'Career Mentorship',
        'Helping fellows with career growth, CV reviews and practical direction.',
        owner,
        'Mentor',
        array[
          'Career',
          'CV',
          'Interviews'
        ],
        60,
        'available'
      ),

      (
        'Database Study Group',
        'Peer learning sessions focused on databases, SQL and Supabase.',
        owner,
        'Study Group',
        array[
          'Postgres',
          'SQL',
          'Supabase'
        ],
        60,
        'available'
      ),

      (
        'UI/UX Mentor',
        'Practical product design, interface and usability mentoring.',
        owner,
        'Mentor',
        array[
          'UI/UX',
          'Design systems',
          'Accessibility'
        ],
        60,
        'available'
      ),

      (
        'Python Study Group',
        'Collaborative Python problem-solving and project sessions.',
        owner,
        'Study Group',
        array[
          'Python',
          'Projects',
          'Algorithms'
        ],
        60,
        'available'
      )

  ) as demo(
    name,
    description,
    owner_id,
    type,
    skills,
    duration_minutes,
    status
  )

  where not exists (
    select 1
    from public.resources r
    where r.name =
      demo.name
  );

  select id
  into react_id
  from public.resources
  where name =
    'React Mentorship'
  order by created_at
  limit 1;

  select id
  into next_id
  from public.resources
  where name =
    'Study Group: Next.js'
  order by created_at
  limit 1;

  select id
  into career_id
  from public.resources
  where name =
    'Career Mentorship'
  order by created_at
  limit 1;

  select id
  into database_id
  from public.resources
  where name =
    'Database Study Group'
  order by created_at
  limit 1;

  select id
  into uiux_id
  from public.resources
  where name =
    'UI/UX Mentor'
  order by created_at
  limit 1;

  select id
  into python_id
  from public.resources
  where name =
    'Python Study Group'
  order by created_at
  limit 1;

  if react_id is not null then

    insert into public.resource_availability (
      resource_id,
      start_time,
      end_time,
      status
    )

    values

      (
        react_id,
        date_trunc(
          'day',
          now()
        ) +
          interval '2 days 10 hours',

        date_trunc(
          'day',
          now()
        ) +
          interval '2 days 11 hours',

        'available'
      ),

      (
        react_id,
        date_trunc(
          'day',
          now()
        ) +
          interval '4 days 14 hours',

        date_trunc(
          'day',
          now()
        ) +
          interval '4 days 15 hours',

        'available'
      ),

      (
        react_id,
        date_trunc(
          'day',
          now()
        ) +
          interval '6 days 11 hours',

        date_trunc(
          'day',
          now()
        ) +
          interval '6 days 12 hours',

        'available'
      )

    on conflict (
      resource_id,
      start_time,
      end_time
    )
    do nothing;

  end if;

  if next_id is not null then

    insert into public.study_group_sessions (
      resource_id, start_time, end_time, meeting_link, status, created_by
    )
    select next_id,
      date_trunc('day', now()) + interval '3 days 15 hours',
      date_trunc('day', now()) + interval '3 days 16 hours 30 minutes',
      null, 'scheduled', owner
    where not exists (
      select 1 from public.study_group_sessions s
      where s.resource_id = next_id
        and s.start_time = date_trunc('day', now()) + interval '3 days 15 hours'
    );

  end if;

  if career_id is not null then

    insert into public.resource_availability (
      resource_id,
      start_time,
      end_time,
      status
    )

    values

      (
        career_id,
        date_trunc(
          'day',
          now()
        ) +
          interval '2 days 13 hours',

        date_trunc(
          'day',
          now()
        ) +
          interval '2 days 14 hours',

        'available'
      ),

      (
        career_id,
        date_trunc(
          'day',
          now()
        ) +
          interval '7 days 13 hours',

        date_trunc(
          'day',
          now()
        ) +
          interval '7 days 14 hours',

        'available'
      )

    on conflict (
      resource_id,
      start_time,
      end_time
    )
    do nothing;

  end if;

  if database_id is not null then

    insert into public.study_group_sessions (
      resource_id, start_time, end_time, meeting_link, status, created_by
    )
    select database_id,
      date_trunc('day', now()) + interval '3 days 10 hours',
      date_trunc('day', now()) + interval '3 days 11 hours 30 minutes',
      null, 'scheduled', owner
    where not exists (
      select 1 from public.study_group_sessions s
      where s.resource_id = database_id
        and s.start_time = date_trunc('day', now()) + interval '3 days 10 hours'
    );

  end if;

  if uiux_id is not null then

    insert into public.resource_availability (
      resource_id,
      start_time,
      end_time,
      status
    )

    values

      (
        uiux_id,
        date_trunc(
          'day',
          now()
        ) +
          interval '4 days 11 hours',

        date_trunc(
          'day',
          now()
        ) +
          interval '4 days 12 hours',

        'available'
      ),

      (
        uiux_id,
        date_trunc(
          'day',
          now()
        ) +
          interval '8 days 11 hours',

        date_trunc(
          'day',
          now()
        ) +
          interval '8 days 12 hours',

        'available'
      )

    on conflict (
      resource_id,
      start_time,
      end_time
    )
    do nothing;

  end if;

  if python_id is not null then

    insert into public.study_group_sessions (
      resource_id, start_time, end_time, meeting_link, status, created_by
    )
    select python_id,
      date_trunc('day', now()) + interval '5 days 10 hours',
      date_trunc('day', now()) + interval '5 days 11 hours 30 minutes',
      null, 'scheduled', owner
    where not exists (
      select 1 from public.study_group_sessions s
      where s.resource_id = python_id
        and s.start_time = date_trunc('day', now()) + interval '5 days 10 hours'
    );

  end if;

end $$;