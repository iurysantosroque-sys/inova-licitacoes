-- Fixtures exclusivamente locais, sob BEGIN/ROLLBACK do harness. Nunca representam certidões reais.
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
 ('f1000000-0000-4000-8000-000000000001','authenticated','authenticated','official-admin-a@example.invalid','{}','{}'),
 ('f1000000-0000-4000-8000-000000000002','authenticated','authenticated','official-admin-b@example.invalid','{}','{}'),
 ('f1000000-0000-4000-8000-000000000003','authenticated','authenticated','official-viewer@example.invalid','{}','{}'),
 ('f1000000-0000-4000-8000-000000000004','authenticated','authenticated','official-editor@example.invalid','{}','{}');
insert into public.companies(id,name,created_by) values('f2000000-0000-4000-8000-000000000001','Empresa fictícia QA A','f1000000-0000-4000-8000-000000000001'),('f2000000-0000-4000-8000-000000000002','Empresa fictícia QA B','f1000000-0000-4000-8000-000000000002');
insert into public.company_members(company_id,user_id,role) values
 ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','admin'),
 ('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','admin'),
 ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000003','member'),
 ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000004','member');
insert into public.central_permissions(company_id,user_id,role) values('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000004','editor');
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$begin begin perform public.central_request_connector('f2000000-0000-4000-8000-000000000002','rfb','consultar');raise exception 'FAIL missing profile' using errcode='XX000';exception when sqlstate 'P0001' then null;end;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.central_save_profile('f2000000-0000-4000-8000-000000000001','{"name":"Empresa fictícia QA","cnpj":"11.222.333/0001-81","address":"Rua fictícia de teste","city":"Cidade fictícia","state":"PB","representative_name":"Responsável fictício QA","representative_position":"Administrador de testes"}');
do $$declare a uuid;b uuid;begin
 a:=public.central_request_connector('f2000000-0000-4000-8000-000000000001','fgts','consultar');b:=public.central_request_connector('f2000000-0000-4000-8000-000000000001','fgts','consultar');
 if a<>b or (select count(*) from public.central_connector_attempts where task_id=a)<>1 then raise exception 'FAIL idempotent assisted';end if;
 if exists(select 1 from public.central_integrations where company_id='f2000000-0000-4000-8000-000000000001' and last_official_at is not null) then raise exception 'FAIL assisted official claim';end if;
 begin perform public.central_configure_connector('f2000000-0000-4000-8000-000000000001','fgts',true,true,true,'Contrato fictício QA',true);raise exception 'FAIL FGTS API enabled' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 begin perform public.central_configure_connector('f2000000-0000-4000-8000-000000000001','rfb',true,true,true,'Contrato fictício QA',false);raise exception 'FAIL missing billable approval' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
end$$;
select public.central_configure_connector('f2000000-0000-4000-8000-000000000001','rfb',true,true,true,'Contrato fictício QA somente teste',true);
select set_config('central.qa_task',public.central_request_connector('f2000000-0000-4000-8000-000000000001','rfb','consultar','serpro',true)::text,true);
reset role;
do $$declare h text;begin
 h:=private.central_profile_hash('f2000000-0000-4000-8000-000000000001');perform set_config('TimeZone','Pacific/Auckland',true);
 if h<>private.central_profile_hash('f2000000-0000-4000-8000-000000000001') then raise exception 'FAIL timezone dependent hash';end if;perform set_config('TimeZone','UTC',true);
 if has_function_privilege('anon','public.central_request_connector(uuid,text,text,text,boolean)','EXECUTE') or has_function_privilege('authenticated','public.central_claim_connector(uuid)','EXECUTE') then raise exception 'FAIL internal grants';end if;
end$$;
set local role service_role;
do $$declare work jsonb;begin
 work:=public.central_claim_connector(current_setting('central.qa_task')::uuid);
 if not (work->>'authorized')::boolean or not (work->>'profile_current')::boolean then raise exception 'FAIL valid claim';end if;
 perform set_config('central.qa_lease',work->'task'->>'lease_token',true);
 if public.central_claim_connector(current_setting('central.qa_task')::uuid) is not null then raise exception 'FAIL duplicate claim';end if;
 begin perform public.central_finish_connector(current_setting('central.qa_task')::uuid,gen_random_uuid(),'failed','Teste');raise exception 'FAIL wrong lease' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 begin perform public.central_finish_connector(current_setting('central.qa_task')::uuid,current_setting('central.qa_lease')::uuid,'official_issued','Teste',null);raise exception 'FAIL no PDF official result' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 perform public.central_finish_connector(current_setting('central.qa_task')::uuid,current_setting('central.qa_lease')::uuid,'configuration_required','Configuração fictícia pendente');
 begin perform public.central_finish_connector(current_setting('central.qa_task')::uuid,current_setting('central.qa_lease')::uuid,'failed','Replay');raise exception 'FAIL replay lease' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 begin perform public.central_request_connector('f2000000-0000-4000-8000-000000000001','rfb','consultar');raise exception 'FAIL viewer' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 begin update public.central_connector_attempts set reason='Alterado';raise exception 'FAIL mutable attempt' using errcode='XX000';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- Credenciais/permissões revogadas após enqueue não podem liberar rede no worker.
