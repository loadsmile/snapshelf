create or replace function public.validate_snap_bulk_ids(target_snap_ids uuid[])
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if target_snap_ids is null
    or cardinality(target_snap_ids) < 1
    or cardinality(target_snap_ids) > 50
    or array_position(target_snap_ids, null) is not null then
    raise exception 'Choose between 1 and 50 valid Snaps.' using errcode = '22023';
  end if;

  select array_agg(snap_id order by first_position)
  into normalized_ids
  from (
    select snap_id, min(position) as first_position
    from unnest(target_snap_ids) with ordinality as requested(snap_id, position)
    group by snap_id
  ) normalized;

  return normalized_ids;
end;
$$;

create or replace function public.bulk_move_snaps(target_snap_ids uuid[], target_shelf_id uuid)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_ids uuid[] := public.validate_snap_bulk_ids(target_snap_ids);
  updated_ids uuid[];
begin
  if target_shelf_id is not null and not exists (
    select 1 from public.shelves where id = target_shelf_id and user_id = current_user_id
  ) then
    raise exception 'Shelf not found.' using errcode = 'P0002';
  end if;

  with updated as (
    update public.snaps
    set shelf_id = target_shelf_id
    where user_id = current_user_id and id = any(normalized_ids)
    returning id
  )
  select coalesce(array_agg(id), '{}') into updated_ids from updated;

  if target_shelf_id is not null and cardinality(updated_ids) > 0 then
    update public.shelves
    set cover_snap_id = coalesce(cover_snap_id, updated_ids[1])
    where id = target_shelf_id and user_id = current_user_id;
  end if;

  return updated_ids;
end;
$$;

create or replace function public.bulk_set_snaps_favorite(target_snap_ids uuid[], target_is_favorite boolean)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_ids uuid[] := public.validate_snap_bulk_ids(target_snap_ids);
  updated_ids uuid[];
begin
  if target_is_favorite is null then
    raise exception 'Favorite state is required.' using errcode = '22023';
  end if;

  with updated as (
    update public.snaps
    set
      is_favorite = target_is_favorite,
      favorited_at = case
        when target_is_favorite then coalesce(favorited_at, now())
        else null
      end
    where user_id = current_user_id and id = any(normalized_ids)
    returning id
  )
  select coalesce(array_agg(id), '{}') into updated_ids from updated;

  return updated_ids;
end;
$$;

create or replace function public.bulk_set_snaps_archived(target_snap_ids uuid[], target_is_archived boolean)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_ids uuid[] := public.validate_snap_bulk_ids(target_snap_ids);
  updated_ids uuid[];
begin
  if target_is_archived is null then
    raise exception 'Archive state is required.' using errcode = '22023';
  end if;

  with updated as (
    update public.snaps
    set
      is_archived = target_is_archived,
      archived_at = case
        when target_is_archived then coalesce(archived_at, now())
        else null
      end
    where user_id = current_user_id and id = any(normalized_ids)
    returning id
  )
  select coalesce(array_agg(id), '{}') into updated_ids from updated;

  return updated_ids;
end;
$$;

create or replace function public.bulk_delete_snaps(target_snap_ids uuid[])
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_ids uuid[] := public.validate_snap_bulk_ids(target_snap_ids);
  deleted_ids uuid[];
begin
  with deleted as (
    delete from public.snaps
    where user_id = current_user_id and id = any(normalized_ids)
    returning id
  )
  select coalesce(array_agg(id), '{}') into deleted_ids from deleted;

  return deleted_ids;
end;
$$;

revoke all on function public.validate_snap_bulk_ids(uuid[]) from public, anon;
revoke all on function public.bulk_move_snaps(uuid[], uuid) from public, anon;
revoke all on function public.bulk_set_snaps_favorite(uuid[], boolean) from public, anon;
revoke all on function public.bulk_set_snaps_archived(uuid[], boolean) from public, anon;
revoke all on function public.bulk_delete_snaps(uuid[]) from public, anon;

grant execute on function public.bulk_move_snaps(uuid[], uuid) to authenticated;
grant execute on function public.validate_snap_bulk_ids(uuid[]) to authenticated;
grant execute on function public.bulk_set_snaps_favorite(uuid[], boolean) to authenticated;
grant execute on function public.bulk_set_snaps_archived(uuid[], boolean) to authenticated;
grant execute on function public.bulk_delete_snaps(uuid[]) to authenticated;
