update public.shelves
set name = coalesce(nullif(regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g'), ''), 'Untitled Shelf')
where name is distinct from coalesce(nullif(regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g'), ''), 'Untitled Shelf');

update public.stacks
set name = coalesce(nullif(regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g'), ''), 'Untitled Stack')
where name is distinct from coalesce(nullif(regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g'), ''), 'Untitled Stack');

alter table public.shelves
  add constraint shelves_name_trimmed_check
  check (name = regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g'));

alter table public.stacks
  add constraint stacks_name_trimmed_check
  check (name = regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g'));
