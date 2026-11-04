import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.112.3';
import {requestSerproCertificate,safeConnectorError} from './serpro.js';
import {cleanupConfirmedOrphan} from './cleanup.js';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers});if(request.method!=='POST')return reply({error:'Método não permitido.'},405);
 const authorization=request.headers.get('authorization'),url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!authorization?.startsWith('Bearer '))return reply({error:'Autenticação necessária.'},401);
 if(!url||!anon||!secret)return reply({error:'Configuração do servidor pendente.'},503);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});let work:any=null,uploadedPath:string|null=null;
 try{
  const raw=await request.text();if(raw.length>3000)return reply({error:'Solicitação acima do limite.'},413);let body;try{body=JSON.parse(raw);}catch{return reply({error:'JSON inválido.'},400);}
  // O CNPJ nunca é aceito na solicitação; pertence exclusivamente ao cadastro no banco.
  if(Object.keys(body).some(k=>!['task_id','company_id','worker'].includes(k)))return reply({error:'Parâmetro não permitido.'},400);
  const worker=authorization==='Bearer '+secret;
  if(!worker){
   if(!uuid.test(body.task_id)||!uuid.test(body.company_id)||body.worker)return reply({error:'Empresa/tarefa obrigatórias.'},400);
   const db=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   const {data:user,error:authError}=await db.auth.getUser();if(authError||!user.user)return reply({error:'Sessão inválida.'},401);
   const {data:allowed,error:permissionError}=await db.rpc('central_can',{p_company_id:body.company_id,p_action:'write'});
   if(permissionError||!allowed)return reply({error:'Sem permissão nesta empresa.'},403);
   const {data:task,error:taskError}=await db.from('central_connector_tasks').select('id,company_id').eq('id',body.task_id).eq('company_id',body.company_id).maybeSingle();
   if(taskError||!task)return reply({error:'Tarefa indisponível nesta empresa.'},404);
  }
  const claimed=await admin.rpc('central_claim_connector',{p_task_id:worker?null:body.task_id});if(claimed.error)throw Error('CLAIM_FAILED');work=claimed.data;
  if(!work)return reply({message:'Nenhuma tarefa disponível. Consulte o histórico.'});
  const {task,profile,integration}=work;
  if(!work.profile_current){await admin.rpc('central_finish_connector',{p_task_id:task.id,p_lease_token:task.lease_token,p_outcome:'profile_changed',p_reason:'O cadastro mudou desde a solicitação.'});return reply({outcome:'profile_changed'});}
  if(!work.authorized||!integration.enabled||task.source_id!=='rfb'||task.transport!=='serpro'||!integration.api_enabled||!integration.billable_authorized_at||(task.origin==='daily'&&(!integration.daily_api_authorized||!integration.verified_at)))throw Error('SERPRO_AUTHORIZATION_REQUIRED');
  const reference=Deno.env.get('SERPRO_CND_AUTHORIZATION_REFERENCE');
  if(!reference||reference!==integration.authorization_reference)throw Error('SERPRO_CONFIGURATION_REQUIRED');
  const config={companyId:Deno.env.get('SERPRO_CND_COMPANY_ID'),consumerKey:Deno.env.get('SERPRO_CND_CONSUMER_KEY'),consumerSecret:Deno.env.get('SERPRO_CND_CONSUMER_SECRET'),endpoint:Deno.env.get('SERPRO_CND_ENDPOINT'),authorizationReference:reference,allowBillableIssuance:Deno.env.get('SERPRO_CND_ALLOW_BILLABLE_ISSUANCE')==='true'};
  const result=await requestSerproCertificate({config,companyId:task.company_id,profile,authorizeBillableIssuance:true});
  let artifact=null;
  if(result.bytes){
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',result.bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
   const {data:previous}=await admin.from('qualification_documents').select('document_series_id').eq('company_id',task.company_id).eq('central_type_id','rfb-pgfn').order('created_at',{ascending:false}).limit(1);
   const seriesId=previous?.[0]?.document_series_id||crypto.randomUUID();
   const path=task.company_id+'/'+seriesId+'/official-'+hash+'.pdf';
   const {error:uploadError}=await admin.storage.from('qualification-files').upload(path,result.bytes,{contentType:'application/pdf',upsert:false});
   if(uploadError){const {data:existing}=await admin.from('central_connector_artifacts').select('id').eq('company_id',task.company_id).eq('storage_path',path).limit(1);if(!existing?.length)throw Error('PDF_STORAGE_FAILED');}else uploadedPath=path;
   artifact={...result.certificate,series_id:seriesId,control_code:result.certificate.control,sha256:hash,storage_path:path,file_size:result.bytes.length};
  }
  const finished=await admin.rpc('central_finish_connector',{p_task_id:task.id,p_lease_token:task.lease_token,p_outcome:result.outcome,p_reason:artifact?'PDF oficial recebido. Conferência humana obrigatória antes de criar uma versão.':result.reason,p_artifact:artifact});
  if(finished.error)throw Error('FINISH_FAILED');
  return reply({outcome:result.outcome,artifact_id:finished.data,notice:artifact?'PDF recebido como candidato; ainda não é renovação confirmada.':'Nenhuma renovação registrada.'});
 }catch(error){
  if(work){const code=(error as Error)?.message,reason=safeConnectorError(error);const outcome=code==='SERPRO_CONFIGURATION_REQUIRED'?'configuration_required':code==='SERPRO_NETWORK_UNCERTAIN'?'uncertain':code==='SERPRO_RATE_LIMIT'?'retry':'failed';await admin.rpc('central_finish_connector',{p_task_id:work.task.id,p_lease_token:work.task.lease_token,p_outcome:outcome,p_reason:reason});}
  return reply({error:safeConnectorError(error)},work?422:500);
 }finally{
  if(uploadedPath)await cleanupConfirmedOrphan(admin,uploadedPath);
 }
});
