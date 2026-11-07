begin;
create schema inova_sso;
revoke all on schema inova_sso from public, anon, authenticated;
create table inova_sso.links (
  central_user uuid primary key,
  local_user uuid not null unique references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  revoked_before timestamptz not null default '-infinity'
);
create table inova_sso.grants (
  code_hash text primary key check (code_hash ~ '^[A-Za-z0-9_-]{43}$'),
  challenge text not null check (challenge ~ '^[A-Za-z0-9_-]{43}$'),
  central_user uuid not null,
  central_session uuid not null,
  central_started_at timestamptz not null,
  expires_at timestamptz not null,
  local_user uuid references auth.users(id) on delete cascade
);
create table inova_sso.leases (
  local_session uuid primary key references auth.sessions(id) on delete cascade,
  central_user uuid not null references inova_sso.links on delete cascade,
  central_session uuid not null,
  central_started_at timestamptz not null,
  expires_at timestamptz not null
);
create index on inova_sso.grants (central_user);
create index on inova_sso.leases (central_user);
alter table inova_sso.links enable row level security;
alter table inova_sso.grants enable row level security;
alter table inova_sso.leases enable row level security;
revoke all on all tables in schema inova_sso from public, anon, authenticated;
create table inova_sso.events (
  at timestamptz not null default now(), central_user uuid not null,
  local_user uuid not null, event text not null check (event in ('linked','unlinked','admitted','revoked'))
);
alter table inova_sso.events enable row level security;
revoke all on inova_sso.events from public, anon, authenticated;
create function inova_sso.audit_link() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from inova_sso.grants where central_user=old.central_user;
    insert into inova_sso.events(central_user,local_user,event) values(old.central_user,old.local_user,'unlinked');
    return old;
  end if;
  insert into inova_sso.events(central_user,local_user,event) values(new.central_user,new.local_user,'linked');
  return new;
end $$;
revoke all on function inova_sso.audit_link() from public, anon, authenticated;
create trigger sso_link_audit after insert or delete on inova_sso.links for each row execute function inova_sso.audit_link();

-- Self-service pairing is a temporary, explicitly enabled rollout mode.
create table inova_sso.settings (
  singleton boolean primary key check(singleton),
  require_sso boolean not null,
  pairing_enabled boolean not null default false
);
insert into inova_sso.settings(singleton,require_sso) values(true,false);
alter table inova_sso.settings enable row level security;
revoke all on inova_sso.settings from public,anon,authenticated;

create function public.inova_sso_issue(p_hash text, p_challenge text, p_central_user uuid, p_central_session uuid, p_started_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare binding inova_sso.links;
begin
  perform pg_advisory_xact_lock(hashtextextended('inova-sso:'||p_central_user::text,0));
  select * into binding from inova_sso.links where central_user=p_central_user;
  if not found then
    if not exists (select 1 from inova_sso.settings where singleton and pairing_enabled) then return false; end if;
  elsif p_started_at <= binding.revoked_before then
    return false;
  end if;
  delete from inova_sso.grants where central_user=p_central_user and expires_at <= now();
  if (select count(*) from inova_sso.grants where central_user=p_central_user) >= 8 then return false; end if;
  insert into inova_sso.grants(code_hash,challenge,central_user,central_session,central_started_at,expires_at,local_user)
  values(p_hash,p_challenge,p_central_user,p_central_session,p_started_at,
    now()+case when binding.local_user is null then interval '5 minutes' else interval '60 seconds' end,
    binding.local_user);
  return true;
end $$;
create function public.inova_sso_take(p_hash text, p_challenge text)
returns table(central_user uuid, central_session uuid, central_started_at timestamptz, local_user uuid, email text)
language sql security definer set search_path = '' as $$
  with claimed as (
    delete from inova_sso.grants g where g.code_hash=p_hash and g.challenge=p_challenge and g.expires_at > now()
      and g.local_user is not null
    returning *
  )
  select g.central_user,g.central_session,g.central_started_at,l.local_user,u.email::text
  from claimed g join inova_sso.links l on l.central_user=g.central_user and l.local_user=g.local_user
  join auth.users u on u.id=l.local_user
  where g.central_started_at > l.revoked_before and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until <= now())
    and not exists (select 1 from auth.mfa_factors f where f.user_id=u.id and f.status='verified')
