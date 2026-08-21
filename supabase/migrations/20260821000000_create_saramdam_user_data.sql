create table if not exists public.people (
  id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null default '',
  company text not null default '',
  category text not null default '지인',
  groups text[] not null default '{}',
  family_info jsonb not null default '{"children":[]}'::jsonb,
  preferences jsonb not null default '{"food":"","hobbies":"","notes":""}'::jsonb,
  events_history jsonb not null default '[]'::jsonb,
  avatar_emoji text not null default '🙂',
  avatar_bg text not null default 'bg-[#f3dfd1]',
  avatar_image_data_url text,
  avatar_preset text,
  last_contact_date date,
  last_contact_medium text not null default '기타',
  remind_interval_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, owner_user_id)
);

create table if not exists public.records (
  id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null,
  date date not null,
  medium text not null,
  summary text not null,
  raw_transcript text,
  ai_analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, owner_user_id),
  foreign key (person_id, owner_user_id) references public.people(id, owner_user_id) on delete cascade
);

create table if not exists public.follow_ups (
  id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null,
  source_record_id text,
  text text not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  result_record_id text,
  updated_at timestamptz not null default now(),
  primary key (id, owner_user_id),
  foreign key (person_id, owner_user_id) references public.people(id, owner_user_id) on delete cascade
);

create table if not exists public.ai_summaries (
  id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null,
  source_hash text not null,
  summary text not null,
  tags jsonb not null default '[]'::jsonb,
  status text not null default 'complete' check (status in ('pending', 'complete', 'failed')),
  provider text,
  model text,
  fallback boolean,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, owner_user_id),
  foreign key (person_id, owner_user_id) references public.people(id, owner_user_id) on delete cascade
);

create table if not exists public.custom_groups (
  id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, owner_user_id),
  unique (owner_user_id, name)
);

create table if not exists public.migration_status (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  migration_version text not null,
  legacy_people_count integer not null default 0,
  legacy_records_count integer not null default 0,
  legacy_follow_ups_count integer not null default 0,
  completed_at timestamptz not null default now()
);

alter table public.people enable row level security;
alter table public.records enable row level security;
alter table public.follow_ups enable row level security;
alter table public.ai_summaries enable row level security;
alter table public.custom_groups enable row level security;
alter table public.migration_status enable row level security;

create policy "people_select_own" on public.people for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "people_insert_own" on public.people for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy "people_update_own" on public.people for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy "people_delete_own" on public.people for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy "records_select_own" on public.records for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "records_insert_own" on public.records for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy "records_update_own" on public.records for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy "records_delete_own" on public.records for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy "follow_ups_select_own" on public.follow_ups for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "follow_ups_insert_own" on public.follow_ups for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy "follow_ups_update_own" on public.follow_ups for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy "follow_ups_delete_own" on public.follow_ups for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy "ai_summaries_select_own" on public.ai_summaries for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "ai_summaries_insert_own" on public.ai_summaries for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy "ai_summaries_update_own" on public.ai_summaries for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy "ai_summaries_delete_own" on public.ai_summaries for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy "custom_groups_select_own" on public.custom_groups for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "custom_groups_insert_own" on public.custom_groups for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy "custom_groups_update_own" on public.custom_groups for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy "custom_groups_delete_own" on public.custom_groups for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy "migration_status_select_own" on public.migration_status for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "migration_status_insert_own" on public.migration_status for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy "migration_status_update_own" on public.migration_status for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

create index if not exists people_owner_user_id_idx on public.people(owner_user_id);
create index if not exists records_owner_user_id_idx on public.records(owner_user_id);
create index if not exists records_person_owner_idx on public.records(person_id, owner_user_id);
create index if not exists follow_ups_owner_user_id_idx on public.follow_ups(owner_user_id);
create index if not exists follow_ups_person_owner_idx on public.follow_ups(person_id, owner_user_id);
create index if not exists follow_ups_owner_status_idx on public.follow_ups(owner_user_id, status);
create index if not exists ai_summaries_owner_user_id_idx on public.ai_summaries(owner_user_id);
create index if not exists ai_summaries_person_owner_idx on public.ai_summaries(person_id, owner_user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.records to authenticated;
grant select, insert, update, delete on public.follow_ups to authenticated;
grant select, insert, update, delete on public.ai_summaries to authenticated;
grant select, insert, update, delete on public.custom_groups to authenticated;
grant select, insert, update on public.migration_status to authenticated;
