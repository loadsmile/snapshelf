create or replace function public.create_snaps_with_media(
  target_device_id uuid,
  snap_inputs jsonb
)
returns setof public.snaps
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  input_count integer;
  snap_input jsonb;
  created_snap public.snaps;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if jsonb_typeof(snap_inputs) is distinct from 'array' then
    raise exception 'Snap inputs must be an array.' using errcode = '22023';
  end if;

  input_count := jsonb_array_length(snap_inputs);
  if input_count < 1 or input_count > 20 then
    raise exception 'A batch must contain between 1 and 20 Snaps.' using errcode = '22023';
  end if;

  for snap_input in select value from jsonb_array_elements(snap_inputs)
  loop
    insert into public.snaps (
      id,
      user_id,
      shelf_id,
      title,
      image_url,
      source_url,
      thought,
      labels,
      source,
      is_favorite,
      favorited_at,
      is_archived,
      archived_at,
      captured_at
    )
    values (
      (snap_input ->> 'id')::uuid,
      current_user_id,
      (snap_input ->> 'shelf_id')::uuid,
      snap_input ->> 'title',
      snap_input ->> 'image_url',
      snap_input ->> 'source_url',
      snap_input ->> 'thought',
      coalesce(array(select jsonb_array_elements_text(snap_input -> 'labels')), '{}'),
      coalesce(snap_input ->> 'source', 'unknown'),
      coalesce((snap_input ->> 'is_favorite')::boolean, false),
      (snap_input ->> 'favorited_at')::timestamptz,
      coalesce((snap_input ->> 'is_archived')::boolean, false),
      (snap_input ->> 'archived_at')::timestamptz,
      coalesce((snap_input ->> 'captured_at')::timestamptz, now())
    )
    returning * into created_snap;

    if snap_input ->> 'local_path' is not null then
      insert into public.snap_media_locations (user_id, device_id, snap_id, local_path)
      values (current_user_id, target_device_id, created_snap.id, snap_input ->> 'local_path');
    end if;

    return next created_snap;
  end loop;
end;
$$;

grant execute on function public.create_snaps_with_media(uuid, jsonb) to authenticated;
