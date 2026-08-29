create table if not exists public.company_chat_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists company_chat_messages_company_created_idx
  on public.company_chat_messages(company_id, created_at);

alter table public.company_chat_messages enable row level security;

drop policy if exists company_chat_messages_select_members on public.company_chat_messages;
create policy company_chat_messages_select_members
  on public.company_chat_messages for select to authenticated
  using (private.is_company_member(company_id));

drop policy if exists company_chat_messages_insert_members on public.company_chat_messages;
create policy company_chat_messages_insert_members
  on public.company_chat_messages for insert to authenticated
  with check (private.is_company_member(company_id) and sender_id=(select auth.uid()));

grant select, insert on public.company_chat_messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='company_chat_messages'
  ) then
    alter publication supabase_realtime add table public.company_chat_messages;
  end if;
end$$;
