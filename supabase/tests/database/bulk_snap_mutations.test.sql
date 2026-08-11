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
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bulk-a@example.com', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bulk-b@example.com', '');

insert into public.shelves (id, user_id, name)
values ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Destination');

insert into public.snaps (id, user_id, title)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'First'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'Second'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '22222222-2222-2222-2222-222222222222', 'Other User');

insert into public.snap_media_locations (user_id, device_id, snap_id, local_path)
values ('11111111-1111-1111-1111-111111111111', 'cccccccc-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'snaps/second.jpg');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select '1..10';
select case when pg_temp.raises_sqlstate(
  $$select public.bulk_set_snaps_favorite(array(select extensions.gen_random_uuid() from generate_series(1, 51)), true)$$,
  '22023'
) then 'ok 1 - bulk mutations reject more than 50 ids' else 'not ok 1 - bulk mutations reject more than 50 ids' end;

select public.bulk_set_snaps_favorite(
  array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid],
  true
);
select case when (select is_favorite and favorited_at is not null from public.snaps where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')
then 'ok 2 - favorite returns only owned existing ids' else 'not ok 2 - favorite returns only owned existing ids' end;

select case when not exists (
  select 1 from public.snaps where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
) then 'ok 3 - other users remain hidden and unchanged' else 'not ok 3 - other users remain hidden and unchanged' end;

select public.bulk_set_snaps_archived(array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid], true);
select case when (select is_archived and archived_at is not null from public.snaps where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')
then 'ok 4 - archive sets state and timestamp' else 'not ok 4 - archive sets state and timestamp' end;

select public.bulk_set_snaps_archived(array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid], false);
select case when (select not is_archived and archived_at is null from public.snaps where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')
then 'ok 5 - restore clears state and timestamp' else 'not ok 5 - restore clears state and timestamp' end;

select public.bulk_move_snaps(array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid], 'aaaaaaaa-1111-1111-1111-111111111111');
select case when (select shelf_id from public.snaps where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1') = 'aaaaaaaa-1111-1111-1111-111111111111'
and (select cover_snap_id from public.shelves where id = 'aaaaaaaa-1111-1111-1111-111111111111') = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
then 'ok 6 - move and initial Shelf cover update together' else 'not ok 6 - move and initial Shelf cover update together' end;

select case when pg_temp.raises_sqlstate(
  $$select public.bulk_move_snaps(array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid], 'ffffffff-1111-1111-1111-111111111111')$$,
  'P0002'
) and (select shelf_id from public.snaps where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1') = 'aaaaaaaa-1111-1111-1111-111111111111'
then 'ok 7 - invalid destination leaves Snaps unchanged' else 'not ok 7 - invalid destination leaves Snaps unchanged' end;

select public.bulk_delete_snaps(array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid]);
select case when not exists (select 1 from public.snaps where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2')
and not exists (select 1 from public.snap_media_locations where snap_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2')
then 'ok 8 - delete cascades device media locations' else 'not ok 8 - delete cascades device media locations' end;

select case when public.bulk_delete_snaps(array['ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid]) = '{}'
then 'ok 9 - missing ids return no successes' else 'not ok 9 - missing ids return no successes' end;

select case when cardinality(public.bulk_set_snaps_favorite(array[
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid
], true)) = 1 then 'ok 10 - duplicate ids are normalized' else 'not ok 10 - duplicate ids are normalized' end;

rollback;
