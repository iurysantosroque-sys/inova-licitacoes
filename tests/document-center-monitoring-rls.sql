-- Exclusivamente no PostgreSQL local descartável do harness, sob BEGIN/ROLLBACK.
insert into auth.users(id,email) values('a7000000-0000-4000-8000-000000000001','monitor-a@example.invalid'),('a7000000-0000-4000-8000-000000000002','monitor-b@example.invalid'),('a7000000-0000-4000-8000-000000000003','monitor-viewer@example.invalid');
insert into public.companies(id,name,created_by) values('b7000000-0000-4000-8000-000000000001','Empresa fictícia monitor A','a7000000-0000-4000-8000-000000000001'),('b7000000-0000-4000-8000-000000000002','Empresa fictícia monitor B','a7000000-0000-4000-8000-000000000002');
insert into public.company_members(company_id,user_id,role) values('b7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','admin'),('b7000000-0000-4000-8000-000000000002','a7000000-0000-4000-8000-000000000002','admin'),('b7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000003','member');
select set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select public.central_save_profile('b7000000-0000-4000-8000-000000000002','{"name":"Empresa fictícia B","cnpj":"11.222.333/0001-81","address":"Endereço exclusivamente de teste","city":"Cidade fictícia","state":"PB","representative_name":"Responsável fictício","representative_position":"Teste"}');
select public.central_configure_monitoring('b7000000-0000-4000-8000-000000000002','fgts',true);
reset role;
select set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.central_save_profile('b7000000-0000-4000-8000-000000000001','{"name":"Empresa fictícia A","cnpj":"11.222.333/0001-81","address":"Endereço exclusivamente de teste","city":"Cidade fictícia","state":"PB","representative_name":"Responsável fictício","representative_position":"Teste"}');
select public.central_configure_monitoring('b7000000-0000-4000-8000-000000000001','rfb',true);
do $$declare c public.central_integrations;h jsonb;begin
 select * into c from public.central_integrations where company_id='b7000000-0000-4000-8000-000000000001' and source_id='rfb';
 if not c.daily_checks or c.api_enabled or c.daily_api_authorized or c.billable_authorized_at is not null then raise exception 'FAIL free monitoring requires contract';end if;
 h:=public.central_monitoring_health('b7000000-0000-4000-8000-000000000001');
 if jsonb_array_length(h->'last_internal_runs')<>0 then raise exception 'FAIL scheduled date presented as execution';end if;
 begin perform public.central_monitoring_health('b7000000-0000-4000-8000-000000000002');raise exception 'FAIL health cross tenant' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
end$$;
reset role;
set local role service_role;
select public.central_connector_daily();select public.central_connector_daily();
reset role;
set local role authenticated;
do $$declare n timestamptz;h jsonb;begin
 select next_check_at into n from public.central_integrations where company_id='b7000000-0000-4000-8000-000000000001' and source_id='rfb';
 if n<=now() then raise exception 'FAIL next execution not programmed';end if;
 perform public.central_configure_monitoring('b7000000-0000-4000-8000-000000000001','rfb',true);
 if n is distinct from (select next_check_at from public.central_integrations where company_id='b7000000-0000-4000-8000-000000000001' and source_id='rfb') then raise exception 'FAIL saving unchanged monitoring resets schedule';end if;
 h:=public.central_monitoring_health('b7000000-0000-4000-8000-000000000001');
 if jsonb_array_length(h->'last_internal_runs')<>1 or h->'last_internal_runs'->0->>'source_id'<>'rfb' or h->'last_internal_runs'->0->>'outcome'<>'intervention_required' then raise exception 'FAIL missing actual monitoring task and outcome';end if;
 if (h->'serpro'->>'homologated')::boolean then raise exception 'FAIL internal monitoring is not official verification';end if;
 if exists(select 1 from public.central_connector_tasks where company_id='b7000000-0000-4000-8000-000000000001' and transport='serpro') then raise exception 'FAIL free check enqueued paid operation';end if;
 if (select count(*) from public.central_connector_tasks where company_id='b7000000-0000-4000-8000-000000000001' and origin='daily')<>1 then raise exception 'FAIL duplicate daily check';end if;
 perform public.central_configure_monitoring('b7000000-0000-4000-8000-000000000001','rfb',false);
 if (select next_check_at from public.central_integrations where company_id='b7000000-0000-4000-8000-000000000001' and source_id='rfb') is not null then raise exception 'FAIL disabled check retained schedule';end if;
