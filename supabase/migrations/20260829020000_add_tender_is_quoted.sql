alter table public.tenders
  add column if not exists is_quoted boolean not null default false;

comment on column public.tenders.is_quoted is
  'Marcação manual para indicar que a licitação já foi cotada.';
