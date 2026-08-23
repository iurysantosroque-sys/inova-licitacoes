-- Preparada em 2026-08-23. NÃO aplicada automaticamente.
-- Revise o relatório de Advisors e faça backup antes de aplicar em produção.

do $$
begin
  if exists(select user_id from public.company_members group by user_id having count(*)>1) then
    raise exception 'Migração interrompida: há usuários vinculados a mais de uma empresa';
  end if;
  if not exists(select 1 from pg_constraint where conname='company_members_one_company_per_user') then
    alter table public.company_members add constraint company_members_one_company_per_user unique(user_id);
  end if;
end$$;

create index if not exists companies_created_by_idx on public.companies(created_by);
create index if not exists company_members_user_id_idx on public.company_members(user_id);
create index if not exists quotes_tender_id_idx on public.quotes(tender_id);
create index if not exists quotes_supplier_id_idx on public.quotes(supplier_id);
create index if not exists quotes_created_by_idx on public.quotes(created_by);
create index if not exists tenders_created_by_idx on public.tenders(created_by);
create index if not exists quote_items_tender_item_id_idx on public.quote_items(tender_item_id);

create schema if not exists private;
create or replace function private.enforce_quote_company()
returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from public.suppliers where id=new.supplier_id and company_id=new.company_id) then
    raise exception 'Fornecedor não pertence à empresa da cotação';
  end if;
  if new.tender_id is not null and not exists(select 1 from public.tenders where id=new.tender_id and company_id=new.company_id) then
    raise exception 'Licitação não pertence à empresa da cotação';
  end if;
  return new;
end;$$;

create or replace function private.enforce_quote_item_tender()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.tender_item_id is not null and not exists(
    select 1 from public.quotes q join public.tender_items ti on ti.id=new.tender_item_id
    where q.id=new.quote_id and q.tender_id=ti.tender_id
  ) then raise exception 'Item não pertence à licitação da cotação'; end if;
  return new;
end;$$;

drop trigger if exists enforce_quote_company_trigger on public.quotes;
create trigger enforce_quote_company_trigger before insert or update of company_id,tender_id,supplier_id
on public.quotes for each row execute function private.enforce_quote_company();
drop trigger if exists enforce_quote_item_tender_trigger on public.quote_items;
create trigger enforce_quote_item_tender_trigger before insert or update of quote_id,tender_item_id
on public.quote_items for each row execute function private.enforce_quote_item_tender();

do $$
begin
  if not exists(select 1 from pg_constraint where conname='quote_items_ai_confidence_range') then
    alter table public.quote_items add constraint quote_items_ai_confidence_range
      check(ai_match_confidence is null or ai_match_confidence between 0 and 1) not valid;
  end if;
end$$;
alter table public.quote_items validate constraint quote_items_ai_confidence_range;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='pricing_settings_percent_ranges') then
    alter table public.pricing_settings add constraint pricing_settings_percent_ranges check(
      tax_percent between 0 and 99 and target_margin_percent between 0 and 99 and opportunity_margin_percent between 0 and 99 and
      minimum_margin_percent between 0 and 99 and operational_reserve_percent between 0 and 99 and
      minimum_profit_amount>=0 and tax_percent+operational_reserve_percent+target_margin_percent<100 and
      tax_percent+operational_reserve_percent+minimum_margin_percent<100
    ) not valid;
  end if;
  if not exists(select 1 from pg_constraint where conname='tender_items_positive_values') then
    alter table public.tender_items add constraint tender_items_positive_values check(item_number>0 and quantity>0 and (estimated_unit_price is null or estimated_unit_price>=0) and (package_quantity is null or package_quantity>0)) not valid;
  end if;
  if not exists(select 1 from pg_constraint where conname='suppliers_nonnegative_values') then
    alter table public.suppliers add constraint suppliers_nonnegative_values check(minimum_order>=0 and default_freight_amount>=0 and (delivery_days is null or delivery_days>=0)) not valid;
  end if;
  if not exists(select 1 from pg_constraint where conname='quotes_nonnegative_freight') then
    alter table public.quotes add constraint quotes_nonnegative_freight check(freight_amount>=0) not valid;
  end if;
  if not exists(select 1 from pg_constraint where conname='quote_items_positive_values') then
    alter table public.quote_items add constraint quote_items_positive_values check(package_base_quantity>0 and unit_price>0 and freight_per_package>=0 and (available_quantity is null or available_quantity>=0)) not valid;
  end if;
end$$;
alter table public.pricing_settings validate constraint pricing_settings_percent_ranges;
alter table public.tender_items validate constraint tender_items_positive_values;
alter table public.suppliers validate constraint suppliers_nonnegative_values;
alter table public.quotes validate constraint quotes_nonnegative_freight;
alter table public.quote_items validate constraint quote_items_positive_values;

update storage.buckets set
  public=false,
  file_size_limit=26214400,
  allowed_mime_types=array['application/pdf','text/csv','application/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
where id='quote-files';

revoke all on all tables in schema public from anon;
revoke all on public.profiles,public.companies,public.company_members,public.pricing_settings,public.tenders,public.tender_items,public.suppliers,public.quotes,public.quote_items from authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select on public.companies,public.company_members to authenticated;
grant select,insert,update,delete on public.pricing_settings,public.tenders,public.tender_items,public.suppliers,public.quotes,public.quote_items to authenticated;
revoke all on function private.enforce_quote_company(),private.enforce_quote_item_tender() from public,anon,authenticated;
revoke all on function private.is_company_member(uuid,uuid),private.is_company_admin(uuid,uuid),private.users_share_company(uuid,uuid) from public,anon;
grant execute on function private.is_company_member(uuid,uuid),private.is_company_admin(uuid,uuid),private.users_share_company(uuid,uuid) to authenticated;
revoke execute on function public.get_pricing_map() from public,anon;
grant execute on function public.get_pricing_map() to authenticated;
