-- One private workspace for the hackathon demo. No anonymous/browser table access.
create table if not exists public.demo_palaces (
  id text primary key,
  revision integer not null default 1 check (revision > 0),
  document jsonb not null,
  deleted boolean not null default false
);
create table if not exists public.demo_assets (
  id text primary key,
  path text not null unique,
  metadata jsonb not null,
  sha256 text not null
);
alter table public.demo_palaces enable row level security;
alter table public.demo_assets enable row level security;
revoke all on public.demo_palaces, public.demo_assets from anon, authenticated;
grant select, insert, update, delete on public.demo_palaces, public.demo_assets to service_role;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('demo-media', 'demo-media', false, 33554432, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
notify pgrst, 'reload schema';