do $$declare task uuid;work jsonb;begin
 task:=private.central_enqueue_connector('f2000000-0000-4000-8000-000000000001','rfb','consultar','serpro','user','test:actor-revoked','f1000000-0000-4000-8000-000000000004');
 delete from public.central_permissions where user_id='f1000000-0000-4000-8000-000000000004';
 work:=public.central_claim_connector(task);if (work->>'authorized')::boolean then raise exception 'FAIL revoked actor';end if;
 perform public.central_finish_connector(task,(work->'task'->>'lease_token')::uuid,'failed','Ator revogado no teste');
 task:=private.central_enqueue_connector('f2000000-0000-4000-8000-000000000001','rfb','consultar','serpro','user','test:admin-revoked','f1000000-0000-4000-8000-000000000001');
 update public.company_members set role='member' where user_id='f1000000-0000-4000-8000-000000000001';
 work:=public.central_claim_connector(task);if (work->>'authorized')::boolean then raise exception 'FAIL revoked authorizer';end if;
 perform public.central_finish_connector(task,(work->'task'->>'lease_token')::uuid,'failed','Autorizador revogado no teste');
 update public.company_members set role='admin' where user_id='f1000000-0000-4000-8000-000000000001';
 task:=private.central_enqueue_connector('f2000000-0000-4000-8000-000000000001','rfb','consultar','serpro','user','test:disabled','f1000000-0000-4000-8000-000000000001');
 update public.central_integrations set enabled=false where source_id='rfb';work:=public.central_claim_connector(task);if (work->>'authorized')::boolean then raise exception 'FAIL disabled integration';end if;
 perform public.central_finish_connector(task,(work->'task'->>'lease_token')::uuid,'failed','Integração desativada no teste');update public.central_integrations set enabled=true where source_id='rfb';
 task:=private.central_enqueue_connector('f2000000-0000-4000-8000-000000000001','rfb','consultar','serpro','user','test:profile-changed','f1000000-0000-4000-8000-000000000001');work:=public.central_claim_connector(task);
 update public.central_company_profiles set confirmed_at=confirmed_at+interval '1 second' where company_id='f2000000-0000-4000-8000-000000000001';
 perform public.central_finish_connector(task,(work->'task'->>'lease_token')::uuid,'official_issued','Teste sem promoção',null);
 if not exists(select 1 from public.central_connector_attempts where task_id=task and outcome='profile_changed') then raise exception 'FAIL changed profile';end if;
end$$;
-- Candidato fictício inserido somente para testar a transação e RLS; não contém resultado real.
insert into storage.objects(bucket_id,name) values('qualification-files','f2000000-0000-4000-8000-000000000001/f4000000-0000-4000-8000-000000000001/test-official.pdf');
do $$declare task uuid;work jsonb;a uuid;begin
 task:=private.central_enqueue_connector('f2000000-0000-4000-8000-000000000001','rfb','consultar','serpro','user','test:candidate','f1000000-0000-4000-8000-000000000001');work:=public.central_claim_connector(task);
 a:=public.central_finish_connector(task,(work->'task'->>'lease_token')::uuid,'official_found','Metadados fictícios de QA',jsonb_build_object('series_id','f4000000-0000-4000-8000-000000000001','taxpayer','11222333000181','control_code','FICTICIO-QA','issued_on','2026-11-04','expires_on','2027-05-03','sha256',repeat('1',64),'file_size',100,'certificate_type',1,'storage_path','f2000000-0000-4000-8000-000000000001/f4000000-0000-4000-8000-000000000001/test-official.pdf'));
 perform set_config('central.qa_artifact',a::text,true);
 if exists(select 1 from public.qualification_documents where company_id='f2000000-0000-4000-8000-000000000001') then raise exception 'FAIL candidate auto promotion';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.central_connector_artifacts where company_id='f2000000-0000-4000-8000-000000000001') then raise exception 'FAIL cross tenant candidate';end if;
 begin perform public.central_confirm_official_artifact('f2000000-0000-4000-8000-000000000002',current_setting('central.qa_artifact')::uuid,'f4000000-0000-4000-8000-000000000001',0,true);raise exception 'FAIL cross tenant promotion' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$declare v jsonb;again jsonb;begin
 begin perform public.central_confirm_official_artifact('f2000000-0000-4000-8000-000000000001',current_setting('central.qa_artifact')::uuid,gen_random_uuid(),0,true);raise exception 'FAIL wrong series' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 begin perform public.central_confirm_official_artifact('f2000000-0000-4000-8000-000000000001',current_setting('central.qa_artifact')::uuid,'f4000000-0000-4000-8000-000000000001',0,false);raise exception 'FAIL no human review' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 v:=public.central_confirm_official_artifact('f2000000-0000-4000-8000-000000000001',current_setting('central.qa_artifact')::uuid,'f4000000-0000-4000-8000-000000000001',0,true);
 again:=public.central_confirm_official_artifact('f2000000-0000-4000-8000-000000000001',current_setting('central.qa_artifact')::uuid,'f4000000-0000-4000-8000-000000000001',0,true);
 if v->>'id'<>again->>'id' or (select count(*) from public.qualification_documents where company_id='f2000000-0000-4000-8000-000000000001')<>1 then raise exception 'FAIL duplicate promotion';end if;
 begin perform public.central_validate_version('f2000000-0000-4000-8000-000000000001',(v->>'id')::uuid,'cndt','manual_confirmed','Evidência fictícia de conferência QA');raise exception 'FAIL source mismatch' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 perform public.central_validate_version('f2000000-0000-4000-8000-000000000001',(v->>'id')::uuid,'rfb','manual_confirmed','Conferência fictícia somente teste técnico');
