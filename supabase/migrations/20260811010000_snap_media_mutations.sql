create or replace function public.set_snap_media_location(
  target_snap_id uuid,
  target_device_id uuid,
  expected_local_path text,
  next_local_path text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_local_path text;
  location_exists boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select local_path
  into current_local_path
  from public.snap_media_locations
  where user_id = current_user_id
    and device_id = target_device_id
    and snap_id = target_snap_id;

  location_exists := found;

  if (location_exists and current_local_path is distinct from expected_local_path)
    or (not location_exists and expected_local_path is not null) then
    raise exception 'This image changed on this device. Reopen the Snap and try again.' using errcode = '40001';
  end if;

  if next_local_path is null then
    delete from public.snap_media_locations
    where user_id = current_user_id
      and device_id = target_device_id
      and snap_id = target_snap_id;
  else
    insert into public.snap_media_locations (user_id, device_id, snap_id, local_path)
    values (current_user_id, target_device_id, target_snap_id, next_local_path)
    on conflict (user_id, device_id, snap_id)
    do update set local_path = excluded.local_path;
  end if;

  update public.snaps
  set updated_at = now()
  where user_id = current_user_id
    and id = target_snap_id;

  if not found then
    raise exception 'Snap not found.' using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.set_snap_media_location(uuid, uuid, text, text) to authenticated;
