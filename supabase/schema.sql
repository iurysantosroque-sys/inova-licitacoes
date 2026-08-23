-- INOVA Licitações V1 - Supabase/Postgres
-- Execute este arquivo inteiro no SQL Editor de um projeto Supabase novo.

create extension if not exists pgcrypto;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_convite text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete set null,
  nome text,
  papel text not null default 'usuario' check (papel in ('admin','usuario')),
  created_at timestamptz not null default now()
);

create table if not exists public.configuracoes (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  imposto numeric not null default 6,
  margem_alvo numeric not null default 25,
  lucro_minimo numeric not null default 500,
  margem_minima numeric not null default 10,
  reserva_operacional numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.licitacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  numero text not null,
  orgao text not null,
  cidade text,
  data date,
  horario time,
  plataforma text,
  objeto text,
  pncp_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  licitacao_id uuid not null references public.licitacoes(id) on delete cascade,
  numero int not null,
  descricao text not null,
  quantidade numeric not null,
  unidade text not null,
  valor_estimado numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(licitacao_id,numero)
);

create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  cnpj text,
  contato text,
  frete_padrao numeric not null default 0,
  pedido_minimo numeric not null default 0,
  prazo_dias int,
  created_at timestamptz not null default now()
);

create table if not exists public.cotacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  item_id uuid not null references public.itens(id) on delete cascade,
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  preco numeric not null,
  apresentacao text,
  fator_equivalencia numeric not null default 1 check (fator_equivalencia > 0),
  frete_rateado numeric not null default 0,
  marca text,
  confianca_ia numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  licitacao_id uuid references public.licitacoes(id) on delete cascade,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  tipo text not null default 'cotacao',
  nome_arquivo text not null,
  storage_path text not null,
  status text not null default 'enviado',
  resultado_ia jsonb,
  created_at timestamptz not null default now()
);

-- Cria perfil vazio quando uma conta é criada.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.perfis(id,nome) values(new.id, coalesce(new.raw_user_meta_data->>'nome',new.email))
  on conflict(id) do nothing;
  return new;
end;$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.meu_empresa_id()
returns uuid language sql stable security definer set search_path=public as $$
  select empresa_id from public.perfis where id=auth.uid();
$$;

