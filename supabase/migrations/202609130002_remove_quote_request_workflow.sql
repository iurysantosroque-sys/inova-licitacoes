-- Reverte integralmente o fluxo de solicitações de cotação.
-- Preserva PDFs, cotações, produtos cotados, fornecedores e editais.
begin;

drop trigger if exists sync_quote_request_response_after_quote_item on public.quote_items;

drop table if exists public.quote_request_items;
drop table if exists public.quote_request_suppliers;
drop table if exists public.quote_requests;

drop function if exists private.sync_quote_request_response_from_quote_item();
drop function if exists private.enforce_quote_request_item_integrity();
drop function if exists private.enforce_quote_request_supplier_integrity();

commit;
