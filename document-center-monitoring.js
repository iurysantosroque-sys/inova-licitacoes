// Configuração, execução interna e operação oficial são eixos independentes.
const time=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?Date.parse(value):0;
const latest=(rows,field)=>[...rows].sort((a,b)=>time(b[field])-time(a[field]))[0]||null;
export function internalExecution(data,sourceId){
 const server=data.monitoringHealth?.last_internal_runs?.find(r=>r.source_id===sourceId&&r.task_id&&r.attempt_id&&time(r.finished_at));
 if(server)return server;
 const completed=(data.connectorTasks||[]).filter(t=>t.source_id===sourceId&&t.origin==='daily'&&t.state==='finished'&&time(t.updated_at)).flatMap(t=>{
  const a=latest((data.connectorAttempts||[]).filter(a=>a.task_id===t.id&&a.source_id===t.source_id&&(!a.company_id||!t.company_id||a.company_id===t.company_id)&&time(a.created_at)),'created_at');
  return a?[{source_id:sourceId,task_id:t.id,attempt_id:a.id,outcome:a.outcome,finished_at:t.updated_at}]:[];
 });return latest(completed,'finished_at');
}
export function connectorStatus(data,source){
 const cfg=(data.integrations||[]).find(i=>i.source_id===source.id)||{},monitorActive=cfg.daily_checks===true;
 const attempt=latest((data.connectorAttempts||[]).filter(a=>a.source_id===source.id),'created_at');
 const task=latest((data.connectorTasks||[]).filter(t=>t.source_id===source.id&&['queued','running'].includes(t.state)),'created_at');
 const contract=!!String(cfg.authorization_reference||'').trim();
 const authorized=cfg.enabled===true&&cfg.api_enabled===true&&!!cfg.billable_authorized_by&&!!cfg.billable_authorized_at;
 let serpro={key:'not_applicable',label:'Não se aplica a este órgão'};
 if(source.id==='rfb'){
  if(!contract)serpro={key:'not_contracted',label:'Não contratada/configurada'};
  else if(!authorized)serpro={key:'inactive',label:'Desativada — contrato informado'};
  else if(data.monitoringHealth?.serpro?.homologated===true)serpro={key:'active',label:'Ativa — homologação comprovada'};
  else serpro={key:'pending',label:'Pendente de homologação'};
 }
 const automatic=source.id==='rfb'&&authorized&&serpro.key==='active'&&monitorActive&&cfg.daily_api_authorized===true&&data.monitoringHealth?.automatic_transport_ready===true;
 return {cfg,attempt,task,monitor:{key:monitorActive?'active':'inactive',label:monitorActive?'Ativo':'Inativo'},serpro,
  issuance:automatic?{key:'automatic',label:'Automática autorizada'}:source.url?{key:'assisted',label:'Assistida no portal oficial'}:{key:'manual',label:'Manual'},
  internalRun:internalExecution(data,source.id),nextCheck:monitorActive&&time(cfg.next_check_at)?cfg.next_check_at:null,
  operation:task?.state||attempt?.outcome||null};
}
export function schedulerStatus(health){
 if(!health?.available)return {key:'unknown',label:'Estado do servidor indisponível',run:null};
 const job=health.jobs?.dispatcher;
 if(!job?.enabled)return {key:'inactive',label:'Agendador interno inativo',run:job||null};
 if(!job.last_status)return {key:'pending',label:'Agendador ativo — aguardando execução registrada',run:job};
 if(['starting','running','connecting','sending'].includes(job.last_status))return {key:'running',label:'Agendador em execução',run:job};
 if(job.last_status!=='succeeded')return {key:'failed',label:'Última execução do agendador não concluída',run:job};
 if(!time(job.last_finished_at))return {key:'pending',label:'Aguardando registro de conclusão do agendador',run:job};
 const stale=time(health.checked_at)-time(job.last_finished_at)>5*60*1000;
 return {key:stale?'stale':'success',label:stale?'Última execução do agendador está atrasada':'Execução do agendador confirmada',run:job};
}
export function shouldRefreshMonitoring({active,visible,dirty,busy,demo,openSettings}){return active&&visible&&!dirty&&!busy&&!demo&&!openSettings;}
