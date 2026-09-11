-- Catálogo de itens cotados: cada item de cotação gera um registro com validade fixa de 20 dias.
create table public.quoted_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  source_quote_item_id uuid not null unique references public.quote_items(id) on delete cascade,
  tender_id uuid references public.tenders(id) on delete set null,
  tender_item_id uuid references public.tender_items(id) on delete set null,
  product_name text not null check(length(trim(product_name)) between 1 and 1800),
  unit text,
  quoted_quantity numeric check(quoted_quantity is null or quoted_quantity >= 0),
  package_base_quantity numeric not null default 1 check(package_base_quantity > 0),
  unit_price numeric not null check(unit_price > 0),
  source_filename text,
  quoted_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check(expires_at = quoted_at + interval '20 days')
);

create index quoted_products_company_expiry_idx on public.quoted_products(company_id, expires_at);
create index quoted_products_supplier_expiry_idx on public.quoted_products(supplier_id, expires_at);
create index quoted_products_quote_idx on public.quoted_products(quote_id);

alter table public.quoted_products enable row level security;
revoke all on table public.quoted_products from anon, authenticated;
grant select on table public.quoted_products to authenticated;

create policy quoted_products_select_company
on public.quoted_products for select to authenticated
using ((select private.is_company_member(company_id)));

create or replace function private.sync_quoted_product_from_quote_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quoted public.quotes;
  tender_item public.tender_items;
begin
  select * into quoted from public.quotes where id = new.quote_id;
  if quoted.id is null then
    raise exception 'Cotação não encontrada para o item cotado';
  end if;

  if (select auth.uid()) is not null and not private.is_company_member(quoted.company_id) then
    raise exception 'Sem acesso à empresa da cotação';
  end if;

  select * into tender_item from public.tender_items where id = new.tender_item_id;

  insert into public.quoted_products (
    company_id, supplier_id, quote_id, source_quote_item_id, tender_id, tender_item_id,
    product_name, unit, quoted_quantity, package_base_quantity, unit_price, source_filename,
    quoted_at, expires_at
  ) values (
    quoted.company_id, quoted.supplier_id, quoted.id, new.id, quoted.tender_id, new.tender_item_id,
    new.supplier_description, coalesce(tender_item.unit, ''), coalesce(new.available_quantity, tender_item.quantity),
    new.package_base_quantity, new.unit_price, quoted.source_filename,
    quoted.created_at, quoted.created_at + interval '20 days'
  )
  on conflict (source_quote_item_id) do update set
    supplier_id = excluded.supplier_id,
    quote_id = excluded.quote_id,
    tender_id = excluded.tender_id,
    tender_item_id = excluded.tender_item_id,
    product_name = excluded.product_name,
    unit = excluded.unit,
    quoted_quantity = excluded.quoted_quantity,
    package_base_quantity = excluded.package_base_quantity,
    unit_price = excluded.unit_price,
    source_filename = excluded.source_filename,
    quoted_at = excluded.quoted_at,
    expires_at = excluded.expires_at;

  return new;
end;
$$;

revoke execute on function private.sync_quoted_product_from_quote_item() from public;

create trigger sync_quoted_product_after_quote_item
after insert or update of quote_id, tender_item_id, supplier_description, available_quantity, package_base_quantity, unit_price
on public.quote_items
for each row execute function private.sync_quoted_product_from_quote_item();

insert into public.quoted_products (
  company_id, supplier_id, quote_id, source_quote_item_id, tender_id, tender_item_id,
  product_name, unit, quoted_quantity, package_base_quantity, unit_price, source_filename,
  quoted_at, expires_at
)
select
  q.company_id, q.supplier_id, q.id, qi.id, q.tender_id, qi.tender_item_id,
  qi.supplier_description, coalesce(ti.unit, ''), coalesce(qi.available_quantity, ti.quantity),
  qi.package_base_quantity, qi.unit_price, q.source_filename,
  q.created_at, q.created_at + interval '20 days'
from public.quote_items qi
join public.quotes q on q.id = qi.quote_id
left join public.tender_items ti on ti.id = qi.tender_item_id
on conflict (source_quote_item_id) do nothing;
