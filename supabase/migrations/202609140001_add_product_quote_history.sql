create table public.company_quote_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  quote_validity_days integer not null default 20 check (quote_validity_days between 1 and 365),
  updated_at timestamptz not null default now()
);
create table public.catalog_products (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, normalized_name text not null, normalized_unit text, specification_fingerprint text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,specification_fingerprint)
);
create table public.quote_price_snapshots (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid references public.catalog_products(id) on delete set null, supplier_id uuid not null references public.suppliers(id) on delete restrict,
  quote_id uuid, source_quote_item_id uuid unique, tender_id uuid references public.tenders(id) on delete set null, tender_item_id uuid references public.tender_items(id) on delete set null,
  original_name text not null, original_description text, original_unit text, normalized_unit text, original_quantity numeric, unit_price numeric not null check(unit_price>0), total_price numeric,
  brand text, package_description text, source_filename text, source_storage_path text, quoted_at timestamptz not null, expires_at timestamptz not null,
  validity_days_snapshot integer not null check(validity_days_snapshot between 1 and 365), match_status text not null default 'confirmed' check(match_status in ('confirmed','needs_review')),
  created_at timestamptz not null default now()
);
create index catalog_products_company_name_idx on public.catalog_products(company_id,normalized_name);
create index quote_price_snapshots_active_idx on public.quote_price_snapshots(company_id,product_id,expires_at);
create index quote_price_snapshots_history_idx on public.quote_price_snapshots(company_id,supplier_id,product_id,quoted_at desc);
alter table public.company_quote_settings enable row level security;
alter table public.catalog_products enable row level security;
alter table public.quote_price_snapshots enable row level security;
revoke all on public.company_quote_settings,public.catalog_products,public.quote_price_snapshots from anon,authenticated;
grant select on public.company_quote_settings,public.catalog_products,public.quote_price_snapshots to authenticated;
create policy company_quote_settings_select on public.company_quote_settings for select to authenticated using ((select private.is_company_member(company_id)));
create policy catalog_products_select on public.catalog_products for select to authenticated using ((select private.is_company_member(company_id)));
create policy quote_price_snapshots_select on public.quote_price_snapshots for select to authenticated using ((select private.is_company_member(company_id)));

create or replace function private.normalize_quote_unit(value text) returns text language sql immutable set search_path='' as $$
 select case upper(trim(coalesce(value,'')))
 when 'UN' then 'UN' when 'UND' then 'UN' when 'UNID' then 'UN' when 'UNIDADE' then 'UN'
 when 'CX' then 'CX' when 'CAIXA' then 'CX' when 'PCT' then 'PCT' when 'PACOTE' then 'PCT'
 when 'LT' then 'L' when 'L' then 'L' when 'LITRO' then 'L' when 'LITROS' then 'L'
 when 'KG' then 'KG' when 'QUILOGRAMA' then 'KG' when 'QUILOGRAMAS' then 'KG'
 when 'PAR' then 'PR' when 'PR' then 'PR' else nullif(upper(trim(value)),'') end $$;
create or replace function private.capture_quote_price_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
declare q public.quotes; ti public.tender_items; raw_name text; normalized text; normalized_unit text; fingerprint text; catalog_id uuid; validity integer;
begin
 select * into q from public.quotes where id=new.quote_id; select * into ti from public.tender_items where id=new.tender_item_id;
 raw_name=coalesce(nullif(trim(new.supplier_description),''),ti.description,'Item sem descrição');
 normalized=trim(regexp_replace(regexp_replace(lower(raw_name),'[^a-z0-9]+',' ','g'),'\\s+',' ','g'));
 normalized_unit=private.normalize_quote_unit(ti.unit); fingerprint=normalized||'|'||coalesce(normalized_unit,'');
 select id into catalog_id from public.catalog_products where company_id=q.company_id and specification_fingerprint=fingerprint;
 if catalog_id is null then insert into public.catalog_products(company_id,name,normalized_name,normalized_unit,specification_fingerprint) values(q.company_id,raw_name,normalized,normalized_unit,fingerprint) returning id into catalog_id; end if;
 select quote_validity_days into validity from public.company_quote_settings where company_id=q.company_id; validity=coalesce(validity,20);
 insert into public.quote_price_snapshots(company_id,product_id,supplier_id,quote_id,source_quote_item_id,tender_id,tender_item_id,original_name,original_description,original_unit,normalized_unit,original_quantity,unit_price,total_price,brand,package_description,source_filename,source_storage_path,quoted_at,expires_at,validity_days_snapshot)
 values(q.company_id,catalog_id,q.supplier_id,q.id,new.id,q.tender_id,new.tender_item_id,raw_name,raw_name,ti.unit,normalized_unit,coalesce(new.available_quantity,ti.quantity),new.unit_price,case when coalesce(new.available_quantity,ti.quantity)>0 then new.unit_price*coalesce(new.available_quantity,ti.quantity) end,new.brand,new.package_description,q.source_filename,q.storage_path,q.created_at,q.created_at+(validity * interval '1 day'),validity) on conflict(source_quote_item_id) do nothing;
 return new;
end $$;
revoke execute on function private.normalize_quote_unit(text),private.capture_quote_price_snapshot() from public,anon,authenticated;
create trigger capture_quote_price_snapshot_after_insert after insert on public.quote_items for each row execute function private.capture_quote_price_snapshot();
insert into public.company_quote_settings(company_id) select id from public.companies on conflict(company_id) do nothing;
insert into public.catalog_products(company_id,name,normalized_name,normalized_unit,specification_fingerprint)
select company_id,product_name,trim(regexp_replace(regexp_replace(lower(product_name),'[^a-z0-9]+',' ','g'),'\\s+',' ','g')),private.normalize_quote_unit(unit),trim(regexp_replace(regexp_replace(lower(product_name),'[^a-z0-9]+',' ','g'),'\\s+',' ','g'))||'|'||coalesce(private.normalize_quote_unit(unit),'') from public.quoted_products on conflict(company_id,specification_fingerprint) do nothing;
insert into public.quote_price_snapshots(company_id,product_id,supplier_id,quote_id,source_quote_item_id,tender_id,tender_item_id,original_name,original_description,original_unit,normalized_unit,original_quantity,unit_price,total_price,source_filename,quoted_at,expires_at,validity_days_snapshot)
select qp.company_id,cp.id,qp.supplier_id,qp.quote_id,qp.source_quote_item_id,qp.tender_id,qp.tender_item_id,qp.product_name,qp.product_name,qp.unit,private.normalize_quote_unit(qp.unit),qp.quoted_quantity,qp.unit_price,case when qp.quoted_quantity>0 then qp.unit_price*qp.quoted_quantity end,qp.source_filename,qp.quoted_at,qp.expires_at,20 from public.quoted_products qp join public.catalog_products cp on cp.company_id=qp.company_id and cp.specification_fingerprint=trim(regexp_replace(regexp_replace(lower(qp.product_name),'[^a-z0-9]+',' ','g'),'\\s+',' ','g'))||'|'||coalesce(private.normalize_quote_unit(qp.unit),'') on conflict(source_quote_item_id) do nothing;
