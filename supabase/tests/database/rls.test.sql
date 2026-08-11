\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

begin;

create function pg_temp.raises_sqlstate(statement text, expected_state text)
returns boolean
language plpgsql
as $$
begin
  execute statement;
  return false;
exception when others then
  return sqlstate = expected_state;
end;
$$;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '');

insert into public.snaps (id, user_id, title)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'User A Snap'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'User B Snap');

insert into public.snap_media_locations (user_id, device_id, snap_id, local_path)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'snaps/a.jpg'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'snaps/b.jpg');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select '1..12';
select case when (select count(*) from public.snaps) = 1 then 'ok 1 - user A sees only their Snap' else 'not ok 1 - user A sees only their Snap' end;
select case when (select title from public.snaps limit 1) = 'User A Snap' then 'ok 2 - user A reads their own Snap' else 'not ok 2 - user A reads their own Snap' end;
select case when (select count(*) from public.snap_media_locations) = 1 then 'ok 3 - user A sees only their media locations' else 'not ok 3 - user A sees only their media locations' end;
select case when (select local_path from public.snap_media_locations limit 1) = 'snaps/a.jpg' then 'ok 4 - user A reads their own local path' else 'not ok 4 - user A reads their own local path' end;
select case when pg_temp.raises_sqlstate(
  $$insert into public.snap_media_locations (user_id, device_id, snap_id, local_path)
    values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'snaps/stolen.jpg')$$,
  '42501'
) then 'ok 5 - user A cannot write a location owned by user B' else 'not ok 5 - user A cannot write a location owned by user B' end;
select case when pg_temp.raises_sqlstate(
  $$insert into public.snap_media_locations (user_id, device_id, snap_id, local_path)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'snaps/cross-user.jpg')$$,
  '23503'
) then 'ok 6 - media locations cannot reference another user''s Snap' else 'not ok 6 - media locations cannot reference another user''s Snap' end;
select case when pg_temp.raises_sqlstate(
  $$insert into public.snap_media_locations (user_id, device_id, snap_id, local_path)
    values ('11111111-1111-1111-1111-111111111111', 'cccccccc-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '../escape.jpg')$$,
  '23514'
) then 'ok 7 - media paths cannot escape their managed folder' else 'not ok 7 - media paths cannot escape their managed folder' end;
select public.set_snap_media_location(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-1111-1111-1111-111111111111',
  'snaps/a.jpg',
  'snaps/replaced.jpg'
);
select case when (
  select local_path
  from public.snap_media_locations
  where snap_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
) = 'snaps/replaced.jpg' then 'ok 8 - media replacement updates the current device atomically' else 'not ok 8 - media replacement updates the current device atomically' end;
select case when pg_temp.raises_sqlstate(
  $$select public.set_snap_media_location(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-1111-1111-1111-111111111111',
    'snaps/a.jpg',
    'snaps/stale.jpg'
  )$$,
  '40001'
) then 'ok 9 - stale media replacement is rejected' else 'not ok 9 - stale media replacement is rejected' end;
select public.create_snap_with_media(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-1111-1111-1111-111111111111',
  null,
  'Atomic Snap',
  null,
  'https://example.com/atomic',
  null,
  array['test'],
  'web-clip',
  false,
  null,
  false,
  null,
  now(),
  'snaps/atomic.jpg'
);
select case when exists (
  select 1
  from public.snaps
  join public.snap_media_locations on snap_media_locations.snap_id = snaps.id
  where snaps.title = 'Atomic Snap'
    and snap_media_locations.local_path = 'snaps/atomic.jpg'
) then 'ok 10 - Snap and device media are created atomically' else 'not ok 10 - Snap and device media are created atomically' end;

select public.create_snaps_with_media(
  'aaaaaaaa-1111-1111-1111-111111111111',
  jsonb_build_array(
    jsonb_build_object('id', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'title', 'Batch One', 'source', 'camera-roll', 'labels', jsonb_build_array('batch'), 'local_path', 'snaps/batch-one.jpg'),
    jsonb_build_object('id', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'title', 'Batch Two', 'source', 'camera-roll', 'labels', jsonb_build_array('batch'), 'local_path', 'snaps/batch-two.jpg')
  )
);
select case when (
  select count(*)
  from public.snaps
  join public.snap_media_locations on snap_media_locations.snap_id = snaps.id
  where snaps.id in ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
) = 2 then 'ok 11 - image batches create every Snap and media location atomically' else 'not ok 11 - image batches create every Snap and media location atomically' end;

select case when pg_temp.raises_sqlstate(
  $$select public.create_snaps_with_media(
    'aaaaaaaa-1111-1111-1111-111111111111',
    jsonb_build_array(
      jsonb_build_object('id', 'ffffffff-ffff-ffff-ffff-fffffffffff1', 'title', 'Rollback One', 'local_path', 'snaps/rollback-one.jpg'),
      jsonb_build_object('id', 'ffffffff-ffff-ffff-ffff-fffffffffff2', 'title', 'Rollback Two', 'local_path', '../escape.jpg')
    )
  )$$,
  '23514'
) and not exists (
  select 1 from public.snaps where id = 'ffffffff-ffff-ffff-ffff-fffffffffff1'
) then 'ok 12 - a failed batch rolls back every Snap and media location' else 'not ok 12 - a failed batch rolls back every Snap and media location' end;

rollback;
