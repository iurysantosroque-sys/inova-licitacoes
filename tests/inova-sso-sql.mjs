import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [engine,centralMigration,workspace]=process.argv.slice(2);
if(!engine||!centralMigration||!workspace)throw Error('Informe engine local, migration central e diretório de testes.');
const {default:EmbeddedPostgres}=await import(pathToFileURL(path.resolve(engine)).href);
const dir=path.resolve(workspace,'sso-'+randomUUID());
await mkdir(path.dirname(dir),{recursive:true});
const db=new EmbeddedPostgres({
 databaseDir:dir,user:'postgres',password:randomBytes(32).toString('base64url'),
 port:Number(process.env.INOVA_SQL_TEST_PORT ?? 55487),persistent:true,authMethod:'scram-sha-256',postgresFlags:['-h','127.0.0.1'],
 onLog:()=>{},onError:console.error,
});
const fixture=`
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create role authenticator nologin;
create schema auth; create schema private; create schema storage; create schema realtime;
create table auth.users(id uuid primary key,email varchar(254),email_confirmed_at timestamptz,banned_until timestamptz,raw_app_meta_data jsonb);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users,created_at timestamptz default now(),not_after timestamptz);
create table auth.mfa_factors(user_id uuid,status text);
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')$$;
create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;
create table realtime.messages(extension text);
alter table realtime.messages enable row level security;
create table private.application_users(user_id uuid primary key,username text,credential_version int,active boolean,credential_pending boolean,is_admin boolean default false);
create table private.access_sessions(session_id uuid,user_id uuid,credential_version int);
create table private.access_events(actor_id uuid,target_id uuid,event text);
create function private.require_access_admin() returns void language plpgsql as $$begin raise exception 'admin necessário'; end$$;
create table public.companies(id uuid primary key);
create table public.company_members(user_id uuid,company_id uuid,role text default 'member');
create table public.business_fixture(id int primary key,company_id uuid);
create table storage.objects(name text primary key,company_id uuid);
alter table public.company_members enable row level security;
alter table public.business_fixture enable row level security;
alter table storage.objects enable row level security;
grant usage on schema auth,storage,realtime to authenticated;
grant select on public.company_members,public.business_fixture,storage.objects,realtime.messages to authenticated;
create policy own_company on public.company_members for select to authenticated using(user_id=auth.uid());
create policy business_company on public.business_fixture for select to authenticated using(company_id in (select company_id from public.company_members));
create policy file_company on storage.objects for select to authenticated using(company_id in (select company_id from public.company_members));
`;
let client,started=false,passed=0;
async function check(name,work){await work();passed++;console.log('PASS '+name);}
try{
 await db.initialise();await db.start();started=true;
 client=db.getPgClient('postgres','127.0.0.1');await client.connect();
 const q=(sql,args)=>client.query(sql,args);
 const one=async(sql,args)=>Object.values((await q(sql,args)).rows[0]??{})[0];
 const call=(fn,args)=>one('select public.'+fn+'('+args.map((_,i)=>'$'+(i+1)).join(',')+')',args);
 async function as(user,session,work){
  await q('begin');
  try{
   await q('set local role authenticated');
   await q("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:user,session_id:session,role:'authenticated'})]);
   return await work();
  }finally{await q('rollback');}
 }
 await q(fixture);
 await q(await readFile(new URL('../supabase/migrations/20261107060000_inova_sso_target_sessions.sql',import.meta.url),'utf8'));
 await q(await readFile(centralMigration,'utf8'));
 const [subject,local,other,central,session,legacy,companyA,companyB]=Array.from({length:8},randomUUID);
 for(const user of [subject,local,other])await q("insert into auth.users values($1,$2,now(),null,'{\"inova_password_set\":true}')",[user,user+'@test.invalid']);
 for(const [id,user] of [[central,subject],[session,local],[legacy,other]])await q('insert into auth.sessions(id,user_id) values($1,$2)',[id,user]);
 await q("insert into private.application_users values($1,'titular',1,true,false,true)",[subject]);
 await q('insert into private.access_sessions values($1,$2,1)',[central,subject]);
 await q('insert into public.companies values($1),($2)',[companyA,companyB]);
 await q("insert into public.company_members values($1,$2,'admin'),($3,$4,'member')",[local,companyA,other,companyB]);
 await q('insert into public.business_fixture values(1,$1),(2,$2)',[companyA,companyB]);
 await q("insert into storage.objects values('ficticio-a.pdf',$1),('ficticio-b.pdf',$2)",[companyA,companyB]);
 await q('insert into inova_sso.links(central_user,local_user) values($1,$2)',[subject,local]);
 const begin=await call('inova_sso_central_session',[subject,central]);
 const hash='a'.repeat(43),challenge='b'.repeat(43);
 const grant=[hash,challenge,subject,central,begin],admit=[local,session,subject,central,begin];
 await check('estado central confere UUID, sessão e privilégio de chamada',async()=>{
  assert.ok(begin instanceof Date);
  assert.equal(await call('inova_sso_central_session',[subject,legacy]),null);
  await assert.rejects(as(subject,central,()=>call('inova_sso_central_session',[subject,central])),/permission denied/i);
 });
 await check('conta vinculada bloqueia sessão local sem lease e RPC',()=>as(local,session,async()=>{
  assert.equal(await call('inova_sso_allowed',[]),false);
  await assert.rejects(call('inova_sso_pre_request',[]),{code:'PT401'});
 }));
 await check('grant exige o desafio correto e não aceita replay',async()=>{
  assert.equal(await call('inova_sso_issue',grant),true);
  assert.equal((await q('select * from public.inova_sso_take($1,$2)',[hash,'x'.repeat(43)])).rowCount,0);
  const result=await q('select * from public.inova_sso_take($1,$2)',[hash,challenge]);
  assert.equal(result.rows[0].local_user,local);
  assert.equal((await q('select * from public.inova_sso_take($1,$2)',[hash,challenge])).rowCount,0);
 });
 await check('emissão exige sessão nativa do UUID vinculado',async()=>{
  assert.equal(await call('inova_sso_admit',[other,legacy,subject,central,begin]),false);
  assert.equal(await call('inova_sso_admit',[local,legacy,subject,central,begin]),false);
  assert.equal(await call('inova_sso_admit',admit),true);
 });
 await check('RLS isola os dados, arquivos e tópicos de outra empresa',()=>as(local,session,async()=>{
  assert.equal(await call('inova_sso_allowed',[]),true);
  assert.deepEqual((await q('select id from public.business_fixture')).rows,[{id:1}]);
  assert.deepEqual((await q('select name from storage.objects')).rows,[{name:'ficticio-a.pdf'}]);
  assert.equal(await call('inova_sso_chat_topic',['company-chat-'+companyA]),true);
  assert.equal(await call('inova_sso_chat_topic',['company-chat-'+companyB]),false);
 }));
 await check('conta legada só entra durante a transição',async()=>{
  assert.equal(await as(other,legacy,()=>call('inova_sso_allowed',[])),true);
  await q('update inova_sso.settings set require_sso=true');
  assert.equal(await as(other,legacy,()=>call('inova_sso_allowed',[])),false);
 });
 await check('lease vencido bloqueia a sessão nativa',async()=>{
  await q("update inova_sso.leases set expires_at=now()-interval '1 second'");
  assert.equal(await as(local,session,()=>call('inova_sso_allowed',[])),false);
  assert.equal((await q('select * from public.inova_sso_lease($1,$2)',[local,session])).rowCount,0);
  assert.equal(await call('inova_sso_admit',admit),true);
 });
 await check('bloqueio e troca de versão de credencial negam a sessão central',async()=>{
  await q('update private.application_users set active=false');
  assert.equal(await call('inova_sso_central_session',[subject,central]),null);
  await q('update private.application_users set active=true,credential_version=2');
  assert.equal(await call('inova_sso_central_session',[subject,central]),null);
 });
 await check('logout invalida a sessão local e preserva dados e arquivos',async()=>{
  await call('inova_sso_revoke',[subject,new Date()]);
  assert.equal(await as(local,session,()=>call('inova_sso_allowed',[])),false);
  assert.equal(await call('inova_sso_issue',grant),false);
  assert.equal(await call('inova_sso_admit',admit),false);
  assert.equal((await q('select * from public.business_fixture')).rowCount,2);
  assert.equal((await q('select * from storage.objects')).rowCount,2);
 });
 await check('pareamento exige ativação e concede acesso só pelo servidor',async()=>{
  const [candidate,sourceSession]=Array.from({length:2},randomUUID);
  const args=['j'.repeat(43),challenge,candidate,sourceSession,begin];
  assert.equal(await call('inova_sso_issue',args),false);
  await q('update inova_sso.settings set pairing_enabled=true');
  assert.equal(await call('inova_sso_issue',args),true);
  assert.equal((await q('select * from public.inova_sso_pair_intent($1,$2)',[args[0],'x'.repeat(43)])).rowCount,0);
  assert.equal((await q('select * from public.inova_sso_take($1,$2)',[args[0],challenge])).rowCount,0);
  assert.equal((await q('select * from public.inova_sso_pair_intent($1,$2)',[args[0],challenge])).rowCount,1);
  await assert.rejects(as(other,legacy,()=>call('inova_sso_pair',[args[0],challenge,candidate,begin,other,legacy])),/permission denied/i);
  await call('inova_sso_revoke',[candidate,new Date()]);
  assert.equal(await call('inova_sso_pair',[args[0],challenge,candidate,begin,other,legacy]),false);
 });
 await check('pareamento rejeita sessão alheia, conta sem empresa, MFA e prova expirada',async()=>{
  const candidate=randomUUID(),proof='k'.repeat(43);
  assert.equal(await call('inova_sso_issue',[proof,challenge,candidate,randomUUID(),begin]),true);
  const pair=(user,sessionId)=>call('inova_sso_pair',[proof,challenge,candidate,begin,user,sessionId]);
  assert.equal(await pair(other,session),false);
  assert.equal(await pair(subject,central),false);
  await q("insert into auth.mfa_factors values($1,'verified')",[other]);
  assert.equal(await pair(other,legacy),false);
  await q('delete from auth.mfa_factors where user_id=$1',[other]);
  await q("update auth.sessions set created_at=now()-interval '6 minutes' where id=$1",[legacy]);
  assert.equal(await pair(other,legacy),false);
  await q('update auth.sessions set created_at=now() where id=$1',[legacy]);
 });
 await check('vínculo comprovado preserva a empresa e não admite remapeamento',async()=>{
  const candidate=randomUUID(),portalSession=randomUUID(),proof='m'.repeat(43);
  assert.equal(await call('inova_sso_issue',[proof,challenge,candidate,portalSession,begin]),true);
  assert.equal(await call('inova_sso_pair',[proof,challenge,candidate,begin,local,session]),false);
  assert.equal(await call('inova_sso_pair',[proof,challenge,candidate,begin,other,legacy]),true);
  assert.equal(await call('inova_sso_pair',[proof,challenge,candidate,begin,other,legacy]),false);
  assert.equal((await q('select * from public.inova_sso_take($1,$2)',[proof,challenge])).rows[0].local_user,other);
  assert.equal((await q('select * from public.inova_sso_take($1,$2)',[proof,challenge])).rowCount,0);
  assert.equal((await q('select * from inova_sso.links where local_user=$1',[other])).rows[0].central_user,candidate);
  assert.equal(await call('inova_sso_admit',[other,legacy,candidate,portalSession,begin]),true);
  await as(other,legacy,async()=>{
   assert.deepEqual((await q('select id from public.business_fixture')).rows,[{id:2}]);
   assert.deepEqual((await q('select name from storage.objects')).rows,[{name:'ficticio-b.pdf'}]);
  });
 });
 await check('cadastro integrado exige rota de empresa e marcador administrativo, sem elevar cargo',async()=>{
  const employee=randomUUID(),destination=randomUUID();
  const enroll=[employee,companyB];
  const finish=[...enroll,destination];
  assert.equal((await q('select * from public.inova_sso_enrollment($1,$2)',enroll)).rowCount,0);
  await q('insert into inova_sso.company_routes values($1,$2)',[companyB,companyA]);
  assert.equal(await call('inova_sso_finish_enrollment',finish),false);
  assert.equal(await call('inova_sso_finish_enrollment',[...enroll,local]),false);
  await q("insert into auth.users values($1,$2,now(),null,$3)",[destination,'sso-'+employee+'@inova.invalid',JSON.stringify({inova_sso_employee:employee})]);
  await assert.rejects(as(other,legacy,()=>call('inova_sso_finish_enrollment',finish)),/permission denied/i);
  assert.equal(await call('inova_sso_finish_enrollment',finish),true);
  assert.equal(await call('inova_sso_finish_enrollment',finish),true);
  assert.deepEqual((await q('select company_id,role from public.company_members where user_id=$1',[destination])).rows,[{company_id:companyA,role:'member'}]);
  assert.equal((await q('select local_user from inova_sso.links where central_user=$1',[employee])).rows[0].local_user,destination);
  assert.equal((await q('select role from public.company_members where user_id=$1',[local])).rows[0].role,'admin');
 });
 await check('a prova administrativa exige sessão central vigente e administrador',async()=>{
  await q("update private.application_users set credential_version=1,active=true where user_id=$1",[subject]);
  assert.equal(await call('inova_sso_admin_session',[subject,central]),true);
  assert.equal(await call('inova_sso_admin_session',[subject,legacy]),false);
  await q("update private.application_users set is_admin=false where user_id=$1",[subject]);
  assert.equal(await call('inova_sso_admin_session',[subject,central]),false);
 });
 console.log(passed+' verificações SQL passaram no PostgreSQL isolado.');
}finally{
 if(client)await client.end();
 if(started)await db.stop();
}
