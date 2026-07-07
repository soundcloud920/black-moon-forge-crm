create table if not exists public.crm_state (
  id text primary key,
  payload text not null,
  iv text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.crm_state enable row level security;

drop policy if exists "bmf_crm_read" on public.crm_state;
drop policy if exists "bmf_crm_insert" on public.crm_state;
drop policy if exists "bmf_crm_update" on public.crm_state;

create policy "bmf_crm_read"
  on public.crm_state
  for select
  using (true);

create policy "bmf_crm_insert"
  on public.crm_state
  for insert
  with check (true);

create policy "bmf_crm_update"
  on public.crm_state
  for update
  using (true)
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.crm_state;
exception
  when duplicate_object then null;
end $$;