$$;

create function public.inova_sso_pair_intent(p_hash text,p_challenge text)
returns table(central_user uuid,central_session uuid,central_started_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.central_user,g.central_session,g.central_started_at
  from inova_sso.grants g
  where g.code_hash=p_hash and g.challenge=p_challenge and g.expires_at>now() and g.local_user is null
    and exists (select 1 from inova_sso.settings where singleton and pairing_enabled)
    and not exists (select 1 from inova_sso.links l where l.central_user=g.central_user)
$$;

create function public.inova_sso_pair(p_hash text,p_challenge text,p_central_user uuid,p_started_at timestamptz,p_local_user uuid,p_local_session uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('inova-sso:'||p_central_user::text,0));
  perform 1 from inova_sso.grants g
    where g.code_hash=p_hash and g.challenge=p_challenge and g.expires_at>now() and g.local_user is null
      and g.central_user=p_central_user and g.central_started_at=p_started_at
    for update;
  if not found or not exists (select 1 from inova_sso.settings where singleton and pairing_enabled) then return false; end if;

  -- The broker has verified the target JWT with Auth. Require a fresh native
  -- session and an existing membership. The link never writes roles or members.
  if not exists (
    select 1 from auth.sessions s join auth.users u on u.id=s.user_id
    where s.id=p_local_session and s.user_id=p_local_user
      and s.created_at>now()-interval '5 minutes' and (s.not_after is null or s.not_after>now())
      and u.email is not null and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until<=now())
      and exists (select 1 from public.company_members m where m.user_id=u.id)
      and not exists (select 1 from auth.mfa_factors f where f.user_id=u.id and f.status='verified')
  ) then return false; end if;

  insert into inova_sso.links(central_user,local_user) values(p_central_user,p_local_user) on conflict do nothing;
  if not found then return false; end if;
  update inova_sso.grants set local_user=p_local_user,expires_at=least(expires_at,now()+interval '60 seconds')
    where code_hash=p_hash;
  return true;
end $$;
revoke all on function public.inova_sso_pair_intent(text,text),
  public.inova_sso_pair(text,text,uuid,timestamptz,uuid,uuid) from public,anon,authenticated;
grant execute on function public.inova_sso_pair_intent(text,text),
  public.inova_sso_pair(text,text,uuid,timestamptz,uuid,uuid) to service_role;

