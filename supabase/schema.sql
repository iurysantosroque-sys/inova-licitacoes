-- INOVA Licitações — bootstrap do schema atual (Supabase/Postgres)
-- Para projetos novos. Em produção existente, use somente migrations revisadas.
create extension if not exists pgcrypto;
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text, email text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.companies (
  id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 160),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'member' check(role in ('admin','member')),
  created_at timestamptz not null default now(), primary key(company_id,user_id)
);
create table public.pricing_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  tax_percent numeric not null default 6 check(tax_percent between 0 and 99),
  target_margin_percent numeric not null default 25 check(target_margin_percent between 0 and 99),
  opportunity_margin_percent numeric not null default 15 check(opportunity_margin_percent between 0 and 99),
  minimum_profit_amount numeric not null default 500 check(minimum_profit_amount>=0),
  minimum_margin_percent numeric not null default 10 check(minimum_margin_percent between 0 and 99),
  operational_reserve_percent numeric not null default 0 check(operational_reserve_percent between 0 and 99),
  updated_at timestamptz not null default now(),
  check(tax_percent+operational_reserve_percent+target_margin_percent<100),
  check(tax_percent+operational_reserve_percent+minimum_margin_percent<100)
);
create table public.tenders (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  number text not null, process_number text, agency text, city text, state text, platform text, object text,
  dispute_at timestamptz, status text not null default 'preparacao', is_quoted boolean not null default false, pncp_control text, source_url text,
  publication_at timestamptz, proposal_open_at timestamptz, proposal_end_at timestamptz,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,company_id)
);
create table public.tender_items (
  id uuid primary key default gen_random_uuid(), tender_id uuid not null references public.tenders(id) on delete cascade,
  item_number integer not null check(item_number>0), description text not null, quantity numeric not null check(quantity>0),
  unit text, estimated_unit_price numeric check(estimated_unit_price is null or estimated_unit_price>=0),
  package_quantity numeric check(package_quantity is null or package_quantity>0), notes text, created_at timestamptz not null default now(), unique(tender_id,item_number)
);
create table public.suppliers (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, cnpj text, contact_name text, phone text, email text, freight_notes text,
  minimum_order numeric not null default 0 check(minimum_order>=0), default_freight_amount numeric not null default 0 check(default_freight_amount>=0),
  delivery_days integer check(delivery_days is null or delivery_days>=0), created_at timestamptz not null default now()
);
create table public.quotes (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  tender_id uuid references public.tenders(id) on delete cascade, supplier_id uuid not null references public.suppliers(id) on delete cascade,
  source_filename text, source_type text, status text not null default 'manual', validity_date date,
  freight_amount numeric not null default 0 check(freight_amount>=0), storage_path text, ai_error text,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.quote_items (
  id uuid primary key default gen_random_uuid(), quote_id uuid not null references public.quotes(id) on delete cascade,
  tender_item_id uuid references public.tender_items(id) on delete set null, supplier_description text not null,
  brand text, model text, package_description text, package_base_quantity numeric not null default 1 check(package_base_quantity>0),
  unit_price numeric not null check(unit_price>0), available_quantity numeric check(available_quantity is null or available_quantity>=0), freight_per_package numeric not null default 0 check(freight_per_package>=0),
  ai_match_confidence numeric check(ai_match_confidence is null or ai_match_confidence between 0 and 1),
  needs_review boolean not null default false, created_at timestamptz not null default now()
);
create table public.tender_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tender_id uuid not null,
  file_name text not null check(length(trim(file_name)) between 1 and 255),
  mime_type text not null check(mime_type in ('application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  file_size bigint not null check(file_size between 1 and 26214400),
  storage_path text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tender_id),
  foreign key(tender_id,company_id) references public.tenders(id,company_id) on delete cascade,
  check(
    split_part(storage_path,'/',1)=company_id::text and
    split_part(storage_path,'/',2)=tender_id::text and
    split_part(storage_path,'/',3)<>''
  )
);
create table public.qualification_documents (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  tender_id uuid, document_series_id uuid not null default gen_random_uuid(), version integer not null default 1 check(version>0),
  document_type text not null check(length(trim(document_type)) between 1 and 120), name text not null check(length(trim(name)) between 1 and 180),
  issuer text not null check(length(trim(issuer)) between 1 and 160), document_number text check(document_number is null or length(trim(document_number)) between 1 and 100),
  issued_on date not null, expires_on date, has_no_expiry boolean not null default false,
  coverage text check(coverage is null or length(trim(coverage)) between 1 and 180), notes text check(notes is null or length(notes)<=1200),
  file_name text not null check(length(trim(file_name)) between 1 and 255), mime_type text not null default 'application/pdf' check(mime_type='application/pdf'),
  file_size bigint not null check(file_size between 1 and 26214400), storage_path text not null unique,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique(id,company_id), unique(document_series_id,version),
  foreign key(tender_id,company_id) references public.tenders(id,company_id) on delete restrict,
  check((has_no_expiry and expires_on is null) or (not has_no_expiry and expires_on is not null and expires_on>=issued_on)),
  check(split_part(storage_path,'/',1)=company_id::text and split_part(storage_path,'/',2)=document_series_id::text and split_part(storage_path,'/',3)<>'')
);

create index companies_created_by_idx on public.companies(created_by);
create index company_members_user_id_idx on public.company_members(user_id);
create index tenders_company_id_idx on public.tenders(company_id);
create index tenders_created_by_idx on public.tenders(created_by);
create index tender_items_tender_id_idx on public.tender_items(tender_id);
create index suppliers_company_id_idx on public.suppliers(company_id);
create index quotes_company_id_idx on public.quotes(company_id);
create index quotes_tender_id_idx on public.quotes(tender_id);
create index quotes_supplier_id_idx on public.quotes(supplier_id);
create index quotes_created_by_idx on public.quotes(created_by);
create index quote_items_quote_id_idx on public.quote_items(quote_id);
create index quote_items_tender_item_id_idx on public.quote_items(tender_item_id);
create index tender_documents_company_id_idx on public.tender_documents(company_id);
create index tender_documents_tender_company_idx on public.tender_documents(tender_id,company_id);
create index tender_documents_created_by_idx on public.tender_documents(created_by);
create index qualification_documents_company_id_idx on public.qualification_documents(company_id);
create index qualification_documents_tender_id_idx on public.qualification_documents(tender_id) where tender_id is not null;
create index qualification_documents_expiry_idx on public.qualification_documents(company_id,expires_on) where expires_on is not null;
create index qualification_documents_series_idx on public.qualification_documents(document_series_id,version desc);
create index qualification_documents_tender_company_idx on public.qualification_documents(tender_id,company_id);
create index qualification_documents_created_by_idx on public.qualification_documents(created_by);

create function private.is_company_member(target_company_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.company_members where company_id=target_company_id and user_id=(select auth.uid()));
$$;
create function private.is_company_admin(target_company_id uuid, target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.company_members
    where company_id=target_company_id and user_id=target_user_id and role='admin'
  );
$$;
create function private.users_share_company(target_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select target_user_id=(select auth.uid()) or exists(
    select 1 from public.company_members mine join public.company_members theirs on theirs.company_id=mine.company_id
    where mine.user_id=(select auth.uid()) and theirs.user_id=target_user_id
  );
$$;
create function private.enforce_quote_company()
returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from public.suppliers where id=new.supplier_id and company_id=new.company_id) then raise exception 'Fornecedor não pertence à empresa da cotação'; end if;
  if new.tender_id is not null and not exists(select 1 from public.tenders where id=new.tender_id and company_id=new.company_id) then raise exception 'Licitação não pertence à empresa da cotação'; end if;
  return new;
end;$$;
create trigger enforce_quote_company_trigger before insert or update of company_id,tender_id,supplier_id on public.quotes for each row execute function private.enforce_quote_company();
create function private.enforce_quote_item_tender()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.tender_item_id is not null and not exists(
    select 1 from public.quotes q join public.tender_items ti on ti.id=new.tender_item_id where q.id=new.quote_id and q.tender_id=ti.tender_id
  ) then raise exception 'Item não pertence à licitação da cotação'; end if;
  return new;
end;$$;
create trigger enforce_quote_item_tender_trigger before insert or update of quote_id,tender_item_id on public.quote_items for each row execute function private.enforce_quote_item_tender();

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,name,email) values(new.id,coalesce(new.raw_user_meta_data->>'nome',split_part(new.email,'@',1)),new.email)
  on conflict(id) do update set email=excluded.email,updated_at=now(); return new;