end$$;
reset role;
-- A segunda certidão cria v2; v1 e seus metadados/arquivo continuam disponíveis.
insert into storage.objects(bucket_id,name) values('qualification-files','f2000000-0000-4000-8000-000000000001/f4000000-0000-4000-8000-000000000001/test-renewed.pdf');
do $$declare task uuid;work jsonb;a uuid;v jsonb;begin
 task:=private.central_enqueue_connector('f2000000-0000-4000-8000-000000000001','rfb','consultar','serpro','user','test:renewal','f1000000-0000-4000-8000-000000000001');work:=public.central_claim_connector(task);
 a:=public.central_finish_connector(task,(work->'task'->>'lease_token')::uuid,'official_issued','Renovação fictícia de QA',jsonb_build_object('series_id','f4000000-0000-4000-8000-000000000001','taxpayer','11222333000181','control_code','FICTICIO-QA-2','issued_on','2026-11-04','expires_on','2027-05-04','sha256',repeat('2',64),'file_size',100,'certificate_type',1,'storage_path','f2000000-0000-4000-8000-000000000001/f4000000-0000-4000-8000-000000000001/test-renewed.pdf'));
 if (select count(*) from public.qualification_documents where company_id='f2000000-0000-4000-8000-000000000001')<>1 then raise exception 'FAIL auto renewal promotion';end if;
 v:=public.central_confirm_official_artifact('f2000000-0000-4000-8000-000000000001',a,'f4000000-0000-4000-8000-000000000001',1,true);
 if (v->>'version')::int<>2 then raise exception 'FAIL renewal version';end if;
 if not exists(select 1 from public.qualification_documents where document_series_id='f4000000-0000-4000-8000-000000000001' and version=1 and expires_on=date '2027-05-03' and storage_path like '%/test-official.pdf') then raise exception 'FAIL original renewal history';end if;
 if not exists(select 1 from storage.objects where name='f2000000-0000-4000-8000-000000000001/f4000000-0000-4000-8000-000000000001/test-official.pdf') then raise exception 'FAIL original renewal PDF';end if;
end$$;
do $$declare task uuid;work jsonb;begin
 task:=private.central_enqueue_connector('f2000000-0000-4000-8000-000000000001','rfb','consultar','serpro','user','test:expired-lease','f1000000-0000-4000-8000-000000000001');work:=public.central_claim_connector(task);
 update public.central_connector_tasks set lease_until=now()-interval '1 minute' where id=task;
 begin perform public.central_finish_connector(task,(work->'task'->>'lease_token')::uuid,'failed','Teste');raise exception 'FAIL expired lease' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 perform public.central_connector_daily();perform public.central_connector_daily();
 if not exists(select 1 from public.central_connector_attempts where task_id=task and outcome='uncertain') then raise exception 'FAIL abandoned task';end if;
 if exists(select 1 from public.central_connector_tasks where company_id='f2000000-0000-4000-8000-000000000001' and idempotency_key like 'daily:%' group by company_id,idempotency_key having count(*)>1) then raise exception 'FAIL daily dedup';end if;
 if (select count(*) from public.qualification_documents where company_id='f2000000-0000-4000-8000-000000000001')<>2 then raise exception 'FAIL prior version changed';end if;
 task:=private.central_enqueue_connector('f2000000-0000-4000-8000-000000000001','rfb','consultar','serpro','user','test:missing-dispatcher','f1000000-0000-4000-8000-000000000001');
 if private.central_dispatch_official_worker() is not null then raise exception 'FAIL dispatcher without protected configuration';end if;
 if not exists(select 1 from public.central_connector_tasks where id=task and state='queued' and attempts=0) then raise exception 'FAIL dispatcher consumed unconfigured task';end if;
 if not exists(select 1 from public.central_integrations where company_id='f2000000-0000-4000-8000-000000000001' and source_id='rfb' and status='configuration_required' and last_error like 'Worker agendado%') then raise exception 'FAIL missing dispatcher notice';end if;
end$$;
select 'PASS: official connector SQL guards, idempotency, leases, candidates and tenant isolation' as result;
-- O chamador sempre encerra com ROLLBACK.