create function public.inova_sso_admit(p_local_user uuid,p_local_session uuid,p_central_user uuid,p_central_session uuid,p_started_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare binding inova_sso.links;
  first_admission boolean;
begin
  select * into binding from inova_sso.links where central_user=p_central_user for update;
  if not found or binding.local_user <> p_local_user or p_started_at <= binding.revoked_before
    or not exists (select 1 from auth.sessions s where s.id=p_local_session and s.user_id=p_local_user)
    or exists (select 1 from auth.mfa_factors f where f.user_id=p_local_user and f.status='verified')
  then return false; end if;
  first_admission := not exists (select 1 from inova_sso.leases where local_session=p_local_session);
  insert into inova_sso.leases values(p_local_session,p_central_user,p_central_session,p_started_at,now()+interval '60 seconds')
  on conflict (local_session) do update set expires_at=excluded.expires_at
    where inova_sso.leases.central_user=excluded.central_user and inova_sso.leases.central_session=excluded.central_session;
  if not found then return false; end if;
  if first_admission then
    insert into inova_sso.events(central_user,local_user,event) values(p_central_user,p_local_user,'admitted');
  end if;
  return true;
end $$;
create function public.inova_sso_lease(p_local_user uuid,p_local_session uuid)
returns table(central_user uuid,central_session uuid,central_started_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.central_user,s.central_session,s.central_started_at
  from inova_sso.leases s join inova_sso.links l on l.central_user=s.central_user
  where l.local_user=p_local_user and s.local_session=p_local_session and s.central_started_at>l.revoked_before
    and s.expires_at > now()
$$;
create function public.inova_sso_revoke(p_central_user uuid,p_cutoff timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare target_user uuid;
begin
  if p_cutoff is null or abs(extract(epoch from (now()-p_cutoff)))>60 then raise exception 'Prazo inválido'; end if;
  perform pg_advisory_xact_lock(hashtextextended('inova-sso:'||p_central_user::text,0));
  delete from inova_sso.grants where central_user=p_central_user and central_started_at<=p_cutoff;
  update inova_sso.links set revoked_before=greatest(revoked_before,p_cutoff)
    where central_user=p_central_user returning local_user into target_user;
  if target_user is null then return; end if;
  delete from inova_sso.leases where central_user=p_central_user and central_started_at<=p_cutoff;
  insert into inova_sso.events(central_user,local_user,event) values(p_central_user,target_user,'revoked');
end $$;
revoke all on function public.inova_sso_issue(text,text,uuid,uuid,timestamptz),public.inova_sso_take(text,text),
  public.inova_sso_admit(uuid,uuid,uuid,uuid,timestamptz),public.inova_sso_lease(uuid,uuid),public.inova_sso_revoke(uuid,timestamptz)
from public,anon,authenticated;
grant execute on function public.inova_sso_issue(text,text,uuid,uuid,timestamptz),public.inova_sso_take(text,text),
  public.inova_sso_admit(uuid,uuid,uuid,uuid,timestamptz),public.inova_sso_lease(uuid,uuid),public.inova_sso_revoke(uuid,timestamptz)
to service_role;

-- Legacy accounts may continue during migration. Linked UUIDs always need a
-- live SSO lease. The final cutover setting requires all admitted users to link.
create function public.inova_sso_allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and coalesce((
    select exists (
      select 1 from inova_sso.leases s join auth.sessions a on a.id=s.local_session
      join auth.users u on u.id=a.user_id
      where s.central_user=l.central_user and a.user_id=l.local_user
        and s.local_session::text=auth.jwt()->>'session_id'
        and s.central_started_at>l.revoked_before and s.expires_at>now()
        and (a.not_after is null or a.not_after>now())
        and (u.banned_until is null or u.banned_until<=now())
        and not exists (select 1 from auth.mfa_factors f where f.user_id=u.id and f.status='verified')
    ) from inova_sso.links l where l.local_user=auth.uid()
  ), (select not require_sso from inova_sso.settings where singleton), false)
$$;
revoke all on function public.inova_sso_allowed() from public,anon;
grant execute on function public.inova_sso_allowed() to authenticated;
create function public.inova_sso_pre_request() returns void
language plpgsql stable set search_path = '' as $$
begin
  if current_user='authenticated' and not public.inova_sso_allowed() then
    raise sqlstate 'PT401' using message='Sessão INOVA expirada';
  end if;
end $$;
revoke all on function public.inova_sso_pre_request() from public;
grant execute on function public.inova_sso_pre_request() to anon,authenticated,service_role;
do $$
declare t record;
begin
  if exists(select 1 from pg_db_role_setting s cross join lateral unnest(s.setconfig) k
    where (s.setrole=0 or s.setrole='authenticator'::regrole) and k like 'pgrst.db_pre_request=%')
    or nullif(current_setting('pgrst.db_pre_request',true),'') is not null then
    raise exception 'Integre o pre-request existente antes de aplicar SSO';
  end if;
  for t in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relrowsecurity and c.relkind in ('r','p')
      and (n.nspname='public' or (n.nspname='storage' and c.relname='objects'))
  loop
    execute format('create policy inova_sso_lease on %I.%I as restrictive for all to authenticated using ((select public.inova_sso_allowed())) with check ((select public.inova_sso_allowed()))',t.nspname,t.relname);
  end loop;
end $$;

-- Private chat authorization keeps the existing company boundary for typing events.
create function public.inova_sso_chat_topic(p_topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.inova_sso_allowed() and exists (
    select 1 from public.company_members m where m.user_id=auth.uid()
      and p_topic='company-chat-'||m.company_id::text
  )
$$;
revoke all on function public.inova_sso_chat_topic(text) from public,anon;
grant execute on function public.inova_sso_chat_topic(text) to authenticated;
create policy inova_sso_chat_read on realtime.messages for select to authenticated
  using (extension='broadcast' and public.inova_sso_chat_topic((select realtime.topic())));
create policy inova_sso_chat_write on realtime.messages for insert to authenticated
  with check (extension='broadcast' and public.inova_sso_chat_topic((select realtime.topic())));

alter role authenticator set pgrst.db_pre_request='public.inova_sso_pre_request';
notify pgrst,'reload config';
notify pgrst,'reload schema';
commit;
