-- Índices de apoio às chaves estrangeiras da documentação privada.

create index if not exists tender_documents_tender_company_idx
  on public.tender_documents(tender_id,company_id);

create index if not exists tender_documents_created_by_idx
  on public.tender_documents(created_by);

create index if not exists qualification_documents_tender_company_idx
  on public.qualification_documents(tender_id,company_id);

create index if not exists qualification_documents_created_by_idx
  on public.qualification_documents(created_by);

