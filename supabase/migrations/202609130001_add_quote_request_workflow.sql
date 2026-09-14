-- Solicitações de cotação são separadas da cotação recebida: o status do PDF
-- continua técnico, enquanto este fluxo acompanha prazo e retorno comercial.
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  due_at timestamptz not null,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quote_request_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','sent','partial','received','cancelled')),
  due_at timestamptz,
  sent_at timestamptz,
  last_reminder_at timestamptz,
  reminder_count integer not null default 0 check (reminder_count >= 0),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(request_id,supplier_id)
);

create table public.quote_request_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  tender_item_id uuid not null references public.tender_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(request_id,tender_item_id)
);

create index quote_requests_company_tender_idx on public.quote_requests(company_id,tender_id,created_at desc);
create index quote_request_suppliers_company_status_idx on public.quote_request_suppliers(company_id,status,due_at);
create index quote_request_items_company_request_idx on public.quote_request_items(company_id,request_id);

create or replace function private.enforce_quote_request_supplier_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  request_company uuid;
  supplier_company uuid;
begin
  select company_id into request_company from public.quote_requests where id = new.request_id;
  select company_id into supplier_company from public.suppliers where id = new.supplier_id;
  if request_company is null or supplier_company is null or new.company_id <> request_company or new.company_id <> supplier_company then
    raise exception 'Fornecedor e solicitação devem pertencer à mesma empresa';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_quote_request_item_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  request_company uuid;
  request_tender uuid;
  item_tender uuid;
begin
  select company_id,tender_id into request_company,request_tender from public.quote_requests where id = new.request_id;
  select tender_id into item_tender from public.tender_items where id = new.tender_item_id;
  if request_company is null or new.company_id <> request_company or item_tender is null or item_tender <> request_tender then
    raise exception 'Item deve pertencer ao edital e empresa da solicitação';
  end if;
  return new;
end;
$$;

create trigger enforce_quote_request_supplier_integrity_trigger
before insert or update of company_id,request_id,supplier_id on public.quote_request_suppliers
for each row execute function private.enforce_quote_request_supplier_integrity();

create trigger enforce_quote_request_item_integrity_trigger
before insert or update of company_id,request_id,tender_item_id on public.quote_request_items
for each row execute function private.enforce_quote_request_item_integrity();

-- Um item com preço salvo após o envio da solicitação atualiza somente o
-- fornecedor e edital correspondentes. PDFs ainda em revisão não fecham a solicitação.
create or replace function private.sync_quote_request_response_from_quote_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_tender uuid;
  quote_supplier uuid;
begin
  select tender_id,supplier_id into quote_tender,quote_supplier
  from public.quotes
  where id = coalesce(new.quote_id,old.quote_id);

  if quote_tender is null or quote_supplier is null then
    return coalesce(new,old);
  end if;

  with coverage as (
    select
      request_supplier.id,
      count(request_item.id) as requested_count,
      count(distinct quote_item.tender_item_id) filter (where quote_item.id is not null and quote_item.unit_price > 0) as answered_count
    from public.quote_request_suppliers request_supplier
    join public.quote_requests request on request.id = request_supplier.request_id
    left join public.quote_request_items request_item on request_item.request_id = request.id
    left join public.quotes quote on quote.company_id = request.company_id
      and quote.tender_id = request.tender_id
      and quote.supplier_id = request_supplier.supplier_id
      and quote.created_at >= coalesce(request_supplier.sent_at,request.created_at)
    left join public.quote_items quote_item on quote_item.quote_id = quote.id
      and quote_item.tender_item_id = request_item.tender_item_id
      and quote_item.unit_price > 0
    where request.status = 'open'
      and request.tender_id = quote_tender
      and request_supplier.supplier_id = quote_supplier
      and request_supplier.status in ('sent','partial','received')
    group by request_supplier.id
  )
  update public.quote_request_suppliers request_supplier
  set
    status = case
      when coverage.requested_count > 0 and coverage.answered_count >= coverage.requested_count then 'received'
      when coverage.answered_count > 0 then 'partial'
      else 'sent'
    end,
    responded_at = case when coverage.answered_count > 0 then coalesce(request_supplier.responded_at,now()) else request_supplier.responded_at end,
    updated_at = now()
  from coverage
  where request_supplier.id = coverage.id;

  return coalesce(new,old);
end;
$$;

create trigger sync_quote_request_response_after_quote_item
after insert or update of quote_id,tender_item_id,unit_price or delete on public.quote_items
for each row execute function private.sync_quote_request_response_from_quote_item();

alter table public.quote_requests enable row level security;
alter table public.quote_request_suppliers enable row level security;
alter table public.quote_request_items enable row level security;

revoke all on public.quote_requests,public.quote_request_suppliers,public.quote_request_items from anon,authenticated;
grant select,insert,update,delete on public.quote_requests,public.quote_request_suppliers,public.quote_request_items to authenticated;

create policy quote_requests_select_company on public.quote_requests for select to authenticated
using ((select private.is_company_member(company_id)));
create policy quote_requests_insert_company on public.quote_requests for insert to authenticated
with check ((select private.is_company_member(company_id)) and created_by = (select auth.uid()));
create policy quote_requests_update_company on public.quote_requests for update to authenticated
using ((select private.is_company_member(company_id)))
with check ((select private.is_company_member(company_id)));
create policy quote_requests_delete_admin on public.quote_requests for delete to authenticated
using ((select private.is_company_admin(company_id,auth.uid())));

create policy quote_request_suppliers_all_members on public.quote_request_suppliers for all to authenticated
using ((select private.is_company_member(company_id)))
with check ((select private.is_company_member(company_id)));
create policy quote_request_items_all_members on public.quote_request_items for all to authenticated
using ((select private.is_company_member(company_id)))
with check ((select private.is_company_member(company_id)));

revoke all on function private.enforce_quote_request_supplier_integrity(),private.enforce_quote_request_item_integrity(),private.sync_quote_request_response_from_quote_item() from public,anon,authenticated;
