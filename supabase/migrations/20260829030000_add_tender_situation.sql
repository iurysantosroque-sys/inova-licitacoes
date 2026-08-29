alter table public.tenders
  add column if not exists tender_situation text not null default 'aguardando_disputa';

alter table public.tenders
  drop constraint if exists tenders_tender_situation_check;

alter table public.tenders
  add constraint tenders_tender_situation_check
  check (tender_situation in ('aguardando_disputa','aguardando_habilitacao','em_disputa','vencida','perdida','em_entrega','finalizada'));

comment on column public.tenders.tender_situation is
  'Situação operacional manual da licitação.';
