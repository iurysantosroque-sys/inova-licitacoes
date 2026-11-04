import test from 'node:test';
import assert from 'node:assert/strict';
import {connectorStatus,internalExecution,schedulerStatus,shouldRefreshMonitoring} from '../document-center-monitoring.js';
import {connectorPanel} from '../document-center-official-ui.js';
import {createDocumentService} from '../document-center-service.js';
const source={id:'rfb',url:'https://www.gov.br/'};
const base=()=>({profile:{confirmed_at:'2026-11-04T18:00:00Z'},integrations:[],connectorTasks:[],connectorAttempts:[],validations:[],artifacts:[]});
const cfg={source_id:'rfb',daily_checks:true,enabled:true,api_enabled:false,status:'configuration_required',next_check_at:'2026-11-05T18:00:00Z'};
const company='b7000000-0000-4000-8000-000000000001';
test('monitor gratuito ativo independe de contrato, enabled oficial e status legado',()=>{
 for(const enabled of [true,false]){const d={...base(),integrations:[{...cfg,enabled}]},s=connectorStatus(d,source);assert.equal(s.monitor.key,'active');assert.equal(s.serpro.key,'not_contracted');assert.equal(s.issuance.key,'assisted');assert.equal(s.internalRun,null);}
});
test('data futura e tarefa concluída sem resultado não são prova de execução',()=>{
 const d={...base(),integrations:[cfg],connectorTasks:[{id:'task',source_id:'rfb',origin:'daily',state:'finished',updated_at:'2026-11-04T18:00:00Z'}]};
 assert.equal(internalExecution(d,'rfb'),null);d.connectorAttempts=[{id:'attempt',task_id:'outra',source_id:'rfb',created_at:'2026-11-04T18:00:00Z'}];assert.equal(internalExecution(d,'rfb'),null);
});
test('resultado de tarefa diária comprova somente monitor interno; manual não comprova rotina diária',()=>{
 const d={...base(),integrations:[cfg],connectorTasks:[{id:'task',source_id:'rfb',origin:'daily',state:'finished',updated_at:'2026-11-04T18:00:00Z'}],connectorAttempts:[{id:'attempt',task_id:'task',source_id:'rfb',outcome:'intervention_required',created_at:'2026-11-04T18:00:00Z'}]};
 assert.equal(internalExecution(d,'rfb').attempt_id,'attempt');assert.equal(connectorStatus(d,source).serpro.key,'not_contracted');assert.equal(d.integrations[0].last_official_at,undefined);
 d.connectorTasks[0].origin='user';assert.equal(internalExecution(d,'rfb'),null);
});
test('monitor inativo ignora próxima data residual; ausência de data não inventa programação',()=>{
 assert.equal(connectorStatus({...base(),integrations:[{...cfg,daily_checks:false}]},source).nextCheck,null);
 assert.equal(connectorStatus({...base(),integrations:[{...cfg,next_check_at:null}]},source).nextCheck,null);
});
test('fila não substitui os eixos e pendência de intervenção não vira falha Serpro',()=>{
 const d={...base(),integrations:[cfg],connectorTasks:[{id:'q',source_id:'rfb',state:'queued',created_at:'2026-11-04T18:00:00Z'}]};
 const s=connectorStatus(d,source);assert.equal(s.operation,'queued');assert.equal(s.monitor.key,'active');assert.equal(s.serpro.key,'not_contracted');
});
test('homologação exige evidência no servidor; emissão automática exige autorização e transporte pronto',()=>{
 const c={...cfg,api_enabled:true,authorization_reference:'Contrato apenas de teste',billable_authorized_by:'admin',billable_authorized_at:'2026-11-04T18:00:00Z',verified_at:'2026-11-04T18:00:00Z',daily_api_authorized:true};
 const d={...base(),integrations:[c]};assert.equal(connectorStatus(d,source).serpro.key,'pending');
 d.monitoringHealth={serpro:{homologated:true},automatic_transport_ready:false};assert.equal(connectorStatus(d,source).serpro.key,'active');assert.equal(connectorStatus(d,source).issuance.key,'assisted');
 d.monitoringHealth.automatic_transport_ready=true;assert.equal(connectorStatus(d,source).issuance.key,'automatic');
 c.daily_api_authorized=false;assert.equal(connectorStatus(d,source).issuance.key,'assisted');c.api_enabled=false;assert.equal(connectorStatus(d,source).serpro.key,'inactive');
});
test('FGTS e CNDT permanecem assistidos; falha recente não apaga comprovação histórica',()=>{
 for(const id of ['fgts','cndt'])assert.equal(connectorStatus({...base(),integrations:[{...cfg,source_id:id}]},{id,url:'https://example.invalid/'}).issuance.key,'assisted');
 const d={...base(),integrations:[cfg],monitoringHealth:{available:true,checked_at:'2026-11-04T18:01:00Z',jobs:{dispatcher:{enabled:true,last_status:'failed',last_finished_at:'2026-11-04T18:00:00Z'}}}};
 assert.equal(connectorStatus(d,source).monitor.key,'active');assert.equal(schedulerStatus(d.monitoringHealth).key,'failed');
 assert.equal(schedulerStatus({available:true,jobs:{dispatcher:{enabled:true}}}).key,'pending');
 assert.equal(schedulerStatus({available:true,jobs:{dispatcher:{enabled:true,last_status:'running'}}}).key,'running');
});
test('painel separa três eixos e formulário gratuito de autorização paga',()=>{
 const html=connectorPanel({...base(),integrations:[cfg]},{demo:false,canWrite:true,canReview:true,isAdmin:true});
 assert.match(html,/Monitoramento interno<\/dt><dd><span[^>]+>Ativo/);assert.match(html,/Não contratada\/configurada/);assert.match(html,/Assistida no portal oficial/);
 const free=html.split('data-dc-form="monitoring"')[1].split('</form>')[0];assert.doesNotMatch(free,/billable_confirmed|api_enabled|authorization_reference/);assert.match(free,/daily_checks" checked/);
});
test('atualização automática respeita rascunho, visibilidade, sessão de demonstração e configuração aberta',()=>{
 const input={active:true,visible:true,dirty:false,busy:false,demo:false,openSettings:false};assert.equal(shouldRefreshMonitoring(input),true);
 for(const patch of [{active:false},{visible:false},{dirty:true},{busy:true},{demo:true},{openSettings:true}])assert.equal(shouldRefreshMonitoring({...input,...patch}),false);
});
test('salvar e recarregar preserva checkbox e atualiza evidência sem chamar função paga',async()=>{
 let stored={...cfg,daily_checks:false},paidCalls=0;
 const db={from(table){return {select(){return this;},eq(){return this;},order(){return this;},async range(){return {data:table==='central_integrations'?[structuredClone(stored)]:[],error:null};}};},
  async rpc(name,args){if(name==='central_configure_monitoring'){assert.deepEqual(Object.keys(args).sort(),['p_company_id','p_daily_checks','p_source_id']);stored={...stored,daily_checks:args.p_daily_checks};return {data:null,error:null};}assert.equal(name,'central_monitoring_health');return {data:{available:true,last_internal_runs:[{source_id:'rfb',task_id:'task',attempt_id:'attempt',finished_at:'2026-11-04T18:00:00Z',outcome:'intervention_required'}]},error:null};},functions:{invoke(){paidCalls++;}}};
 let service=createDocumentService(db,()=>({demo:false,company:{id:company},user:{id:'qa'}}));await service.rpc('central_configure_monitoring',{p_source_id:'rfb',p_daily_checks:true});
 service=createDocumentService(db,()=>({demo:false,company:{id:company},user:{id:'qa'}}));const data=await service.loadMonitoring();
 assert.equal(connectorStatus(data,source).monitor.key,'active');assert.equal(internalExecution(data,'rfb').task_id,'task');assert.equal(data.integrations[0].api_enabled,false);assert.equal(paidCalls,0);
});
