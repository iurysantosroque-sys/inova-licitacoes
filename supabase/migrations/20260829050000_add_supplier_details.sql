alter table public.suppliers
  add column if not exists trade_name text,
  add column if not exists state_uf text;

comment on column public.suppliers.trade_name is 'Nome fantasia informado pela empresa';
comment on column public.suppliers.state_uf is 'UF da sede, preenchida pela consulta de CNPJ';