end$$;
reset role;
-- Contrato fictício: verifica preservação das autorizações já existentes, sem rede.
set local role authenticated;
select public.central_configure_connector('b7000000-0000-4000-8000-000000000001','rfb',false,true,true,'Contrato fictício exclusivamente QA',true);
reset role;
update public.central_integrations set verified_at=now(),status='official_found' where company_id='b7000000-0000-4000-8000-000000000001';
select set_config('monitor.qa_paid_snapshot',(select (to_jsonb(i)-'daily_checks'-'next_check_at')::text from public.central_integrations i where company_id='b7000000-0000-4000-8000-000000000001' and source_id='rfb'),true);
set local role authenticated;
select public.central_configure_monitoring('b7000000-0000-4000-8000-000000000001','rfb',true);
do $$begin
 if current_setting('monitor.qa_paid_snapshot')::jsonb is distinct from (select to_jsonb(i)-'daily_checks'-'next_check_at' from public.central_integrations i where company_id='b7000000-0000-4000-8000-000000000001' and source_id='rfb') then raise exception 'FAIL monitoring changed paid flags or homologation';end if;
 if (public.central_monitoring_health('b7000000-0000-4000-8000-000000000001')->'serpro'->>'homologated')::boolean then raise exception 'FAIL isolated verified date is not homologation proof';end if;
end$$;
reset role;
-- Apenas o harness local cria cron fictício; nenhuma execução externa ocorre.
create schema cron;
create table cron.job(jobid bigint,jobname text,active boolean,command text);
create table cron.job_run_details(jobid bigint,runid bigint,status text,start_time timestamptz,end_time timestamptz);
insert into cron.job values(1,'inova-central-official-dispatch',true,'MARCADOR-PRIVADO-NAO-RETORNAR'),(2,'inova-central-official-daily',true,'MARCADOR-PRIVADO-NAO-RETORNAR'),(3,'outro-job-privado',true,'MARCADOR-PRIVADO-NAO-RETORNAR');
insert into cron.job_run_details values(1,1,'succeeded',now()-interval '2 seconds',now()-interval '1 second');
select set_config('request.jwt.claims','{"sub":"a7000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
do $$declare h jsonb;begin
 h:=public.central_monitoring_health('b7000000-0000-4000-8000-000000000001');
 if h->'jobs'->'dispatcher'->>'last_status'<>'succeeded' or h->'jobs'->'daily'->>'last_status' is not null then raise exception 'FAIL cron proof invented';end if;
 if h::text like '%MARCADOR-PRIVADO%' or h::text like '%11222333000181%' or h::text like '%outro-job%' or (h->>'automatic_transport_ready')::boolean then raise exception 'FAIL private data leaked or paid transport invented';end if;
 begin perform public.central_configure_monitoring('b7000000-0000-4000-8000-000000000001','rfb',false);raise exception 'FAIL viewer reconfigured monitoring' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
end$$;
reset role;
-- Falhas do scanner não podem ser mascaradas como sucesso do agendador.
create or replace function public.central_connector_daily() returns integer language plpgsql security definer set search_path='' as $$begin raise exception 'FALHA FICTICIA DO SCANNER';end$$;
do $$begin
 begin perform private.central_dispatch_official_worker();raise exception 'FAIL scanner error swallowed' using errcode='XX000';exception when sqlstate 'P0001' then if SQLERRM<>'FALHA FICTICIA DO SCANNER' then raise;end if;end;
end$$;
select 'PASS: persisted free monitoring, proven execution, next schedule, health scope and paid isolation' as result;
