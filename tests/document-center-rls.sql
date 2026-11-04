-- Executar com a migração na mesma transação de QA. Não deixar fixtures em produção.
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
 ('e1000000-0000-4000-8000-000000000001','authenticated','authenticated','central-a@example.invalid','{}','{}'),
 ('e1000000-0000-4000-8000-000000000002','authenticated','authenticated','central-b@example.invalid','{}','{}'),
 ('e1000000-0000-4000-8000-000000000003','authenticated','authenticated','central-editor@example.invalid','{}','{}'),
 ('e1000000-0000-4000-8000-000000000004','authenticated','authenticated','central-viewer@example.invalid','{}','{}');
insert into public.companies(id,name,created_by) values
 ('e2000000-0000-4000-8000-000000000001','Central QA Fictícia A','e1000000-0000-4000-8000-000000000001'),
 ('e2000000-0000-4000-8000-000000000002','Central QA Fictícia B','e1000000-0000-4000-8000-000000000002');
insert into public.company_members(company_id,user_id,role) values
 ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','admin'),
 ('e2000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000002','admin'),
 ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000003','member'),
 ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000004','member');
insert into public.central_permissions(company_id,user_id,role) values('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000003','editor');
insert into public.tenders(id,company_id,number,agency,created_by) values
 ('e3000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','QA-A','Órgão fictício A','e1000000-0000-4000-8000-000000000001'),
 ('e3000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000002','QA-B','Órgão fictício B','e1000000-0000-4000-8000-000000000002');
