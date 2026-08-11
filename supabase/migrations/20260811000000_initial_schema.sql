create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shelves (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  cover_snap_id uuid,
  board_x double precision,
  board_y double precision,
  board_variant text check (board_variant is null or board_variant in ('primary', 'arch', 'circle-large', 'circle-small', 'circle-medium', 'tall')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.snaps (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shelf_id uuid,
  title text check (title is null or char_length(title) <= 200),
  image_url text,
  source_url text check (source_url is null or char_length(source_url) <= 4096),
  thought text check (thought is null or char_length(thought) <= 10000),
  labels text[] not null default '{}',
  source text not null default 'unknown' check (source in ('quick-snap', 'camera-roll', 'web-clip', 'instagram', 'manual', 'unknown')),
  is_favorite boolean not null default false,
  favorited_at timestamptz,
  is_archived boolean not null default false,
  archived_at timestamptz,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (shelf_id, user_id) references public.shelves(id, user_id) on delete set null (shelf_id)
);

alter table public.shelves
  add constraint shelves_cover_snap_owner_fk
  foreign key (cover_snap_id, user_id)
  references public.snaps(id, user_id)
  on delete set null (cover_snap_id);

create table public.stacks (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  board_x double precision,
  board_y double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.threads (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_type text not null default 'shelf' check (from_type in ('shelf', 'stack')),
  from_id uuid not null,
  from_shelf_id uuid,
  from_stack_id uuid,
  to_shelf_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (from_shelf_id, user_id) references public.shelves(id, user_id) on delete cascade,
  foreign key (from_stack_id, user_id) references public.stacks(id, user_id) on delete cascade,
  foreign key (to_shelf_id, user_id) references public.shelves(id, user_id) on delete cascade,
  check (
    (from_type = 'shelf' and from_shelf_id is not null and from_stack_id is null and from_id = from_shelf_id)
    or
    (from_type = 'stack' and from_stack_id is not null and from_shelf_id is null and from_id = from_stack_id)
  ),
  check (from_shelf_id is null or from_shelf_id <> to_shelf_id)
);

create unique index threads_unique_shelf_link_idx
  on public.threads(user_id, from_shelf_id, to_shelf_id)
  where from_shelf_id is not null;

create unique index threads_unique_stack_destination_idx
  on public.threads(user_id, to_shelf_id)
  where from_stack_id is not null;

create or replace function public.replace_shelf_thread(
  destination_shelf_id uuid,
  anchor_type text default null,
  anchor_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  delete from public.threads
  where user_id = current_user_id
    and to_shelf_id = destination_shelf_id;

  if anchor_type is null then
    return;
  end if;

  if anchor_type not in ('shelf', 'stack') or anchor_id is null then
    raise exception 'A valid thread anchor is required.';
  end if;

  insert into public.threads (
    user_id,
    from_type,
    from_id,
    from_shelf_id,
    from_stack_id,
    to_shelf_id
  )
  values (
    current_user_id,
    anchor_type,
    anchor_id,
    case when anchor_type = 'shelf' then anchor_id else null end,
    case when anchor_type = 'stack' then anchor_id else null end,
    destination_shelf_id
  );
end;
$$;

create table public.snap_media_locations (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  snap_id uuid not null,
  local_path text not null check (local_path !~ '(^/|(^|/)\.\.(/|$))'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id, snap_id),
  foreign key (snap_id, user_id) references public.snaps(id, user_id) on delete cascade
);

create table public.shelf_cover_locations (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  shelf_id uuid not null,
  local_path text not null check (local_path !~ '(^/|(^|/)\.\.(/|$))'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id, shelf_id),
  foreign key (shelf_id, user_id) references public.shelves(id, user_id) on delete cascade
);

create table public.stack_cover_locations (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  stack_id uuid not null,
  local_path text not null check (local_path !~ '(^/|(^|/)\.\.(/|$))'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id, stack_id),
  foreign key (stack_id, user_id) references public.stacks(id, user_id) on delete cascade
);

create index shelves_user_created_idx on public.shelves(user_id, created_at);
create index snaps_user_created_idx on public.snaps(user_id, created_at desc, id desc);
create index snaps_user_shelf_created_idx on public.snaps(user_id, shelf_id, created_at desc, id desc);
create index snaps_user_archived_idx on public.snaps(user_id, is_archived);
create index stacks_user_created_idx on public.stacks(user_id, created_at);
create index threads_user_idx on public.threads(user_id);
create index threads_user_to_shelf_idx on public.threads(user_id, to_shelf_id);
create index threads_user_from_shelf_idx on public.threads(user_id, from_shelf_id);
create index threads_user_from_stack_idx on public.threads(user_id, from_stack_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger shelves_set_updated_at before update on public.shelves
for each row execute function public.set_updated_at();
create trigger snaps_set_updated_at before update on public.snaps
for each row execute function public.set_updated_at();
create trigger stacks_set_updated_at before update on public.stacks
for each row execute function public.set_updated_at();
create trigger snap_media_locations_set_updated_at before update on public.snap_media_locations
for each row execute function public.set_updated_at();
create trigger shelf_cover_locations_set_updated_at before update on public.shelf_cover_locations
for each row execute function public.set_updated_at();
create trigger stack_cover_locations_set_updated_at before update on public.stack_cover_locations
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.shelves enable row level security;
alter table public.snaps enable row level security;
alter table public.stacks enable row level security;
alter table public.threads enable row level security;
alter table public.snap_media_locations enable row level security;
alter table public.shelf_cover_locations enable row level security;
alter table public.stack_cover_locations enable row level security;

create policy "profiles own rows" on public.profiles
for all to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "shelves own rows" on public.shelves
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "snaps own rows" on public.snaps
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "stacks own rows" on public.stacks
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "threads own rows" on public.threads
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "snap media locations own rows" on public.snap_media_locations
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "shelf cover locations own rows" on public.shelf_cover_locations
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "stack cover locations own rows" on public.stack_cover_locations
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.shelves to authenticated;
grant select, insert, update, delete on public.snaps to authenticated;
grant select, insert, update, delete on public.stacks to authenticated;
grant select, insert, update, delete on public.threads to authenticated;
grant select, insert, update, delete on public.snap_media_locations to authenticated;
grant select, insert, update, delete on public.shelf_cover_locations to authenticated;
grant select, insert, update, delete on public.stack_cover_locations to authenticated;
grant execute on function public.replace_shelf_thread(uuid, text, uuid) to authenticated;

alter publication supabase_realtime add table public.shelves;
alter publication supabase_realtime add table public.snaps;
alter publication supabase_realtime add table public.stacks;
alter publication supabase_realtime add table public.threads;

alter table public.shelves replica identity full;
alter table public.snaps replica identity full;
alter table public.stacks replica identity full;
alter table public.threads replica identity full;

insert into storage.buckets (id, name, public)
values ('snap-media', 'snap-media', false)
on conflict (id) do nothing;

create policy "snap media select own folder" on storage.objects
for select to authenticated
using (bucket_id = 'snap-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "snap media insert own folder" on storage.objects
for insert to authenticated
with check (bucket_id = 'snap-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "snap media update own folder" on storage.objects
for update to authenticated
using (bucket_id = 'snap-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'snap-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "snap media delete own folder" on storage.objects
for delete to authenticated
using (bucket_id = 'snap-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
