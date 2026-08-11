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
values ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'organizations@example.com', '');

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

insert into public.shelves (id, user_id, name)
values ('33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Summer Plans');

insert into public.stacks (id, user_id, name)
values ('33333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Travel');

insert into public.snaps (id, user_id, shelf_id, title)
values ('33333333-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Beach house');

insert into public.threads (user_id, from_type, from_id, from_stack_id, to_shelf_id)
values ('33333333-3333-3333-3333-333333333333', 'stack', '33333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select '1..8';
select case when (select name from public.shelves where id = '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 'Summer Plans' then 'ok 1 - valid Shelf names are stored' else 'not ok 1 - valid Shelf names are stored' end;
select case when pg_temp.raises_sqlstate(
  $$insert into public.shelves (user_id, name) values ('33333333-3333-3333-3333-333333333333', ' Padded Shelf ')$$,
  '23514'
) then 'ok 2 - Shelf names must already be trimmed' else 'not ok 2 - Shelf names must already be trimmed' end;
select case when pg_temp.raises_sqlstate(
  $$insert into public.stacks (user_id, name) values ('33333333-3333-3333-3333-333333333333', E'\tPadded Stack\n')$$,
  '23514'
) then 'ok 3 - Stack names must already be trimmed' else 'not ok 3 - Stack names must already be trimmed' end;
select case when pg_temp.raises_sqlstate(
  $$insert into public.shelves (user_id, name) values ('33333333-3333-3333-3333-333333333333', '   ')$$,
  '23514'
) then 'ok 4 - blank organization names are rejected' else 'not ok 4 - blank organization names are rejected' end;
select case when pg_temp.raises_sqlstate(
  $$insert into public.stacks (user_id, name) values ('33333333-3333-3333-3333-333333333333', repeat('a', 81))$$,
  '23514'
) then 'ok 5 - organization names over 80 characters are rejected' else 'not ok 5 - organization names over 80 characters are rejected' end;

delete from public.stacks where id = '33333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select case when exists (select 1 from public.shelves where id = '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then 'ok 6 - deleting a Stack preserves its Shelves' else 'not ok 6 - deleting a Stack preserves its Shelves' end;
select case when exists (select 1 from public.snaps where id = '33333333-cccc-cccc-cccc-cccccccccccc' and shelf_id = '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then 'ok 7 - deleting a Stack preserves filed Snaps' else 'not ok 7 - deleting a Stack preserves filed Snaps' end;
select case when not exists (select 1 from public.threads where from_stack_id = '33333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb') then 'ok 8 - deleting a Stack removes membership threads' else 'not ok 8 - deleting a Stack removes membership threads' end;

rollback;