insert into storage.objects(bucket_id,name) values
 ('qualification-files','e2000000-0000-4000-8000-000000000001/e4000000-0000-4000-8000-000000000001/qa1.pdf'),
 ('qualification-files','e2000000-0000-4000-8000-000000000001/e4000000-0000-4000-8000-000000000001/qa2.pdf'),
 ('qualification-files','e2000000-0000-4000-8000-000000000002/e4000000-0000-4000-8000-000000000002/qab.pdf');
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select public.central_register_version('e2000000-0000-4000-8000-000000000002','e4000000-0000-4000-8000-000000000002',0,'{"id":"e5000000-0000-4000-8000-000000000002","name":"Documento fictício B","issuer":"Emissor fictício B","central_type_id":"fgts","document_type":"FGTS","issued_on":"2026-01-01","expires_on":"2026-12-31","file_name":"qab.pdf","file_size":100,"storage_path":"e2000000-0000-4000-8000-000000000002/e4000000-0000-4000-8000-000000000002/qab.pdf","sha256":"0000000000000000000000000000000000000000000000000000000000000000","confirmed":true}');
select public.central_save_requirement('e2000000-0000-4000-8000-000000000002','{"tender_id":"e3000000-0000-4000-8000-000000000002","title":"QA exigência B","type_id":"fgts","relevant_date":"2026-11-04","page":1,"clause":"1.1","quote":"Trecho fictício de exigência para teste"}');
select public.central_link_version('e2000000-0000-4000-8000-000000000002',(select id from public.central_tender_requirements where tender_id='e3000000-0000-4000-8000-000000000002'),'e5000000-0000-4000-8000-000000000002');
reset role;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.central_save_profile('e2000000-0000-4000-8000-000000000001','{"name":"Empresa fictícia QA","cnpj":"00.000.000/E08G-12","address":"Rua de Teste, sem uso real","city":"Cidade Fictícia","state":"PB","representative_name":"Representante Fictício","representative_position":"Teste"}');
select public.central_register_version('e2000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001',0,'{"id":"e5000000-0000-4000-8000-000000000001","name":"Documento fictício A","issuer":"Emissor fictício A","central_type_id":"fgts","document_type":"FGTS","issued_on":"2026-01-01","expires_on":"2026-11-05","file_name":"qa1.pdf","file_size":100,"storage_path":"e2000000-0000-4000-8000-000000000001/e4000000-0000-4000-8000-000000000001/qa1.pdf","sha256":"0000000000000000000000000000000000000000000000000000000000000000","confirmed":true}');
do $qa$ declare rep uuid;d jsonb;b_requirement uuid;begin
 if (select count(*) from public.qualification_documents where company_id='e2000000-0000-4000-8000-000000000002')<>0 then raise exception 'FAIL tenant certificate';end if;
 if exists(select 1 from storage.objects where name like 'e2000000-0000-4000-8000-000000000002/%') then raise exception 'FAIL tenant storage';end if;
 -- Arquivo retido não pode ser removido por um administrador usando a Data API.
 begin delete from storage.objects where name='e2000000-0000-4000-8000-000000000001/e4000000-0000-4000-8000-000000000001/qa1.pdf';exception when insufficient_privilege then null;end;
 if not exists(select 1 from storage.objects where name='e2000000-0000-4000-8000-000000000001/e4000000-0000-4000-8000-000000000001/qa1.pdf') then raise exception 'FAIL retained storage';end if;
 begin delete from public.qualification_documents where id='e5000000-0000-4000-8000-000000000001';raise exception 'FAIL delete version' using errcode='XX000';exception when insufficient_privilege then null;end;
 begin perform public.central_register_version('e2000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001',null,'{}');raise exception 'FAIL NULL expected version' using errcode='XX000';exception when serialization_failure then null;end;
 begin perform public.central_register_version('e2000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000002',0,'{}');raise exception 'FAIL cross series' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 select id into rep from public.central_legal_representatives where company_id='e2000000-0000-4000-8000-000000000001' limit 1;
 d:=public.central_save_declaration('e2000000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001',0,jsonb_build_object('title','QA fictícia','text','Declaração fictícia para teste técnico sem efeitos reais.','tender_id','e3000000-0000-4000-8000-000000000001','model_id','habilitacao','representative_id',rep));
 begin perform public.central_approve_declaration('e2000000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001',1,d->>'sha256','QA',null);raise exception 'FAIL NULL approval' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 begin perform public.central_approve_declaration('e2000000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001',null,null,'QA',true);raise exception 'FAIL NULL revision/hash' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 perform public.central_approve_declaration('e2000000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001',1,d->>'sha256','Responsável QA fictício',true);
 perform public.central_record_package('e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001',jsonb_build_object('declarations',jsonb_build_array(jsonb_build_object('id',d->>'id','revision',1,'text_sha256',d->>'sha256'))));
 perform public.central_save_declaration('e2000000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001',1,jsonb_build_object('title','QA fictícia','text','Texto fictício revisado para teste técnico.','model_id','habilitacao','representative_id',rep));
 if (select state from public.central_generated_declarations where id='e6000000-0000-4000-8000-000000000001')<>'draft' then raise exception 'FAIL approval invalidation';end if;
 begin perform public.central_record_package('e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001',jsonb_build_object('declarations',jsonb_build_array(jsonb_build_object('id',d->>'id','revision',1,'text_sha256',d->>'sha256'))));raise exception 'FAIL stale package approval' using errcode='XX000';exception when sqlstate 'P0001' then null;end;
 if (select count(*) from public.central_declaration_versions where declaration_id='e6000000-0000-4000-8000-000000000001')<>2 then raise exception 'FAIL snapshots';end if;
 begin update public.central_audit_log set action='falsificação';raise exception 'FAIL mutable audit' using errcode='XX000';exception when insufficient_privilege then null;end;
 perform public.central_request_scan('e2000000-0000-4000-8000-000000000001');
 perform public.central_request_scan('e2000000-0000-4000-8000-000000000001');
 if exists(select 1 from public.central_notifications group by company_id,version_id,threshold,channel having count(*)>1) then raise exception 'FAIL alert dedup';end if;