create or replace function public.criar_empresa(p_nome text,p_nome_usuario text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_empresa public.empresas;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
  if exists(select 1 from public.perfis where id=auth.uid() and empresa_id is not null) then raise exception 'Usuário já pertence a uma empresa'; end if;
  insert into public.empresas(nome,created_by) values(trim(p_nome),auth.uid()) returning * into v_empresa;
  update public.perfis set empresa_id=v_empresa.id,nome=coalesce(nullif(trim(p_nome_usuario),''),nome),papel='admin' where id=auth.uid();
  insert into public.configuracoes(empresa_id) values(v_empresa.id) on conflict do nothing;
  return jsonb_build_object('id',v_empresa.id,'nome',v_empresa.nome,'codigo_convite',v_empresa.codigo_convite);
end;$$;

create or replace function public.entrar_empresa(p_codigo text,p_nome_usuario text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_empresa_id uuid;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
  if exists(select 1 from public.perfis where id=auth.uid() and empresa_id is not null) then raise exception 'Usuário já pertence a uma empresa'; end if;
  select id into v_empresa_id from public.empresas where upper(codigo_convite)=upper(trim(p_codigo));
  if v_empresa_id is null then raise exception 'Código de convite inválido'; end if;
  update public.perfis set empresa_id=v_empresa_id,nome=coalesce(nullif(trim(p_nome_usuario),''),nome),papel='usuario' where id=auth.uid();
  return v_empresa_id;
end;$$;

-- RLS
alter table public.empresas enable row level security;
alter table public.perfis enable row level security;
alter table public.configuracoes enable row level security;
alter table public.licitacoes enable row level security;
alter table public.itens enable row level security;
alter table public.fornecedores enable row level security;
alter table public.cotacoes enable row level security;
alter table public.documentos enable row level security;

create policy "empresa membros leem empresa" on public.empresas for select to authenticated using (id=public.meu_empresa_id());
create policy "membros leem perfis" on public.perfis for select to authenticated using (empresa_id=public.meu_empresa_id() or id=auth.uid());

create policy "config membros select" on public.configuracoes for select to authenticated using (empresa_id=public.meu_empresa_id());
create policy "config membros insert" on public.configuracoes for insert to authenticated with check (empresa_id=public.meu_empresa_id());
create policy "config membros update" on public.configuracoes for update to authenticated using (empresa_id=public.meu_empresa_id()) with check (empresa_id=public.meu_empresa_id());

create policy "licitacoes membros select" on public.licitacoes for select to authenticated using (empresa_id=public.meu_empresa_id());
create policy "licitacoes membros insert" on public.licitacoes for insert to authenticated with check (empresa_id=public.meu_empresa_id());
create policy "licitacoes membros update" on public.licitacoes for update to authenticated using (empresa_id=public.meu_empresa_id()) with check (empresa_id=public.meu_empresa_id());
create policy "licitacoes membros delete" on public.licitacoes for delete to authenticated using (empresa_id=public.meu_empresa_id());

create policy "itens membros select" on public.itens for select to authenticated using (empresa_id=public.meu_empresa_id());
create policy "itens membros insert" on public.itens for insert to authenticated with check (empresa_id=public.meu_empresa_id());
create policy "itens membros update" on public.itens for update to authenticated using (empresa_id=public.meu_empresa_id()) with check (empresa_id=public.meu_empresa_id());
create policy "itens membros delete" on public.itens for delete to authenticated using (empresa_id=public.meu_empresa_id());

create policy "fornecedores membros select" on public.fornecedores for select to authenticated using (empresa_id=public.meu_empresa_id());
create policy "fornecedores membros insert" on public.fornecedores for insert to authenticated with check (empresa_id=public.meu_empresa_id());
create policy "fornecedores membros update" on public.fornecedores for update to authenticated using (empresa_id=public.meu_empresa_id()) with check (empresa_id=public.meu_empresa_id());
create policy "fornecedores membros delete" on public.fornecedores for delete to authenticated using (empresa_id=public.meu_empresa_id());

create policy "cotacoes membros select" on public.cotacoes for select to authenticated using (empresa_id=public.meu_empresa_id());
create policy "cotacoes membros insert" on public.cotacoes for insert to authenticated with check (empresa_id=public.meu_empresa_id());
create policy "cotacoes membros update" on public.cotacoes for update to authenticated using (empresa_id=public.meu_empresa_id()) with check (empresa_id=public.meu_empresa_id());
create policy "cotacoes membros delete" on public.cotacoes for delete to authenticated using (empresa_id=public.meu_empresa_id());

create policy "documentos membros select" on public.documentos for select to authenticated using (empresa_id=public.meu_empresa_id());
create policy "documentos membros insert" on public.documentos for insert to authenticated with check (empresa_id=public.meu_empresa_id());
create policy "documentos membros update" on public.documentos for update to authenticated using (empresa_id=public.meu_empresa_id()) with check (empresa_id=public.meu_empresa_id());
create policy "documentos membros delete" on public.documentos for delete to authenticated using (empresa_id=public.meu_empresa_id());

-- Bucket privado para PDFs/planilhas.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('licitacoes','licitacoes',false,26214400,array['application/pdf','text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do nothing;

create policy "storage membros select" on storage.objects for select to authenticated using (bucket_id='licitacoes' and (storage.foldername(name))[1]=public.meu_empresa_id()::text);
create policy "storage membros insert" on storage.objects for insert to authenticated with check (bucket_id='licitacoes' and (storage.foldername(name))[1]=public.meu_empresa_id()::text);
create policy "storage membros delete" on storage.objects for delete to authenticated using (bucket_id='licitacoes' and (storage.foldername(name))[1]=public.meu_empresa_id()::text);

grant execute on function public.criar_empresa(text,text) to authenticated;
grant execute on function public.entrar_empresa(text,text) to authenticated;
grant execute on function public.meu_empresa_id() to authenticated;
