drop function if exists public.create_snap_with_media(uuid, uuid, text, text, text, text, text[], text, boolean, timestamptz, boolean, timestamptz, timestamptz, text);

create or replace function public.create_snap_with_media(
  target_snap_id uuid,
  target_device_id uuid,
  target_shelf_id uuid,
  snap_title text,
  snap_image_url text,
  snap_source_url text,
  snap_thought text,
  snap_labels text[],
  snap_source text,
  snap_is_favorite boolean,
  snap_favorited_at timestamptz,
  snap_is_archived boolean,
  snap_archived_at timestamptz,
  snap_captured_at timestamptz,
  snap_local_path text
)
returns public.snaps
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_snap public.snaps;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

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
    target_snap_id,
    current_user_id,
    target_shelf_id,
    snap_title,
    snap_image_url,
    snap_source_url,
    snap_thought,
    coalesce(snap_labels, '{}'),
    coalesce(snap_source, 'unknown'),
    coalesce(snap_is_favorite, false),
    snap_favorited_at,
    coalesce(snap_is_archived, false),
    snap_archived_at,
    coalesce(snap_captured_at, now())
  )
  returning * into created_snap;

  if snap_local_path is not null then
    insert into public.snap_media_locations (user_id, device_id, snap_id, local_path)
    values (current_user_id, target_device_id, created_snap.id, snap_local_path);
  end if;

  return created_snap;
end;
$$;

grant execute on function public.create_snap_with_media(uuid, uuid, uuid, text, text, text, text, text[], text, boolean, timestamptz, boolean, timestamptz, timestamptz, text) to authenticated;