end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.create_company_with_owner(p_name text)
returns table(company_id uuid,invite_code text) language plpgsql security definer set search_path='' as $$
declare c public.companies;
begin
  if (select auth.uid()) is null then raise exception 'Usuário não autenticado'; end if;
  if exists(select 1 from public.company_members where user_id=(select auth.uid())) then raise exception 'Usuário já pertence a uma empresa'; end if;
  if length(trim(p_name))<2 then raise exception 'Informe o nome da empresa'; end if;
  insert into public.companies(name,created_by) values(trim(p_name),(select auth.uid())) returning * into c;
  insert into public.company_members(company_id,user_id,role) values(c.id,(select auth.uid()),'admin');
  insert into public.pricing_settings(company_id) values(c.id);
  return query select c.id,c.invite_code;
end;$$;
create function public.join_company_by_invite(p_invite_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
  if (select auth.uid()) is null then raise exception 'Usuário não autenticado'; end if;
  if exists(select 1 from public.company_members where user_id=(select auth.uid())) then raise exception 'Usuário já pertence a uma empresa'; end if;
  select id into cid from public.companies where upper(invite_code)=upper(trim(p_invite_code));
  if cid is null then raise exception 'Código de convite inválido'; end if;
  insert into public.company_members(company_id,user_id,role) values(cid,(select auth.uid()),'member'); return cid;
end;$$;

create function public.get_pricing_map()
returns table(item_id uuid,tender_id uuid,tender_number text,item_number integer,description text,quantity numeric,unit text,supplier_id uuid,supplier_name text,package_description text,package_base_quantity numeric,package_price numeric,freight_total numeric,freight_unit numeric,product_unit_cost numeric,real_unit_cost numeric,estimated_unit_price numeric,tax_percent numeric,operational_reserve_percent numeric,target_margin_percent numeric,minimum_margin_percent numeric,minimum_profit_amount numeric,target_bid numeric,minimum_bid numeric,break_even_bid numeric,profit_at_estimated numeric,margin_at_estimated_percent numeric,difference_to_target numeric,difference_to_minimum numeric,status text,recommendation text)
language sql stable security invoker set search_path='' as $$
with member_companies as (
  select company_id from public.company_members where user_id=(select auth.uid())
), candidates as (
  select ti.id item_id,t.id tender_id,t.number tender_number,ti.item_number,ti.description,ti.quantity,ti.unit,
    q.supplier_id,s.name supplier_name,qi.package_description,qi.package_base_quantity,qi.unit_price package_price,
    case when qi.id is null then null when qi.freight_per_package>0 then ceil(ti.quantity/greatest(qi.package_base_quantity,0.0001))*qi.freight_per_package when coalesce(q.freight_amount,0)>0 then q.freight_amount else coalesce(s.default_freight_amount,0) end freight_total,
    case when qi.id is null then null else qi.unit_price/greatest(qi.package_base_quantity,0.0001) end product_unit_cost,
    ti.estimated_unit_price,ps.tax_percent,ps.operational_reserve_percent,ps.target_margin_percent,ps.minimum_margin_percent,ps.minimum_profit_amount
  from member_companies mc join public.tenders t on t.company_id=mc.company_id
  join public.tender_items ti on ti.tender_id=t.id join public.pricing_settings ps on ps.company_id=t.company_id
  left join public.quote_items qi on qi.tender_item_id=ti.id
  left join public.quotes q on q.id=qi.quote_id and q.company_id=t.company_id and q.tender_id=t.id
  left join public.suppliers s on s.id=q.supplier_id and s.company_id=t.company_id
), costed as (
  select *,case when freight_total is null then null else freight_total/greatest(quantity,0.0001) end freight_unit,
    case when product_unit_cost is null then null else product_unit_cost+coalesce(freight_total,0)/greatest(quantity,0.0001) end real_unit_cost
  from candidates
), ranked as (
  select *,row_number() over(partition by item_id order by real_unit_cost asc nulls last) cost_rank from costed
), best as (
  select *,(tax_percent+operational_reserve_percent)/100 overhead from ranked where cost_rank=1
), priced as (
  select *,case when real_unit_cost is null then null else real_unit_cost/greatest(1-overhead-target_margin_percent/100,0.01) end target_bid,
    case when real_unit_cost is null then null else greatest(real_unit_cost/greatest(1-overhead-minimum_margin_percent/100,0.01),(real_unit_cost+minimum_profit_amount/greatest(quantity,0.0001))/greatest(1-overhead,0.01)) end minimum_bid,
    case when real_unit_cost is null then null else real_unit_cost/greatest(1-overhead,0.01) end break_even_bid
  from best
)
select item_id,tender_id,tender_number,item_number,description,quantity,unit,supplier_id,supplier_name,package_description,package_base_quantity,package_price,freight_total,freight_unit,product_unit_cost,real_unit_cost,estimated_unit_price,tax_percent,operational_reserve_percent,target_margin_percent,minimum_margin_percent,minimum_profit_amount,target_bid,minimum_bid,break_even_bid,
  case when estimated_unit_price is null or real_unit_cost is null then null else (estimated_unit_price*(1-overhead)-real_unit_cost)*quantity end,
  case when coalesce(estimated_unit_price,0)=0 or real_unit_cost is null then null else ((estimated_unit_price*(1-overhead)-real_unit_cost)/estimated_unit_price)*100 end,
  estimated_unit_price-target_bid,estimated_unit_price-minimum_bid,
  case when supplier_id is null then 'Sem cotação' when estimated_unit_price is null then 'Sem estimado' when estimated_unit_price<minimum_bid then 'Ruim' when estimated_unit_price<target_bid then 'Oportunidade' else 'Excelente' end,
  case when supplier_id is null then 'Cadastre uma cotação' when estimated_unit_price is null then 'Informe o valor estimado' when estimated_unit_price<minimum_bid then 'Não participar abaixo do mínimo' when estimated_unit_price<target_bid then 'Participar com cautela' else 'Boa oportunidade' end
from priced;
$$;

alter table public.profiles enable row level security; alter table public.companies enable row level security;
alter table public.company_members enable row level security; alter table public.pricing_settings enable row level security;
alter table public.tenders enable row level security; alter table public.tender_items enable row level security;
alter table public.suppliers enable row level security; alter table public.quotes enable row level security; alter table public.quote_items enable row level security;
alter table public.tender_documents enable row level security;
alter table public.qualification_documents enable row level security;
create policy profiles_select_company on public.profiles for select to authenticated using(private.users_share_company(id));
create policy profiles_insert_self on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy companies_select_members on public.companies for select to authenticated using(private.is_company_member(id));
create policy members_select_company on public.company_members for select to authenticated using(private.is_company_member(company_id));
create policy settings_all_members on public.pricing_settings for all to authenticated using(private.is_company_member(company_id)) with check(private.is_company_member(company_id));
create policy tenders_all_members on public.tenders for all to authenticated using(private.is_company_member(company_id)) with check(private.is_company_member(company_id));
create policy items_all_members on public.tender_items for all to authenticated using(exists(select 1 from public.tenders where id=tender_id and private.is_company_member(company_id))) with check(exists(select 1 from public.tenders where id=tender_id and private.is_company_member(company_id)));
create policy suppliers_all_members on public.suppliers for all to authenticated using(private.is_company_member(company_id)) with check(private.is_company_member(company_id));
create policy quotes_all_members on public.quotes for all to authenticated using(private.is_company_member(company_id)) with check(private.is_company_member(company_id));
create policy quote_items_all_members on public.quote_items for all to authenticated using(exists(select 1 from public.quotes where id=quote_id and private.is_company_member(company_id))) with check(exists(select 1 from public.quotes where id=quote_id and private.is_company_member(company_id)));
create policy tender_documents_select_members on public.tender_documents for select to authenticated using(private.is_company_member(company_id));
create policy tender_documents_insert_admins on public.tender_documents for insert to authenticated with check(private.is_company_admin(company_id) and created_by=(select auth.uid()));
create policy tender_documents_update_admins on public.tender_documents for update to authenticated using(private.is_company_admin(company_id)) with check(private.is_company_admin(company_id) and created_by=(select auth.uid()));
create policy tender_documents_delete_admins on public.tender_documents for delete to authenticated using(private.is_company_admin(company_id));
create policy qualification_documents_select_members on public.qualification_documents for select to authenticated using(private.is_company_member(company_id));
create policy qualification_documents_insert_admins on public.qualification_documents for insert to authenticated with check(private.is_company_admin(company_id) and created_by=(select auth.uid()));
create policy qualification_documents_delete_admins on public.qualification_documents for delete to authenticated using(private.is_company_admin(company_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('quote-files','quote-files',false,26214400,array['application/pdf','text/csv','application/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('tender-files','tender-files',false,26214400,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('qualification-files','qualification-files',false,26214400,array['application/pdf']);
create policy quote_files_select_company on storage.objects for select to authenticated using(bucket_id='quote-files' and private.is_company_member(((storage.foldername(name))[1])::uuid));
create policy quote_files_insert_company on storage.objects for insert to authenticated with check(bucket_id='quote-files' and private.is_company_member(((storage.foldername(name))[1])::uuid));
create policy quote_files_delete_company on storage.objects for delete to authenticated using(bucket_id='quote-files' and private.is_company_member(((storage.foldername(name))[1])::uuid));
create policy tender_files_select_members on storage.objects for select to authenticated using(
  bucket_id='tender-files' and exists(
    select 1 from public.tender_documents td
    where td.storage_path=name
      and td.company_id::text=split_part(name,'/',1)
      and td.tender_id::text=split_part(name,'/',2)
      and private.is_company_member(td.company_id)
  )
);
create policy tender_files_insert_admins on storage.objects for insert to authenticated with check(
  bucket_id='tender-files'
  and split_part(name,'/',1) ~ '^[0-9a-f-]{36}$'
  and split_part(name,'/',2) ~ '^[0-9a-f-]{36}$'
  and lower(storage.extension(name)) in ('pdf','doc','docx')
  and private.is_company_admin(split_part(name,'/',1)::uuid)
  and exists(
    select 1 from public.tenders t
    where t.company_id=split_part(name,'/',1)::uuid and t.id=split_part(name,'/',2)::uuid
  )
);
create policy tender_files_delete_admins on storage.objects for delete to authenticated using(
  bucket_id='tender-files'
  and split_part(name,'/',1) ~ '^[0-9a-f-]{36}$'
  and private.is_company_admin(split_part(name,'/',1)::uuid)
);
create policy qualification_files_select_members on storage.objects for select to authenticated using(
  bucket_id='qualification-files' and exists(
    select 1 from public.qualification_documents qd
    where qd.storage_path=name and qd.company_id::text=split_part(name,'/',1)
      and qd.document_series_id::text=split_part(name,'/',2) and private.is_company_member(qd.company_id)
  )
);
create policy qualification_files_insert_admins on storage.objects for insert to authenticated with check(
  bucket_id='qualification-files' and split_part(name,'/',1) ~ '^[0-9a-f-]{36}$'
  and split_part(name,'/',2) ~ '^[0-9a-f-]{36}$' and split_part(name,'/',3)<>''
  and lower(storage.extension(name))='pdf' and private.is_company_admin(split_part(name,'/',1)::uuid)
);
create policy qualification_files_delete_admins on storage.objects for delete to authenticated using(
  bucket_id='qualification-files' and split_part(name,'/',1) ~ '^[0-9a-f-]{36}$'
  and private.is_company_admin(split_part(name,'/',1)::uuid)
);

revoke all on all tables in schema public from anon;
grant usage on schema public,private to authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,insert,update,delete on public.pricing_settings,public.tenders,public.tender_items,public.suppliers,public.quotes,public.quote_items,public.tender_documents to authenticated;
grant select,insert,delete on public.qualification_documents to authenticated;
grant select on public.companies,public.company_members to authenticated;
revoke all on function private.enforce_quote_company(),private.enforce_quote_item_tender(),public.handle_new_user() from public,anon,authenticated;
revoke all on function private.is_company_member(uuid),private.is_company_admin(uuid,uuid),private.users_share_company(uuid) from public,anon;
revoke all on function public.create_company_with_owner(text),public.join_company_by_invite(text),public.get_pricing_map() from public,anon;
grant execute on function public.create_company_with_owner(text),public.join_company_by_invite(text),public.get_pricing_map(),private.is_company_member(uuid),private.is_company_admin(uuid,uuid),private.users_share_company(uuid) to authenticated;