end $qa$;
reset role;
-- Testa ON CONFLICT de vínculo cruzado com ID conhecido sem depender de SELECT de outra empresa.
do $qa$ declare req uuid;begin select id into req from public.central_tender_requirements where company_id='e2000000-0000-4000-8000-000000000002';perform set_config('central.qa_requirement',req::text,true);end$qa$;
set local role authenticated;
do $qa$begin begin perform public.central_link_version('e2000000-0000-4000-8000-000000000001',current_setting('central.qa_requirement')::uuid,'e5000000-0000-4000-8000-000000000002');raise exception 'FAIL cross conflict link' using errcode='XX000';exception when sqlstate 'P0001' then null;end;end$qa$;
reset role;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
do $qa$begin if not public.central_can('e2000000-0000-4000-8000-000000000001','write') or public.central_can('e2000000-0000-4000-8000-000000000001','review') then raise exception 'FAIL editor role';end if;begin perform public.central_approve_declaration('e2000000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001',2,'bad','QA',true);raise exception 'FAIL editor approval' using errcode='XX000';exception when sqlstate 'P0001' then null;end;end$qa$;
reset role;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $qa$begin if public.central_can('e2000000-0000-4000-8000-000000000001','write') then raise exception 'FAIL viewer role';end if;begin perform public.central_request_scan('e2000000-0000-4000-8000-000000000001');raise exception 'FAIL viewer execution' using errcode='XX000';exception when sqlstate 'P0001' then null;end;end$qa$;
reset role;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.central_register_version('e2000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001',1,'{"id":"e5000000-0000-4000-8000-000000000003","name":"Renovação fictícia A","issuer":"Emissor fictício A","central_type_id":"fgts","document_type":"FGTS","issued_on":"2026-11-04","expires_on":"2026-12-31","file_name":"qa2.pdf","file_size":100,"storage_path":"e2000000-0000-4000-8000-000000000001/e4000000-0000-4000-8000-000000000001/qa2.pdf","sha256":"0000000000000000000000000000000000000000000000000000000000000000","confirmed":true}');
do $qa$ begin
 if (select count(*) from public.qualification_documents where document_series_id='e4000000-0000-4000-8000-000000000001')<>2 then raise exception 'FAIL renewal history';end if;
 if (select expires_on from public.qualification_documents where id='e5000000-0000-4000-8000-000000000001')<>date '2026-11-05' then raise exception 'FAIL previous validity changed';end if;
 begin perform public.central_register_version('e2000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001',1,'{}');raise exception 'FAIL stale revision' using errcode='XX000';exception when serialization_failure then null;end;
 begin insert into storage.objects(bucket_id,name) values('qualification-files','e2000000-0000-4000-8000-000000000002/e4000000-0000-4000-8000-000000000002/cross.pdf');raise exception 'FAIL cross upload' using errcode='XX000';exception when insufficient_privilege then null;end;
 begin perform public.central_daily_enqueue();raise exception 'FAIL client scheduler' using errcode='XX000';exception when insufficient_privilege then null;end;
 begin perform public.central_process_queue();raise exception 'FAIL client queue' using errcode='XX000';exception when insufficient_privilege then null;end;
 if not public.central_reserve_analysis('e2000000-0000-4000-8000-000000000001') then raise exception 'FAIL analysis first quota';end if;
 if public.central_reserve_analysis('e2000000-0000-4000-8000-000000000001') then raise exception 'FAIL analysis cooldown';end if;
end $qa$;
reset role;
set local role authenticated;
select public.central_set_permission('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000003','reviewer');
reset role;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
do $qa$ declare h text;begin
 select sha256 into h from public.central_generated_declarations where id='e6000000-0000-4000-8000-000000000001';
 perform public.central_approve_declaration('e2000000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001',2,h,'Revisor fictício QA',true);
 if (select state from public.central_generated_declarations where id='e6000000-0000-4000-8000-000000000001')<>'approved' then raise exception 'FAIL reviewer approval';end if;
end $qa$;
reset role;
set local role service_role;
select public.central_daily_enqueue();
select public.central_daily_enqueue();
select public.central_process_queue();
reset role;
do $qa$ begin
 if exists(select 1 from public.central_automation_runs where company_id='e2000000-0000-4000-8000-000000000001' and idempotency_key like 'daily:%' group by company_id,idempotency_key having count(*)>1) then raise exception 'FAIL daily dedup';end if;
 if not exists(select 1 from public.central_automation_runs where company_id='e2000000-0000-4000-8000-000000000001' and idempotency_key like 'daily:%' and state='completed') then raise exception 'FAIL queue execution';end if;
end $qa$;
-- O chamador deve executar ROLLBACK ao terminar, inclusive em erro.
