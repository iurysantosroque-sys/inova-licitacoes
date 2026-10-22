begin;

insert into auth.users(id,aud,role,email,raw_user_meta_data,raw_app_meta_data) values
 ('f1000000-0000-4000-8000-000000000001','authenticated','authenticated','inova-docs-qa-a@example.invalid','{"name":"QA Docs A"}','{}'),
 ('f1000000-0000-4000-8000-000000000002','authenticated','authenticated','inova-docs-qa-b@example.invalid','{"name":"QA Docs B"}','{}');
insert into public.companies(id,name,created_by) values
 ('f2000000-0000-4000-8000-000000000001','QA Docs Empresa A','f1000000-0000-4000-8000-000000000001'),
 ('f2000000-0000-4000-8000-000000000002','QA Docs Empresa B','f1000000-0000-4000-8000-000000000002');
insert into public.company_members(company_id,user_id,role) values
 ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','member'),
 ('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','member');
insert into public.tenders(id,company_id,number,agency,created_by) values
 ('f3000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002','QA','QA fictício','f1000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.inova_docs_save('f4000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002',0,'{"title":"QA B","category":"mensagens","type":"E-mail institucional","status":"rascunho","content":{"context":{},"text":"QA empresa B"}}');
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.inova_docs_save('f4000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001',0,'{"title":"QA A","category":"mensagens","type":"E-mail institucional","status":"rascunho","content":{"context":{},"text":"QA empresa A"}}');
select public.inova_docs_save('f4000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001',1,'{"title":"QA A revisado","category":"mensagens","type":"E-mail institucional","status":"em_revisao","content":{"context":{},"text":"QA revisão 2"}}');
do $qa$
begin
 if (select count(*) from public.inova_docs_documents where company_id='f2000000-0000-4000-8000-000000000002')<>0 then raise exception 'FAIL isolamento';end if;
 if (select count(*) from public.inova_docs_versions where document_id='f4000000-0000-4000-8000-000000000001')<>2 then raise exception 'FAIL versões';end if;
 if (select count(*) from public.inova_docs_events where document_id='f4000000-0000-4000-8000-000000000001')<>2 then raise exception 'FAIL eventos';end if;
 begin
 perform public.inova_docs_save('f4000000-0000-4000-8000-000000000003','f2000000-0000-4000-8000-000000000001',0,'{"title":"QA FK","category":"mensagens","type":"Teste","status":"rascunho","tender_id":"f3000000-0000-4000-8000-000000000002","content":{}}');
 raise exception 'FAIL FK cruzada' using errcode='XX000';
 exception when foreign_key_violation then null;end;
 begin
 perform public.inova_docs_save('f4000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001',1,'{"title":"QA concorrente","category":"mensagens","type":"Teste","status":"rascunho","content":{}}');
 raise exception 'FAIL concorrência' using errcode='XX000';
 exception when serialization_failure then null;end;
 begin
 perform public.inova_docs_save('f4000000-0000-4000-8000-000000000004','f2000000-0000-4000-8000-000000000001',0,'{"title":"QA envio","category":"mensagens","type":"Teste","status":"enviado","content":{}}');
 raise exception 'FAIL envio sem registro' using errcode='XX000';
 exception when check_violation then null;end;
 if not public.inova_docs_reserve_ai('f4000000-0000-4000-8000-000000000001') then raise exception 'FAIL primeira reserva';end if;
 if public.inova_docs_reserve_ai('f4000000-0000-4000-8000-000000000001') then raise exception 'FAIL cooldown';end if;
 begin
 update public.inova_docs_ai_usage set requests=0;
 raise exception 'FAIL quota editável' using errcode='XX000';
 exception when insufficient_privilege then null;end;
 begin
 update public.inova_docs_versions set revision=50;
 raise exception 'FAIL versão editável' using errcode='XX000';
 exception when insufficient_privilege then null;end;
 begin
 update public.inova_docs_events set action='alterado';
 raise exception 'FAIL evento editável' using errcode='XX000';
 exception when insufficient_privilege then null;end;
end $qa$;
reset role;
insert into public.inova_docs_roles(company_id,user_id,role) values ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','viewer');
set local role authenticated;
do $qa$
begin
 if public.inova_docs_can_write('f2000000-0000-4000-8000-000000000001') then raise exception 'FAIL viewer escrita';end if;
 begin
 perform public.inova_docs_reserve_ai('f4000000-0000-4000-8000-000000000001');
 raise exception 'FAIL viewer IA' using errcode='XX000';
 exception when raise_exception then null;end;
end $qa$;
select 'PASS: isolamento, FK, versões, eventos, concorrência, envio, cooldown, quota e viewer' as qa_result;
rollback;
